package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.PaymentResult;
import iuh.fit.hotelsystem_payment.dto.CheckinBookingConfirmRequest;
import iuh.fit.hotelsystem_payment.dto.CheckinPaymentConfirmResponse;
import iuh.fit.hotelsystem_payment.dto.CheckinPaymentEvent;
import iuh.fit.hotelsystem_payment.dto.CheckinQrRequest;
import iuh.fit.hotelsystem_payment.dto.CheckinQrResponse;
import iuh.fit.hotelsystem_payment.dto.InvoiceSummaryResponse;
import iuh.fit.hotelsystem_payment.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_payment.dto.OperationalPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.RefundPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.EarlyCheckoutRefundRequest;
import iuh.fit.hotelsystem_payment.dto.RefundAllocationPreviewDto;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.entity.RefundReason;
import iuh.fit.hotelsystem_payment.entity.RefundReceiverType;
import iuh.fit.hotelsystem_payment.entity.RefundTransaction;
import iuh.fit.hotelsystem_payment.entity.RefundTransactionMethod;
import iuh.fit.hotelsystem_payment.entity.RefundTransactionStatus;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.socket.PaymentSocketService;
import iuh.fit.hotelsystem_payment.client.BookingServiceClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
//@RequiredArgsConstructor
public class PaymentService {

    private static final BigDecimal REFUND_SLICE_MIN = new BigDecimal("0.01");
    private static final BigDecimal REFUND_BALANCE_EPSILON = new BigDecimal("0.02");

    private final PaymentRepository paymentRepository;
    private final RefundTransactionRepository refundTransactionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentSocketService paymentSocketService;
    private final BookingServiceClient bookingServiceClient;

    @Value("${payment.checkin.confirm-url:http://localhost:3000/payment/confirm}")
    private String checkinConfirmUrl;

    public PaymentService(PaymentRepository paymentRepository,
                          RefundTransactionRepository refundTransactionRepository,
                          RabbitTemplate rabbitTemplate,
                          PaymentSocketService paymentSocketService,
                          BookingServiceClient bookingServiceClient) {
        this.paymentRepository = paymentRepository;
        this.refundTransactionRepository = refundTransactionRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentSocketService = paymentSocketService;
        this.bookingServiceClient = bookingServiceClient;
    }

    public void processPayment(Long bookingId) {

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setTotalAmount(500.0);
        payment.setPaidAmount(500.0);
        payment.setAmount(500.0); // legacy simulation path
        payment.setPaymentType(PaymentType.FULL);
        payment.setMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());

        payment = paymentRepository.save(payment);

        // =========================
        // Giả lập thanh toán thành công
        // =========================
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(UUID.randomUUID().toString());

        paymentRepository.save(payment);

