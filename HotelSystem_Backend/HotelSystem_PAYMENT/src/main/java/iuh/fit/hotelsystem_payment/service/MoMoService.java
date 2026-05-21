package iuh.fit.hotelsystem_payment.service;
import iuh.fit.hotelsystem_payment.config.MoMoConfig;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.dto.CreateMoMoRequest;
import iuh.fit.hotelsystem_payment.dto.MoMoResponse;
import iuh.fit.hotelsystem_payment.dto.PaymentResultMessage;
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
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class MoMoService {

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;
    private final MoMoConfig moMoConfig;
    private final HttpClient httpClient;

    public MoMoService(PaymentRepository paymentRepository,
                       RabbitTemplate rabbitTemplate,
                       MoMoConfig moMoConfig) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.moMoConfig = moMoConfig;
        this.httpClient = HttpClient.newHttpClient();
    }

    public MoMoResponse createPayment(CreateMoMoRequest request) {
        if (request.getBookingId() == null || request.getUserId() == null || request.getTotalAmount() == null) {
            throw new IllegalArgumentException("bookingId, userId, totalAmount are required");
        }

        PaymentType paymentType = parsePaymentType(request.getPaymentType());
        if (paymentType == PaymentType.REMAINING) {
            throw new IllegalArgumentException("Use /payments/momo/create-remaining for remaining payment");
        }
        ensurePaymentNotCompleted(request.getBookingId(), paymentType);

        return createAndRequestMoMo(request.getBookingId(), request.getUserId(), request.getTotalAmount(), paymentType, request);
    }

    public MoMoResponse createRemainingPayment(CreateMoMoRequest request) {
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

        return createAndRequestMoMo(request.getBookingId(), request.getUserId(), totalAmount, PaymentType.REMAINING, request);
    }

    private void ensurePaymentNotCompleted(Long bookingId, PaymentType paymentType) {
        if (paymentRepository.existsByBookingIdAndPaymentTypeAndStatus(bookingId, paymentType, PaymentStatus.SUCCESS)) {
            throw new IllegalStateException(paymentType + " payment already completed for this booking");
        }
    }

    public Map<String, String> handleReturn(Map<String, String> inputParams) {
        return processCallback(inputParams, false);
    }

    public Map<String, String> handleIpn(Map<String, String> inputParams) {
        return processCallback(inputParams, true);
    }

    private MoMoResponse createAndRequestMoMo(Long bookingId,
                                             Long userId,
                                             Double totalAmount,
                                             PaymentType paymentType,
                                             CreateMoMoRequest request) {
        Double paidAmount = calculatePaidAmount(totalAmount, paymentType);

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(userId);
        payment.setTotalAmount(totalAmount);
        payment.setPaidAmount(paidAmount);
        payment.setAmount(paidAmount);
        payment.setPaymentType(paymentType);
        payment.setInvoiceCategory(InvoiceCategory.CHECKIN);
        payment.setMethod("MOMO");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        payment.setTransactionId(generateTransactionId(bookingId));
        payment = paymentRepository.save(payment);

        String amount = toMoMoAmount(paidAmount);
        String requestType = request.getRequestType();
        if (requestType == null || requestType.isBlank()) {
            requestType = "payWithATM";
        }
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("partnerCode", moMoConfig.getPartnerCode());
        payload.put("accessKey", moMoConfig.getAccessKey());
        payload.put("requestId", payment.getTransactionId());
        payload.put("amount", amount);
        payload.put("orderId", payment.getTransactionId());
        payload.put("orderInfo", "Thanh toan booking " + bookingId);
        payload.put("partnerName", moMoConfig.getPartnerName());
        payload.put("storeId", moMoConfig.getStoreId());
        if (!"payWithATM".equals(requestType)) {
            String partnerClientId = request.getPartnerClientId();
            if (partnerClientId == null || partnerClientId.isBlank()) {
                partnerClientId = "user_" + userId;
            }
            payload.put("partnerClientId", partnerClientId);
        }
        payload.put("redirectUrl", moMoConfig.getRedirectUrl());
        payload.put("ipnUrl", moMoConfig.getIpnUrl());
        payload.put("extraData", "");
        payload.put("requestType", requestType);
        payload.put("signature", hmacSHA256(moMoConfig.getSecretKey(), buildCreateSignature(payload, requestType)));
        payload.put("lang", "vi");
        payload.put("orderExpireTime", String.valueOf(moMoConfig.getExpireMinutes()));

        try {
            String requestBody = toJson(payload);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(moMoConfig.getPayUrl()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String payUrl = extractJsonString(response.body(), "payUrl");
            if (payUrl.isBlank()) {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
                throw new IllegalStateException("MoMo did not return payUrl: " + response.body());
            }
            return new MoMoResponse(payUrl);
        } catch (Exception ex) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new RuntimeException("Cannot create MoMo payment", ex);
        }
    }

    private Map<String, String> processCallback(Map<String, String> inputParams, boolean ipnMode) {
        String orderId = inputParams.get("orderId");
        if (orderId == null || orderId.isBlank()) {
            return buildCallbackResponse(ipnMode, "01", "Order not found", null);
        }

        if (!isValidCallbackSignature(inputParams)) {
            return buildCallbackResponse(ipnMode, "97", "Invalid signature", null);
        }

        Payment payment = paymentRepository.findByTransactionId(orderId).orElse(null);
        if (payment == null) {
            return buildCallbackResponse(ipnMode, "01", "Order not found", null);
        }

        String amount = inputParams.get("amount");
        if (amount != null && !amount.isBlank() && !toMoMoAmount(payment.getPaidAmount()).equals(amount)) {
            return buildCallbackResponse(ipnMode, "04", "Invalid amount", payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            return buildCallbackResponse(ipnMode, payment.getStatus() == PaymentStatus.SUCCESS ? "00" : "99", "Order already confirmed", payment);
        }

        String resultCode = inputParams.getOrDefault("resultCode", "99");
        payment.setVnpResponseCode(resultCode);
        payment.setVnpTransactionNo(inputParams.get("transId"));

        PaymentResultMessage result = new PaymentResultMessage();
        result.setBookingId(payment.getBookingId());
        result.setUserId(payment.getUserId());
        result.setPaidAmount(payment.getPaidAmount());
        result.setTotalAmount(payment.getTotalAmount());
        result.setTransactionId(payment.getTransactionId());

        if ("0".equals(resultCode)) {
            payment.setStatus(PaymentStatus.SUCCESS);
            result.setStatus(toPaymentResultStatus(payment.getPaymentType()));
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            result.setStatus("FAILED");
        }

        paymentRepository.save(payment);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.PAYMENT_RESULT_ROUTING_KEY, result);

        return buildCallbackResponse(ipnMode, "0".equals(resultCode) ? "00" : resultCode, "Confirm Success", payment);
    }

    private String toJson(Map<String, String> payload) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> entry : payload.entrySet()) {
            if (!first) {
                json.append(',');
            }
            json.append('"').append(escapeJson(entry.getKey())).append("\":");
            if ("amount".equals(entry.getKey()) || "orderExpireTime".equals(entry.getKey())) {
                json.append(entry.getValue());
            } else {
                json.append('"').append(escapeJson(entry.getValue())).append('"');
            }
            first = false;
        }
        json.append('}');
        return json.toString();
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String extractJsonString(String json, String key) {
        if (json == null || json.isBlank()) {
            return "";
        }
        String needle = "\"" + key + "\"";
        int keyIndex = json.indexOf(needle);
        if (keyIndex < 0) {
            return "";
        }
        int colonIndex = json.indexOf(':', keyIndex + needle.length());
        if (colonIndex < 0) {
            return "";
        }
        int startQuote = json.indexOf('"', colonIndex + 1);
        if (startQuote < 0) {
            return "";
        }
        StringBuilder value = new StringBuilder();
        boolean escaped = false;
        for (int index = startQuote + 1; index < json.length(); index++) {
            char ch = json.charAt(index);
            if (escaped) {
                value.append(ch);
                escaped = false;
                continue;
            }
            if (ch == '\\') {
                escaped = true;
                continue;
            }
            if (ch == '"') {
                return value.toString();
            }
            value.append(ch);
        }
        return "";
    }

    private boolean isValidCallbackSignature(Map<String, String> params) {
        String signature = params.get("signature");
        if (signature == null || signature.isBlank()) {
            return true;
        }
        boolean tokenizedAtmCallback = params.containsKey("callbackToken") || params.containsKey("partnerClientId");
        String rawSignature;
        if (tokenizedAtmCallback) {
            rawSignature = "accessKey=" + moMoConfig.getAccessKey()
                + "&amount=" + params.getOrDefault("amount", "")
                + "&callbackToken=" + params.getOrDefault("callbackToken", "")
                + "&extraData=" + params.getOrDefault("extraData", "")
                + "&message=" + params.getOrDefault("message", "")
                + "&orderId=" + params.getOrDefault("orderId", "")
                + "&orderInfo=" + params.getOrDefault("orderInfo", "")
                + "&orderType=" + params.getOrDefault("orderType", "")
                + "&partnerClientId=" + params.getOrDefault("partnerClientId", "")
                + "&partnerCode=" + params.getOrDefault("partnerCode", "")
                + "&payType=" + params.getOrDefault("payType", "")
                + "&requestId=" + params.getOrDefault("requestId", "")
                + "&responseTime=" + params.getOrDefault("responseTime", "")
                + "&resultCode=" + params.getOrDefault("resultCode", "")
                + "&transId=" + params.getOrDefault("transId", "");
        } else {
            rawSignature = "accessKey=" + moMoConfig.getAccessKey()
                    + "&amount=" + params.getOrDefault("amount", "")
                    + "&extraData=" + params.getOrDefault("extraData", "")
                    + "&message=" + params.getOrDefault("message", "")
                    + "&orderId=" + params.getOrDefault("orderId", "")
                    + "&orderInfo=" + params.getOrDefault("orderInfo", "")
                    + "&orderType=" + params.getOrDefault("orderType", "")
                    + "&partnerCode=" + params.getOrDefault("partnerCode", "")
                    + "&payType=" + params.getOrDefault("payType", "")
                    + "&requestId=" + params.getOrDefault("requestId", "")
                    + "&responseTime=" + params.getOrDefault("responseTime", "")
                    + "&resultCode=" + params.getOrDefault("resultCode", "")
                    + "&transId=" + params.getOrDefault("transId", "");
        }
        return hmacSHA256(moMoConfig.getSecretKey(), rawSignature).equalsIgnoreCase(signature);
    }

    private String buildCreateSignature(Map<String, String> payload, String requestType) {
        String signature = "accessKey=" + payload.get("accessKey")
                + "&amount=" + payload.get("amount")
                + "&extraData=" + payload.get("extraData")
                + "&ipnUrl=" + payload.get("ipnUrl")
                + "&orderId=" + payload.get("orderId")
                + "&orderInfo=" + payload.get("orderInfo");
        if (!"payWithATM".equals(requestType)) {
            signature += "&partnerClientId=" + payload.get("partnerClientId");
        }
        return signature
                + "&partnerCode=" + payload.get("partnerCode")
                + "&redirectUrl=" + payload.get("redirectUrl")
                + "&requestId=" + payload.get("requestId")
                + "&requestType=" + payload.get("requestType");
    }

    private Map<String, String> buildCallbackResponse(boolean ipnMode, String code, String message, Payment payment) {
        Map<String, String> response = new HashMap<>();
        if (ipnMode) {
            response.put("resultCode", "00".equals(code) ? "0" : code);
            response.put("message", message);
        } else {
            response.put("code", code);
            response.put("message", message);
        }
        if (payment != null) {
            response.put("bookingId", String.valueOf(payment.getBookingId()));
            response.put("paymentType", payment.getPaymentType().name());
            response.put("paymentStatus", payment.getStatus().name());
        }
        return response;
    }

    private String toPaymentResultStatus(PaymentType paymentType) {
        if (paymentType == PaymentType.FULL) {
            return "FULL_PAID";
        }
        if (paymentType == PaymentType.DEPOSIT) {
            return "DEPOSIT_PAID";
        }
        return "REMAINING_PAID";
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
        return "MOMO_" + bookingId + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private String toMoMoAmount(Double amount) {
        return BigDecimal.valueOf(amount).setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private Double roundVnd(Double amount) {
        return BigDecimal.valueOf(amount).setScale(0, RoundingMode.HALF_UP).doubleValue();
    }

    private String hmacSHA256(String key, String data) {
        try {
            Mac hmac256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac256.init(secretKeySpec);
            byte[] bytes = hmac256.doFinal(data.getBytes(StandardCharsets.UTF_8));

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
            throw new RuntimeException("Cannot sign MoMo payload", ex);
        }
    }
}
