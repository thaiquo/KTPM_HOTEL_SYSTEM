package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.config.VNPayConfig;
import iuh.fit.hotelsystem_payment.client.BookingServiceClient;
import iuh.fit.hotelsystem_payment.dto.CreateVNPayRequest;
import iuh.fit.hotelsystem_payment.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_payment.dto.VNPayResponse;
import iuh.fit.hotelsystem_payment.entity.InvoiceCategory;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.repository.OutboxEventRepository;
import iuh.fit.hotelsystem_payment.entity.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class VNPayService {

    private static final Logger log = LoggerFactory.getLogger(VNPayService.class);

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VNP_TIMEZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;
    private final VNPayConfig vnPayConfig;
    private final BookingServiceClient bookingServiceClient;
    private final RestTemplate restTemplate;
    private final OutboxEventRepository outboxEventRepository;
    private final TransactionTemplate transactionTemplate;

    public VNPayService(PaymentRepository paymentRepository,
                        RabbitTemplate rabbitTemplate,
                        VNPayConfig vnPayConfig,
                        BookingServiceClient bookingServiceClient,
                        RestTemplateBuilder restTemplateBuilder,
                        OutboxEventRepository outboxEventRepository,
                        TransactionTemplate transactionTemplate) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.vnPayConfig = vnPayConfig;
        this.bookingServiceClient = bookingServiceClient;
        this.restTemplate = restTemplateBuilder.build();
        this.outboxEventRepository = outboxEventRepository;
        this.transactionTemplate = transactionTemplate;
    }

    public VNPayRefundResult refund(String transactionRef,
                                    String transactionDate,
                                    Double amount,
                                    String createdBy,
                                    String ipAddress,
                                    String orderInfo,
                                    String transactionType,
                                    String transactionNo) {
        if (transactionRef == null || transactionRef.isBlank()) {
            throw new IllegalArgumentException("transactionRef is required");
        }
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }

        String requestId = LocalDateTime.now(VNP_TIMEZONE).format(DateTimeFormatter.ofPattern("HHmmss"));
        String createDate = LocalDateTime.now(VNP_TIMEZONE).format(VNP_DATE_FORMAT);
        String vnpVersion = "2.1.0";
        String vnpCommand = "refund";
        String txnType = (transactionType == null || transactionType.isBlank()) ? "02" : transactionType;
        String txnNo = (transactionNo == null || transactionNo.isBlank()) ? "0" : transactionNo;
        String txnDate = (transactionDate == null || transactionDate.isBlank()) ? createDate : transactionDate;
        String created = (createdBy == null || createdBy.isBlank()) ? "SYSTEM" : createdBy;
        String info = (orderInfo == null || orderInfo.isBlank()) ? ("Refund for " + transactionRef) : orderInfo;

        String data = requestId + "|" + vnpVersion + "|" + vnpCommand + "|" + vnPayConfig.getTmnCode()
                + "|" + txnType + "|" + transactionRef + "|" + toVnpAmount(amount) + "|" + txnNo
                + "|" + txnDate + "|" + created + "|" + createDate + "|" + normalizeIp(ipAddress)
                + "|" + info;
        String secureHash = hmacSHA512(vnPayConfig.getHashSecret(), data);

        Map<String, String> payload = new HashMap<>();
        payload.put("vnp_RequestId", requestId);
        payload.put("vnp_Version", vnpVersion);
        payload.put("vnp_Command", vnpCommand);
        payload.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        payload.put("vnp_TransactionType", txnType);
        payload.put("vnp_TxnRef", transactionRef);
        payload.put("vnp_Amount", toVnpAmount(amount));
        payload.put("vnp_TransactionNo", txnNo);
        payload.put("vnp_TransactionDate", txnDate);
        payload.put("vnp_CreateBy", created);
        payload.put("vnp_OrderInfo", info);
        payload.put("vnp_CreateDate", createDate);
        payload.put("vnp_IpAddr", normalizeIp(ipAddress));
        payload.put("vnp_SecureHash", secureHash);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(vnPayConfig.getApiUrl(), entity, Map.class);
        Map<String, Object> body = response.getBody() != null ? response.getBody() : new HashMap<>();
        String responseCode = String.valueOf(body.getOrDefault("vnp_ResponseCode", "99"));
        String message = String.valueOf(body.getOrDefault("vnp_Message", "Unknown"));
        String refundTxnNo = body.get("vnp_TransactionNo") != null
                ? String.valueOf(body.get("vnp_TransactionNo"))
                : null;
        return new VNPayRefundResult("00".equals(responseCode), responseCode, message, refundTxnNo);
    }

    public record VNPayRefundResult(boolean success, String responseCode, String message, String transactionNo) {
    }

    public VNPayResponse createPayment(CreateVNPayRequest request, String ipAddress) {
        return createPayment(request, ipAddress, null);
    }

    public VNPayResponse createPayment(CreateVNPayRequest request, String ipAddress, String idempotencyKey) {
        if (request.getBookingId() == null || request.getUserId() == null || request.getTotalAmount() == null) {
            throw new IllegalArgumentException("bookingId, userId, totalAmount are required");
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            if (existing != null) {
                return buildResponseFromExisting(existing, request, ipAddress);
            }
        }

        PaymentType paymentType = parsePaymentType(request.getPaymentType());
        if (paymentType == PaymentType.REMAINING) {
            throw new IllegalArgumentException("Use /payments/vnpay/create-remaining for remaining payment");
        }
        ensurePaymentNotCompleted(request.getBookingId(), paymentType);

        Double authoritativeTotalAmount = resolveBookingTotalAmount(request.getBookingId(), request.getTotalAmount());

        return createAndBuildUrl(request.getBookingId(), request.getUserId(), authoritativeTotalAmount, paymentType, request, ipAddress, idempotencyKey);
    }

    public VNPayResponse createRemainingPayment(CreateVNPayRequest request, String ipAddress) {
        return createRemainingPayment(request, ipAddress, null);
    }

    public VNPayResponse createRemainingPayment(CreateVNPayRequest request, String ipAddress, String idempotencyKey) {
        if (request.getBookingId() == null || request.getUserId() == null) {
            throw new IllegalArgumentException("bookingId, userId are required");
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            if (existing != null) {
                return buildResponseFromExisting(existing, request, ipAddress);
            }
        }

        Payment successfulDeposit = paymentRepository
                .findTopByBookingIdAndPaymentTypeAndStatusOrderByCreatedAtDesc(
                        request.getBookingId(),
                        PaymentType.DEPOSIT,
                        PaymentStatus.SUCCESS
                )
                .orElseThrow(() -> new IllegalStateException("Deposit payment must be successful before remaining payment"));

        if (paymentRepository.existsByBookingIdAndPaymentTypeAndStatus(
                request.getBookingId(),
                PaymentType.REMAINING,
                PaymentStatus.SUCCESS)) {
            throw new IllegalStateException("Remaining payment already completed for this booking");
        }

        Double totalAmount = request.getTotalAmount() != null
                ? request.getTotalAmount()
                : successfulDeposit.getTotalAmount();

        totalAmount = resolveBookingTotalAmount(request.getBookingId(), totalAmount);

        return createAndBuildUrl(request.getBookingId(), request.getUserId(), totalAmount, PaymentType.REMAINING, request, ipAddress, idempotencyKey);
    }

    private Double resolveBookingTotalAmount(Long bookingId, Double requestedTotalAmount) {
        if (bookingId == null) {
            throw new IllegalArgumentException("bookingId is required");
        }

        Double bookingTotalAmount = null;
        try {
            Map<String, Object> booking = bookingServiceClient.getBooking(bookingId);
            bookingTotalAmount = extractMoney(booking, "totalPrice");
            if (bookingTotalAmount == null) {
                bookingTotalAmount = extractMoney(booking, "finalTotal");
            }
        } catch (Exception ex) {
            log.warn("Could not fetch booking total from booking-service. bookingId={}, error={}", bookingId, ex.getMessage());
        }

        if (bookingTotalAmount != null && bookingTotalAmount > 0) {
            if (requestedTotalAmount != null && Math.abs(requestedTotalAmount - bookingTotalAmount) > 1.0) {
                log.warn("Payment amount mismatch detected. bookingId={}, requested={}, booking={}. Use booking amount.",
                        bookingId, requestedTotalAmount, bookingTotalAmount);
            }
            return roundVnd(bookingTotalAmount);
        }

        if (requestedTotalAmount != null && requestedTotalAmount > 0) {
            return roundVnd(requestedTotalAmount);
        }

        throw new IllegalArgumentException("Cannot resolve totalAmount for booking " + bookingId);
    }

    private Double extractMoney(Map<String, Object> payload, String key) {
        if (payload == null || key == null) {
            return null;
        }
        Object raw = payload.get(key);
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(raw));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void ensurePaymentNotCompleted(Long bookingId, PaymentType paymentType) {
        if (paymentRepository.existsByBookingIdAndPaymentTypeAndStatus(bookingId, paymentType, PaymentStatus.SUCCESS)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    paymentType + " payment already completed for this booking");
        }
    }

    public Map<String, String> handleReturn(Map<String, String> inputParams) {
        return transactionTemplate.execute(status -> processCallback(inputParams, false));
    }

    public Map<String, String> handleIpn(Map<String, String> inputParams) {
        return transactionTemplate.execute(status -> processCallback(inputParams, true));
    }

    private Map<String, String> processCallback(Map<String, String> inputParams, boolean ipnMode) {
        Map<String, String> response = new HashMap<>();

        String secureHash = inputParams.get("vnp_SecureHash");
        if (secureHash == null || secureHash.isBlank()) {
            return buildErrorResponse(ipnMode, "97", "Invalid Checksum");
        }

        Map<String, String> verifyParams = new HashMap<>(inputParams);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");

        String signedData = buildQueryData(verifyParams);
        String calculatedHash = hmacSHA512(vnPayConfig.getHashSecret(), signedData);

        if (!calculatedHash.equalsIgnoreCase(secureHash)) {
            return buildErrorResponse(ipnMode, "97", "Invalid Checksum");
        }

        String txnRef = inputParams.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return buildErrorResponse(ipnMode, "01", "Order not Found");
        }

        Payment payment = paymentRepository.findByTransactionIdForUpdate(txnRef).orElse(null);
        if (payment == null) {
            return buildErrorResponse(ipnMode, "01", "Order not Found");
        }

        String vnpAmount = inputParams.get("vnp_Amount");
        if (vnpAmount != null && !vnpAmount.isBlank()) {
            String expectedAmount = toVnpAmount(payment.getPaidAmount());
            if (!expectedAmount.equals(vnpAmount)) {
                return buildErrorResponse(ipnMode, "04", "Invalid Amount");
            }
        }

        // Ignore duplicate callback once payment is finalized.
        if (payment.getStatus() != PaymentStatus.PENDING) {
            String finalizedCode = payment.getStatus() == PaymentStatus.SUCCESS
                    ? "00"
                    : (payment.getVnpResponseCode() != null ? payment.getVnpResponseCode() : "99");
            if (ipnMode) {
                response.put("RspCode", "02");
                response.put("Message", "Order already confirmed");
            } else {
                response.put("code", finalizedCode);
                response.put("message", "Payment already processed");
            }
            appendPaymentContext(response, payment);
            return response;
        }

        String responseCode = inputParams.getOrDefault("vnp_ResponseCode", "99");
        payment.setVnpResponseCode(responseCode);
        payment.setVnpTransactionNo(inputParams.get("vnp_TransactionNo"));

        PaymentResultMessage result = new PaymentResultMessage();
        result.setBookingId(payment.getBookingId());
        result.setUserId(payment.getUserId());
        result.setPaidAmount(payment.getPaidAmount());
        result.setTotalAmount(payment.getTotalAmount());
        result.setTransactionId(payment.getTransactionId());

        if ("00".equals(responseCode)) {
            payment.setStatus(PaymentStatus.SUCCESS);

            if (payment.getPaymentType() == PaymentType.FULL) {
                result.setStatus("FULL_PAID");
            } else if (payment.getPaymentType() == PaymentType.DEPOSIT) {
                result.setStatus("DEPOSIT_PAID");
            } else {
                result.setStatus("REMAINING_PAID");
            }

            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                OutboxEvent out = new OutboxEvent();
                out.setAggregateType("Payment");
                out.setAggregateId(payment.getTransactionId());
                out.setType(RabbitConfig.PAYMENT_RESULT_ROUTING_KEY);
                out.setPayload(om.writeValueAsString(result));
                try {
                    String correlation = org.slf4j.MDC.get("X-Correlation-Id");
                    if (correlation != null && !correlation.isBlank()) {
                        java.util.Map<String, Object> headers = new java.util.HashMap<>();
                        headers.put("X-Correlation-Id", correlation);
                        out.setHeaders(headers);
                    }
                } catch (Exception ignored) {}
                outboxEventRepository.save(out);
            } catch (Exception ex) {
                log.warn("Failed to enqueue payment result outbox: {}", ex.getMessage());
            }
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            result.setStatus("FAILED");

            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                OutboxEvent out = new OutboxEvent();
                out.setAggregateType("Payment");
                out.setAggregateId(payment.getTransactionId());
                out.setType(RabbitConfig.PAYMENT_RESULT_ROUTING_KEY);
                out.setPayload(om.writeValueAsString(result));
                try {
                    String correlation = org.slf4j.MDC.get("X-Correlation-Id");
                    if (correlation != null && !correlation.isBlank()) {
                        java.util.Map<String, Object> headers = new java.util.HashMap<>();
                        headers.put("X-Correlation-Id", correlation);
                        out.setHeaders(headers);
                    }
                } catch (Exception ignored) {}
                outboxEventRepository.save(out);
            } catch (Exception ex) {
                log.warn("Failed to enqueue payment result outbox: {}", ex.getMessage());
            }
        }

        paymentRepository.save(payment);

        if (ipnMode) {
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
        } else {
            response.put("code", responseCode);
            response.put("message", "Confirm Success");
        }
        appendPaymentContext(response, payment);
        return response;
    }

    private Map<String, String> buildErrorResponse(boolean ipnMode, String code, String message) {
        Map<String, String> response = new HashMap<>();
        if (ipnMode) {
            response.put("RspCode", code);
            response.put("Message", message);
        } else {
            response.put("code", code);
            response.put("message", message);
        }
        return response;
    }

    private void appendPaymentContext(Map<String, String> response, Payment payment) {
        response.put("bookingId", String.valueOf(payment.getBookingId()));
        response.put("paymentType", payment.getPaymentType().name());
        response.put("paymentStatus", payment.getStatus().name());
    }

    private VNPayResponse createAndBuildUrl(Long bookingId,
                                            Long userId,
                                            Double totalAmount,
                                            PaymentType paymentType,
                                            CreateVNPayRequest request,
                                            String ipAddress,
                                            String idempotencyKey) {
        Double paidAmount = calculatePaidAmount(totalAmount, paymentType);

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(userId);
        payment.setTotalAmount(totalAmount);
        payment.setPaidAmount(paidAmount);
        payment.setAmount(paidAmount);
        payment.setPaymentType(paymentType);
        payment.setInvoiceCategory(InvoiceCategory.CHECKIN);
        payment.setMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        payment.setTransactionId(generateTransactionId(bookingId));
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            payment.setIdempotencyKey(idempotencyKey);
        }

        payment = paymentRepository.save(payment);

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", toVnpAmount(paidAmount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", payment.getTransactionId());
        vnpParams.put("vnp_OrderInfo", "Thanh toan booking " + bookingId);
        vnpParams.put("vnp_OrderType", "other");

        String locale = request.getLocale();
        if (locale == null || locale.isBlank()) {
            locale = "vn";
        }
        locale = "en".equalsIgnoreCase(locale) ? "en" : "vn";
        vnpParams.put("vnp_Locale", locale);

        String bankCode = request.getBankCode();
        if (bankCode != null && !bankCode.isBlank()) {
            vnpParams.put("vnp_BankCode", bankCode.trim());
        }

        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", normalizeIp(ipAddress));
        LocalDateTime now = LocalDateTime.now(VNP_TIMEZONE);
        vnpParams.put("vnp_CreateDate", now.format(VNP_DATE_FORMAT));
        // expireMinutes = 10 (configurable via vnpay.expireMinutes)
        // Giữ đồng bộ với booking.hold-minutes (= expireMinutes + 1) trong BOOKING service
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(vnPayConfig.getExpireMinutes()).format(VNP_DATE_FORMAT));

        String hashData = buildQueryData(vnpParams);
        String secureHash = hmacSHA512(vnPayConfig.getHashSecret(), hashData);

        String query = buildQueryData(vnpParams);
        String paymentUrl = vnPayConfig.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;

        return new VNPayResponse(paymentUrl);
    }

    private VNPayResponse buildResponseFromExisting(Payment payment, CreateVNPayRequest request, String ipAddress) {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", toVnpAmount(payment.getAmount()));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", payment.getTransactionId());
        vnpParams.put("vnp_OrderInfo", "Thanh toan booking " + payment.getBookingId());
        vnpParams.put("vnp_OrderType", "other");

        String locale = request.getLocale();
        if (locale == null || locale.isBlank()) {
            locale = "vn";
        }
        locale = "en".equalsIgnoreCase(locale) ? "en" : "vn";
        vnpParams.put("vnp_Locale", locale);

        if (request.getBankCode() != null && !request.getBankCode().isBlank()) {
            vnpParams.put("vnp_BankCode", request.getBankCode().trim());
        }

        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", normalizeIp(ipAddress));
        LocalDateTime now = LocalDateTime.now(VNP_TIMEZONE);
        vnpParams.put("vnp_CreateDate", now.format(VNP_DATE_FORMAT));
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(vnPayConfig.getExpireMinutes()).format(VNP_DATE_FORMAT));

        String hashData = buildQueryData(vnpParams);
        String secureHash = hmacSHA512(vnPayConfig.getHashSecret(), hashData);
        String query = buildQueryData(vnpParams);
        return new VNPayResponse(vnPayConfig.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash);
    }

    private PaymentType parsePaymentType(String paymentType) {
        try {
            return PaymentType.valueOf(paymentType.toUpperCase());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid payment type");
        }
    }

    private Double calculatePaidAmount(Double totalAmount, PaymentType paymentType) {
        if (paymentType == PaymentType.DEPOSIT || paymentType == PaymentType.REMAINING) {
            return roundVnd(totalAmount * 0.5);
        }
        if (paymentType == PaymentType.FULL) {
            return roundVnd(totalAmount);
        }
        throw new IllegalArgumentException("Invalid payment type");
    }

    private String generateTransactionId(Long bookingId) {
        return bookingId + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String toVnpAmount(Double amount) {
        BigDecimal value = BigDecimal.valueOf(amount).setScale(0, RoundingMode.HALF_UP);
        return value.multiply(BigDecimal.valueOf(100)).toPlainString();
    }

    private Double roundVnd(Double amount) {
        return BigDecimal.valueOf(amount).setScale(0, RoundingMode.HALF_UP).doubleValue();
    }

    private String normalizeIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return "127.0.0.1";
        }
        if ("0:0:0:0:0:0:0:1".equals(ipAddress) || "::1".equals(ipAddress)) {
            return "127.0.0.1";
        }
        return ipAddress;
    }

    private String buildQueryData(Map<String, String> params) {
        Map<String, String> sorted = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) {
                continue;
            }

            String encodedKey = encodeVnpValue(entry.getKey());
            String encodedValue = encodeVnpValue(entry.getValue());
            sorted.put(encodedKey, encodedValue);
        }

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(entry.getKey()).append('=').append(entry.getValue());
        }
        return sb.toString();
    }

    private String encodeVnpValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("%20", "+");
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKeySpec);
            byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hash = new StringBuilder(2 * bytes.length);
            for (byte b : bytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hash.append('0');
                }
                hash.append(hex);
            }
            return hash.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Cannot sign VNPAY payload", ex);
        }
    }
}