        // Gửi kết quả về Booking
        PaymentResult result = new PaymentResult();
        result.setBookingId(bookingId);
        result.setStatus("FULL_PAID");

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE,
                RabbitConfig.PAYMENT_RESULT_ROUTING_KEY,
                result
        );
    }

    public PaymentStatusResponse getInvoiceStatus(Long bookingId) {
        List<Payment> payments = paymentRepository.findByBookingId(bookingId);
        double paidAmount = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> payment.getPaymentType() != PaymentType.LATE_CHECKOUT_FEE)
                .filter(payment -> payment.getPaymentType() != PaymentType.REFUND)
                .mapToDouble(payment -> payment.getPaidAmount() != null ? payment.getPaidAmount() : valueOrZero(payment.getAmount()))
                .sum();
        double totalAmount = payments.stream()
                .map(Payment::getTotalAmount)
                .filter(amount -> amount != null && amount > 0)
                .findFirst()
                .orElse(paidAmount);

        PaymentStatusResponse response = new PaymentStatusResponse();
        response.setPaidAmount(paidAmount);
        response.setRemainingAmount(Math.max(0.0, totalAmount - paidAmount));
        response.setStatus(response.getRemainingAmount() <= 0.01 && paidAmount > 0 ? "PAID" : "PARTIALLY_PAID");
        return response;
    }

    public Payment recordRemainingPayment(Long bookingId, OperationalPaymentRequest request) {
        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(request.getUserId());
        payment.setPayerGuestId(request.getPayerGuestId());
        payment.setPayerName(request.getPayerName());
        payment.setPayerPhone(request.getPayerPhone());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(request.getAmount());
        payment.setTotalAmount(resolveBookingTotalAfterRemainingPayment(bookingId, request.getAmount()));
        payment.setPaymentType(PaymentType.REMAINING);
        payment.setMethod(request.getMethod() == null || request.getMethod().isBlank()
                ? "STAFF_COLLECTED"
                : request.getMethod());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(resolveTransactionId(request.getTransactionId()));
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    public CheckinQrResponse createCheckinQr(CheckinQrRequest request) {
        if (request == null || request.getBookingId() == null) {
            throw new IllegalArgumentException("bookingId is required");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }
        if (!"BANK_TRANSFER".equalsIgnoreCase(request.getMethod())) {
            throw new IllegalArgumentException("Only BANK_TRANSFER is supported for check-in QR");
        }
        if (!"CHECKIN_REMAINING_PAYMENT".equalsIgnoreCase(request.getType())) {
            throw new IllegalArgumentException("Invalid payment type");
        }

        bookingServiceClient.getBooking(request.getBookingId());
        if (paymentRepository.existsByBookingIdAndStatus(request.getBookingId(), PaymentStatus.PENDING)) {
            throw new IllegalStateException("Booking already has a pending payment");
        }

        LocalDateTime now = LocalDateTime.now();
        String paymentCode = generatePaymentCode();
        Payment payment = new Payment();
        payment.setBookingId(request.getBookingId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(0.0);
        payment.setTotalAmount(request.getAmount());
        payment.setPaymentType(PaymentType.CHECKIN_REMAINING_PAYMENT);
        payment.setMethod("BANK_TRANSFER");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentCode(paymentCode);
        payment.setTransactionId(paymentCode);
        payment.setCreatedAt(now);
        payment.setExpiredAt(now.plusMinutes(10));
        paymentRepository.save(payment);

        return new CheckinQrResponse(
                paymentCode,
                request.getAmount(),
                checkinConfirmUrl + "?code=" + URLEncoder.encode(paymentCode, StandardCharsets.UTF_8),
                payment.getExpiredAt()
        );
    }

    public CheckinPaymentConfirmResponse getCheckinPayment(String paymentCode) {
        Payment payment = findByPaymentCode(paymentCode);
        CheckinPaymentConfirmResponse response = new CheckinPaymentConfirmResponse();
        response.setPaymentCode(payment.getPaymentCode());
        response.setBookingId(payment.getBookingId());
        response.setBookingCode("#" + payment.getBookingId());
        response.setAmount(payment.getAmount());
        response.setStatus(resolveVisibleStatus(payment));
        return response;
    }

    public CheckinPaymentConfirmResponse confirmCheckinPayment(String paymentCode) {
        Payment payment = findByPaymentCode(paymentCode);
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return getCheckinPayment(paymentCode);
        }
        if (payment.getStatus() == PaymentStatus.CANCELLED || payment.getStatus() == PaymentStatus.EXPIRED) {
            throw new IllegalStateException("Payment cannot be confirmed with status: " + payment.getStatus());
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException("Payment is not pending");
        }
        if (payment.getExpiredAt() != null && LocalDateTime.now().isAfter(payment.getExpiredAt())) {
            payment.setStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
            paymentSocketService.emit("payment:expired", toEvent(payment, "EXPIRED"));
            throw new IllegalStateException("Payment has expired");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getAmount());
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        CheckinBookingConfirmRequest request = new CheckinBookingConfirmRequest();
        request.setPaymentCode(payment.getPaymentCode());
        request.setAmount(payment.getAmount());
        request.setMethod(payment.getMethod());
        bookingServiceClient.confirmCheckinPayment(payment.getBookingId(), request);

        paymentSocketService.emit("payment:success", toEvent(payment, "SUCCESS"));
        return getCheckinPayment(paymentCode);
    }

    public CheckinPaymentConfirmResponse cancelCheckinPayment(String paymentCode) {
        Payment payment = findByPaymentCode(paymentCode);
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Successful payment cannot be cancelled");
        }
        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
            paymentSocketService.emit("payment:cancelled", toEvent(payment, "CANCELLED"));
        }
        return getCheckinPayment(paymentCode);
    }

    private Double resolveBookingTotalAfterRemainingPayment(Long bookingId, Double remainingAmount) {
        double successfulPaidBefore = paymentRepository.findByBookingId(bookingId).stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> payment.getPaymentType() != PaymentType.LATE_CHECKOUT_FEE)
                .filter(payment -> payment.getPaymentType() != PaymentType.REFUND)
                .mapToDouble(payment -> payment.getPaidAmount() != null ? payment.getPaidAmount() : valueOrZero(payment.getAmount()))
                .sum();
        return successfulPaidBefore + valueOrZero(remainingAmount);
    }

    public Payment createLateCheckoutFee(Long bookingId, OperationalPaymentRequest request) {
        return paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.LATE_CHECKOUT_FEE)
                .orElseGet(() -> {
                    Payment payment = new Payment();
                    payment.setBookingId(bookingId);
                    payment.setUserId(request.getUserId());
                    payment.setAmount(request.getAmount());
                    payment.setTotalAmount(request.getAmount());
                    payment.setPaidAmount(0.0);
                    payment.setPaymentType(PaymentType.LATE_CHECKOUT_FEE);
                    payment.setMethod("STAFF_COLLECTED");
                    payment.setStatus(PaymentStatus.PENDING);
                    payment.setTransactionId(resolveTransactionId(request.getTransactionId()));
                    payment.setCreatedAt(LocalDateTime.now());
                    return paymentRepository.save(payment);
                });
    }

    public Payment createEarlyCheckinFee(Long bookingId, OperationalPaymentRequest request) {
        return paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.EARLY_CHECKIN_FEE)
                .orElseGet(() -> {
                    Payment payment = new Payment();
                    payment.setBookingId(bookingId);
                    payment.setUserId(request.getUserId());
                    payment.setAmount(request.getAmount());
                    payment.setTotalAmount(request.getAmount());
                    payment.setPaidAmount(0.0);
                    payment.setPaymentType(PaymentType.EARLY_CHECKIN_FEE);
                    payment.setMethod("STAFF_COLLECTED");
                    payment.setStatus(PaymentStatus.PENDING);
                    payment.setTransactionId(resolveTransactionId(request.getTransactionId()));
                    payment.setCreatedAt(LocalDateTime.now());
                    return paymentRepository.save(payment);
                });
    }

    public Payment markEarlyCheckinFeePaid(Long bookingId) {
        Payment payment = paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.EARLY_CHECKIN_FEE)
                .orElseThrow(() -> new IllegalArgumentException("Early check-in fee not found for booking: " + bookingId));
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getAmount());
        return paymentRepository.save(payment);
    }

    public PaymentStatusResponse getEarlyCheckinFeeStatus(Long bookingId) {
        PaymentStatusResponse response = new PaymentStatusResponse();
        Payment payment = paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.EARLY_CHECKIN_FEE).orElse(null);
        if (payment == null) {
            response.setStatus("NONE");
            response.setPaidAmount(0.0);
            response.setRemainingAmount(0.0);
            return response;
        }
        boolean paid = payment.getStatus() == PaymentStatus.SUCCESS;
        response.setStatus(paid ? "PAID" : "PENDING");
        response.setPaidAmount(paid ? valueOrZero(payment.getAmount()) : 0.0);
        response.setRemainingAmount(paid ? 0.0 : valueOrZero(payment.getAmount()));
        return response;
    }

    public Payment markLateCheckoutFeePaid(Long bookingId) {
        Payment payment = paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.LATE_CHECKOUT_FEE)
                .orElseThrow(() -> new IllegalArgumentException("Late checkout fee not found for booking: " + bookingId));
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getAmount());
        return paymentRepository.save(payment);
    }

    public PaymentStatusResponse getLateCheckoutFeeStatus(Long bookingId) {
        PaymentStatusResponse response = new PaymentStatusResponse();
        Payment payment = paymentRepository.findTopByBookingIdAndPaymentTypeOrderByCreatedAtDesc(
                bookingId, PaymentType.LATE_CHECKOUT_FEE).orElse(null);
        if (payment == null) {
            response.setStatus("NONE");
            response.setPaidAmount(0.0);
            response.setRemainingAmount(0.0);
            return response;
        }
        boolean paid = payment.getStatus() == PaymentStatus.SUCCESS;
        response.setStatus(paid ? "PAID" : "PENDING");
        response.setPaidAmount(paid ? valueOrZero(payment.getAmount()) : 0.0);
        response.setRemainingAmount(paid ? 0.0 : valueOrZero(payment.getAmount()));
        return response;
    }

    public Payment createRefundPayment(RefundPaymentRequest request) {
        Payment payment = new Payment();
        payment.setBookingId(request.getBookingId());
        payment.setUserId(request.getUserId());
        payment.setAmount(request.getAmount());
        payment.setTotalAmount(request.getAmount());
        payment.setPaidAmount(request.getAmount());
        payment.setPaymentType(PaymentType.REFUND);
        payment.setMethod("REFUND");
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId("refund_" + request.getRefundRequestId() + "_" + UUID.randomUUID());
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    /** Preview phân bổ hoàn tiền (không ghi DB) — dùng cho màn staff trước khi xác nhận checkout. */
    public List<RefundAllocationPreviewDto> previewEarlyCheckoutRefund(Long bookingId, BigDecimal totalRefund) {
        return computeRefundSlices(bookingId, totalRefund).stream().map(this::toAllocationPreview).toList();
    }

    /**
     * Creates {@link RefundTransaction} rows tied to original successful payments (priority REMAINING → FULL → DEPOSIT).
     * Refund follows whoever paid each slice — not the guest checking out.
     */
    public List<RefundTransaction> createEarlyCheckoutRefund(EarlyCheckoutRefundRequest request) {
        if (request == null || request.getBookingId() == null) {
            throw new IllegalArgumentException("bookingId is required");
        }
        if (request.getReason() != null && !request.getReason().isBlank()
                && !"EARLY_CHECKOUT".equalsIgnoreCase(request.getReason().trim())) {
            throw new IllegalArgumentException("Unsupported refund reason: " + request.getReason());
        }

        List<RefundSlice> slices = computeRefundSlices(request.getBookingId(),
                BigDecimal.valueOf(valueOrZero(request.getAmount())));

        RefundReason reason = RefundReason.EARLY_CHECKOUT;
        List<RefundTransaction> created = new ArrayList<>(slices.size());
        LocalDateTime now = LocalDateTime.now();
        for (RefundSlice slice : slices) {
            Payment source = slice.source();
            RefundTransaction rt = new RefundTransaction();
            rt.setBookingId(request.getBookingId());
            rt.setOriginalPaymentId(source.getId());
            applyReceiverFromPayment(source, rt);
            rt.setAmount(slice.amount());
            applyRefundMethodAndStatus(source, rt);
            rt.setReason(reason);
            rt.setProcessedByStaffId(request.getProcessedByStaffId());
            rt.setNote(buildRefundNote(source));
            rt.setCreatedAt(now);
            created.add(refundTransactionRepository.save(rt));
        }
        return created;
    }

    private List<RefundSlice> computeRefundSlices(Long bookingId, BigDecimal totalRefund) {
        BigDecimal remainingRefund = totalRefund.setScale(2, RoundingMode.HALF_UP);
        if (remainingRefund.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Refund amount must be greater than zero");
        }

        List<Payment> sourcePayments = paymentRepository.findByBookingId(bookingId).stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> switch (payment.getPaymentType()) {
                    case REMAINING, FULL, DEPOSIT, CHECKIN_REMAINING_PAYMENT -> true;
                    default -> false;
                })
                .sorted(Comparator
                        .comparingInt((Payment payment) -> refundPriority(payment.getPaymentType()))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        if (sourcePayments.isEmpty()) {
            throw new IllegalStateException(
                    "No refundable payment transactions found for booking " + bookingId);
        }
        Map<Long, BigDecimal> allocatedByPaymentId = loadAllocatedSums(sourcePayments);

        List<RefundSlice> slices = new ArrayList<>(Math.min(8, sourcePayments.size()));
        for (Payment source : sourcePayments) {
            if (remainingRefund.compareTo(REFUND_SLICE_MIN) < 0) {
                break;
            }
            BigDecimal available = refundableHeadroom(source, allocatedByPaymentId);
            if (available.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal sliceAmount = remainingRefund.min(available);
            if (sliceAmount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal sliceScaled = sliceAmount.setScale(2, RoundingMode.HALF_UP);
            slices.add(new RefundSlice(source, sliceScaled));
            remainingRefund = remainingRefund.subtract(sliceScaled);
        }

        if (slices.isEmpty()) {
            throw new IllegalStateException(
                    "No refundable headroom on payment transactions for booking " + bookingId);
        }
        if (remainingRefund.compareTo(REFUND_BALANCE_EPSILON) > 0) {
            throw new IllegalStateException(
                    "Refund amount exceeds remaining refundable balance on recorded payments for booking "
                            + bookingId);
        }
        return slices;
    }

    private RefundAllocationPreviewDto toAllocationPreview(RefundSlice slice) {
        Payment source = slice.source();
        RefundAllocationPreviewDto dto = new RefundAllocationPreviewDto();
        dto.setAmount(slice.amount());
        RefundReceiverType rt = resolveReceiverType(source);
        dto.setReceiverType(rt.name());
        dto.setReceiverUserId(source.getUserId());
        dto.setReceiverGuestId(source.getPayerGuestId());
        dto.setReceiverName(source.getPayerName());
        dto.setReceiverPhone(source.getPayerPhone());
        dto.setSourcePaymentPurpose(mapPurposeCode(source.getPaymentType()));
        dto.setRefundChannel(resolveRefundChannelKey(source));
        dto.setRecipientSummaryVi(buildRecipientSummaryVi(slice.amount(), source, rt));
        return dto;
    }

    private RefundReceiverType resolveReceiverType(Payment source) {
        if (source.getUserId() != null) {
            return RefundReceiverType.USER;
        }
        if (source.getPayerGuestId() != null) {
            return RefundReceiverType.REPRESENTATIVE_GUEST;
        }
        return RefundReceiverType.WALK_IN_GUEST;
    }

    private static String mapPurposeCode(PaymentType paymentType) {
        if (paymentType == null) {
            return "UNKNOWN";
        }
        return switch (paymentType) {
            case DEPOSIT -> "DEPOSIT";
            case FULL -> "FULL_PAYMENT";
            case REMAINING, CHECKIN_REMAINING_PAYMENT -> "REMAINING";
            default -> paymentType.name();
        };
    }

    private String resolveRefundChannelKey(Payment source) {
        String m = source.getMethod() != null ? source.getMethod().trim() : "";
        if (isVnpayLike(m)) {
            return "VNPAY_REFUND";
        }
        if (isCashLike(m)) {
            return "CASH";
        }
        if (m.toUpperCase(Locale.ROOT).contains("BANK") || "BANK_TRANSFER".equalsIgnoreCase(m)) {
            return "BANK_TRANSFER";
        }
        return "ORIGINAL_PAYMENT";
    }

    private String buildRecipientSummaryVi(BigDecimal amount, Payment source, RefundReceiverType rt) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        String money = nf.format(amount.doubleValue()) + "đ";
        String who = switch (rt) {
            case USER -> "Người đặt phòng (User #" + source.getUserId() + ")";
            case REPRESENTATIVE_GUEST -> "Khách / đại diện thanh toán (guest #" + source.getPayerGuestId() + ")";
            case WALK_IN_GUEST -> "Khách thanh toán tại quầy (không gắn User)";
        };
        if (hasPayerLabel(source)) {
            who += " — " + source.getPayerName();
        }
        String channel = channelLabelVi(source);
        String purpose = purposeLabelVi(source.getPaymentType());
        return money + " → " + who + " · " + channel + " · Khoản: " + purpose;
    }

    private boolean hasPayerLabel(Payment source) {
        return source.getPayerName() != null && !source.getPayerName().isBlank();
    }

    private String channelLabelVi(Payment source) {
        String m = source.getMethod() != null ? source.getMethod().trim() : "";
        if (isVnpayLike(m)) {
            return "Hoàn qua VNPAY (theo giao dịch gốc, chờ duyệt cổng nếu sandbox)";
        }
        if (isCashLike(m)) {
            return "Tiền mặt — staff xác nhận đã trả khách";
        }
        if (m.toUpperCase(Locale.ROOT).contains("BANK") || "BANK_TRANSFER".equalsIgnoreCase(m)) {
            return "Chuyển khoản — staff xác nhận";
        }
        return "Theo kênh thanh toán gốc";
    }

    private String purposeLabelVi(PaymentType paymentType) {
        if (paymentType == null) {
            return "Không xác định";
        }
        return switch (paymentType) {
            case DEPOSIT -> "Cọc / đặt trước";
            case FULL -> "Thanh toán 100%";
            case REMAINING, CHECKIN_REMAINING_PAYMENT -> "Thanh toán phần còn lại";
            default -> paymentType.name();
        };
    }

    private record RefundSlice(Payment source, BigDecimal amount) {}

    private Map<Long, BigDecimal> loadAllocatedSums(List<Payment> sourcePayments) {
        List<Long> ids = new ArrayList<>(sourcePayments.size());
        for (Payment p : sourcePayments) {
            ids.add(p.getId());
        }
        List<Object[]> rows = refundTransactionRepository.sumAllocatedGroupedByOriginalPaymentIds(
                ids, RefundTransactionStatus.FAILED);
        Map<Long, BigDecimal> map = new HashMap<>(Math.max(16, rows.size() * 2));
        for (Object[] row : rows) {
            Long pid = (Long) row[0];
            BigDecimal sum = toBigDecimal(row[1]);
            map.put(pid, sum);
        }
        return map;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private BigDecimal refundableHeadroom(Payment source, Map<Long, BigDecimal> allocatedByPaymentId) {
        double paid = source.getPaidAmount() != null ? source.getPaidAmount() : valueOrZero(source.getAmount());
        BigDecimal allocated = allocatedByPaymentId.getOrDefault(source.getId(), BigDecimal.ZERO);
        return BigDecimal.valueOf(paid).subtract(allocated).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private void applyReceiverFromPayment(Payment source, RefundTransaction rt) {
        if (source.getUserId() != null) {
            rt.setReceiverType(RefundReceiverType.USER);
            rt.setReceiverId(source.getUserId());
        } else if (source.getPayerGuestId() != null) {
            rt.setReceiverType(RefundReceiverType.REPRESENTATIVE_GUEST);
            rt.setReceiverId(source.getPayerGuestId());
        } else {
            rt.setReceiverType(RefundReceiverType.WALK_IN_GUEST);
            rt.setReceiverId(null);
        }
        rt.setReceiverName(source.getPayerName());
        rt.setReceiverPhone(source.getPayerPhone());
    }

    private void applyRefundMethodAndStatus(Payment source, RefundTransaction rt) {
        String m = source.getMethod() != null ? source.getMethod().trim() : "";
        if (isVnpayLike(m)) {
            rt.setMethod(RefundTransactionMethod.VNPAY_REFUND);
            rt.setStatus(RefundTransactionStatus.PENDING_APPROVAL);
            return;
        }
        if (isCashLike(m)) {
            rt.setMethod(RefundTransactionMethod.CASH);
            rt.setStatus(RefundTransactionStatus.PENDING);
            return;
        }
        if (m.toUpperCase().contains("BANK") || "BANK_TRANSFER".equalsIgnoreCase(m)) {
            rt.setMethod(RefundTransactionMethod.BANK_TRANSFER);
            rt.setStatus(RefundTransactionStatus.PENDING_APPROVAL);
            return;
        }
        rt.setMethod(RefundTransactionMethod.ORIGINAL_PAYMENT);
        rt.setStatus(RefundTransactionStatus.PENDING_APPROVAL);
    }

    private boolean isVnpayLike(String method) {
        String u = method.toUpperCase();
        return u.contains("VNPAY") || u.contains("VNP");
    }

    private boolean isCashLike(String method) {
        String u = method.toUpperCase();
        return u.contains("CASH") || "STAFF_COLLECTED".equalsIgnoreCase(method.trim());
    }

    private String buildRefundNote(Payment source) {
        if (isVnpayLike(source.getMethod() != null ? source.getMethod() : "")) {
            return "VNPAY refund uses original txn (vnp_TxnRef / vnp_TransactionNo); confirm on gateway if API not called.";
        }
        if (isCashLike(source.getMethod() != null ? source.getMethod() : "")) {
            return "Cash refund: staff confirms payout to receiver before COMPLETED.";
        }
        return null;
    }

    public List<Payment> getStaffInvoices() {
        return paymentRepository.findAllByOrderByCreatedAtDesc();
    }

    public InvoiceSummaryResponse getStaffInvoiceSummary() {
        YearMonth currentMonth = YearMonth.now();
        List<Payment> payments = paymentRepository.findAll();
        double monthlyRevenue = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> payment.getPaymentType() != PaymentType.REFUND)
                .filter(payment -> payment.getCreatedAt() != null
                        && YearMonth.from(payment.getCreatedAt()).equals(currentMonth))
                .mapToDouble(payment -> valueOrZero(payment.getPaidAmount()))
                .sum();
        double paidTotal = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(payment -> valueOrZero(payment.getPaidAmount()))
                .sum();
        double pendingTotal = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PENDING)
                .mapToDouble(payment -> valueOrZero(payment.getAmount()))
                .sum();

        InvoiceSummaryResponse response = new InvoiceSummaryResponse();
        response.setMonthlyRevenue(monthlyRevenue);
        response.setPaidTotal(paidTotal);
        response.setPendingTotal(pendingTotal);
        response.setPaidCount(payments.stream().filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS).count());
        response.setPendingCount(payments.stream().filter(payment -> payment.getStatus() == PaymentStatus.PENDING).count());
        return response;
    }

    private String resolveTransactionId(String transactionId) {
        return transactionId != null && !transactionId.isBlank() ? transactionId : UUID.randomUUID().toString();
    }

    private Payment findByPaymentCode(String paymentCode) {
        if (paymentCode == null || paymentCode.isBlank()) {
            throw new IllegalArgumentException("paymentCode is required");
        }
        return paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentCode));
    }

    private String generatePaymentCode() {
        String date = LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String suffix = String.format("%06d", Math.abs(UUID.randomUUID().hashCode()) % 1_000_000);
        return "PAY-" + date + "-" + suffix;
    }

    private String resolveVisibleStatus(Payment payment) {
        if (payment.getStatus() == PaymentStatus.PENDING
                && payment.getExpiredAt() != null
                && LocalDateTime.now().isAfter(payment.getExpiredAt())) {
            payment.setStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
            return PaymentStatus.EXPIRED.name();
        }
        return payment.getStatus().name();
    }

    private CheckinPaymentEvent toEvent(Payment payment, String status) {
        return new CheckinPaymentEvent(
                payment.getPaymentCode(),
                payment.getBookingId(),
                payment.getAmount(),
                status,
                "SUCCESS".equals(status) ? "CHECKED_IN" : null);
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    private int refundPriority(PaymentType paymentType) {
        if (paymentType == PaymentType.REMAINING || paymentType == PaymentType.CHECKIN_REMAINING_PAYMENT) {
            return 0;
        }
        if (paymentType == PaymentType.FULL) return 1;
        if (paymentType == PaymentType.DEPOSIT) return 2;
        return 3;
    }
}
