package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.config.VNPayConfig;
import iuh.fit.hotelsystem_payment.dto.CreateVNPayRequest;
import iuh.fit.hotelsystem_payment.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_payment.dto.VNPayResponse;
import iuh.fit.hotelsystem_payment.entity.InvoiceCategory;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

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

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VNP_TIMEZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;
    private final VNPayConfig vnPayConfig;

    public VNPayService(PaymentRepository paymentRepository,
                        RabbitTemplate rabbitTemplate,
                        VNPayConfig vnPayConfig) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.vnPayConfig = vnPayConfig;
    }

    public VNPayResponse createPayment(CreateVNPayRequest request, String ipAddress) {
        if (request.getBookingId() == null || request.getUserId() == null || request.getTotalAmount() == null) {
            throw new IllegalArgumentException("bookingId, userId, totalAmount are required");
        }

        PaymentType paymentType = parsePaymentType(request.getPaymentType());
        if (paymentType == PaymentType.REMAINING) {
            throw new IllegalArgumentException("Use /payments/vnpay/create-remaining for remaining payment");
        }

        return createAndBuildUrl(request.getBookingId(), request.getUserId(), request.getTotalAmount(), paymentType, request, ipAddress);
    }

    public VNPayResponse createRemainingPayment(CreateVNPayRequest request, String ipAddress) {
        if (request.getBookingId() == null || request.getUserId() == null) {
            throw new IllegalArgumentException("bookingId, userId are required");
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

        return createAndBuildUrl(request.getBookingId(), request.getUserId(), totalAmount, PaymentType.REMAINING, request, ipAddress);
    }

    public Map<String, String> handleReturn(Map<String, String> inputParams) {
        return processCallback(inputParams, false);
    }

    public Map<String, String> handleIpn(Map<String, String> inputParams) {
        return processCallback(inputParams, true);
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

        Payment payment = paymentRepository.findByTransactionId(txnRef).orElse(null);
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

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                    result
            );
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            result.setStatus("FAILED");

            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                    result
            );
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
                                            String ipAddress) {
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
