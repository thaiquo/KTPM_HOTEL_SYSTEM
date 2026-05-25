package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.*;
import iuh.fit.hotelsystem_payment.entity.*;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import iuh.fit.hotelsystem_payment.socket.PaymentSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final BigDecimal REFUND_SLICE_MIN = BigDecimal.valueOf(1000);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final RefundTransactionRepository refundTransactionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentSocketService paymentSocketService;
    private final VNPayService vnPayService;

    @Value("${PAYMENT_CHECKIN_CONFIRM_URL:http://localhost:3000/payment/confirm}")
    private String checkinConfirmUrl;

    public PaymentService(PaymentRepository paymentRepository,
                          RefundTransactionRepository refundTransactionRepository,
                          RabbitTemplate rabbitTemplate,
                          PaymentSocketService paymentSocketService,
                          VNPayService vnPayService) {
        this.paymentRepository = paymentRepository;
        this.refundTransactionRepository = refundTransactionRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentSocketService = paymentSocketService;
        this.vnPayService = vnPayService;
    }

    // --- CÁC PHƯƠNG THỨC QUẢN LÝ STAFF ---
    public InvoiceSummaryResponse getStaffInvoiceSummary() {
        YearMonth currentMonth = YearMonth.now();
        List<Payment> payments = dedupeFinalInvoices(paymentRepository.findAllByOrderByCreatedAtDesc());
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

    public List<Payment> getStaffInvoices() {
        return dedupeFinalInvoices(paymentRepository.findAllByOrderByCreatedAtDesc());
    }

    private List<Payment> dedupeFinalInvoices(List<Payment> payments) {
        Set<String> successfulInvoiceKeys = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .map(this::invoiceDedupeKey)
                .collect(Collectors.toSet());

        Set<String> seenFinalInvoiceKeys = new HashSet<>();
        return payments.stream()
                .filter(payment -> !isRedundantFinalInvoice(payment, successfulInvoiceKeys, seenFinalInvoiceKeys))
                .toList();
    }

    private boolean isRedundantFinalInvoice(Payment payment,
                                            Set<String> successfulInvoiceKeys,
                                            Set<String> seenFinalInvoiceKeys) {
        if (payment == null) {
            return false;
        }
        PaymentStatus status = payment.getStatus();
        String key = invoiceDedupeKey(payment);
        if (status == PaymentStatus.SUCCESS) {
            return !seenFinalInvoiceKeys.add(key);
        }
        if (status != PaymentStatus.FAILED && status != PaymentStatus.CANCELLED && status != PaymentStatus.EXPIRED) {
            return false;
        }
        return successfulInvoiceKeys.contains(key);
    }

    private String invoiceDedupeKey(Payment payment) {
        return String.valueOf(payment.getBookingId())
                + "|" + String.valueOf(payment.getPaymentType())
                + "|" + String.valueOf(payment.getInvoiceCategory())
                + "|" + Math.round(valueOrZero(payment.getAmount()));
    }

    // --- CÁC PHƯƠNG THỨC CHECK-IN QR (MỚI KHÔI PHỤC) ---
    @Transactional
    public CheckinQrResponse createCheckinQr(CheckinQrRequest request) {
        String paymentCode = generatePaymentCode();
        Payment payment = new Payment();
        LocalDateTime now = nowVi();
        payment.setBookingId(request.getBookingId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(0.0);
        payment.setTotalAmount(request.getAmount());
        PaymentType paymentType = PaymentType.valueOf(request.getType() != null ? request.getType() : "CHECKIN_REMAINING_PAYMENT");
        payment.setPaymentType(paymentType);
        payment.setInvoiceCategory(paymentType == PaymentType.LATE_CHECKOUT_FEE ? InvoiceCategory.CHECKOUT : InvoiceCategory.CHECKIN);
        payment.setMethod(request.getMethod() != null ? request.getMethod() : "CASH");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentCode(paymentCode);
        payment.setCreatedAt(now);
        payment.setExpiredAt(now.plusMinutes(15));
        paymentRepository.save(payment);

        String confirmUrl = checkinConfirmUrl + "?code=" + paymentCode;
        return new CheckinQrResponse(paymentCode, request.getAmount(), confirmUrl, payment.getExpiredAt());
    }

    public CheckinPaymentConfirmResponse getCheckinPayment(String code) {
        Payment payment = paymentRepository.findByPaymentCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for code: " + code));
        
        CheckinPaymentConfirmResponse resp = new CheckinPaymentConfirmResponse();
        resp.setPaymentCode(payment.getPaymentCode());
        resp.setBookingId(payment.getBookingId());
        resp.setAmount(payment.getAmount());
        resp.setStatus(payment.getStatus().name());
        resp.setPaymentType(payment.getPaymentType() != null ? payment.getPaymentType().name() : null);
        resp.setInvoiceCategory(payment.getInvoiceCategory() != null ? payment.getInvoiceCategory().name() : null);
        return resp;
    }

    @Transactional
    public CheckinPaymentConfirmResponse confirmCheckinPayment(String paymentCode) {
        Payment payment = paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentCode));

        if (payment.getPaymentType() == PaymentType.LATE_CHECKOUT_FEE) {
            throw new IllegalStateException("Use late-checkout confirmation endpoint for this payment type");
        }
        
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return toConfirmResponse(payment);
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getAmount());
        payment.setPaidAt(nowVi());
        payment.setTransactionId("CONF_" + paymentCode + "_" + System.currentTimeMillis());
        Payment saved = paymentRepository.save(payment);

        // Gửi event qua RabbitMQ để Booking Service cập nhật trạng thái
        CheckinPaymentEvent event = new CheckinPaymentEvent(
            saved.getPaymentCode(),
            saved.getBookingId(),
            saved.getAmount(),
            "SUCCESS",
            "PAID",
            saved.getPayerGuestId(),
            saved.getPayerName(),
            saved.getPayerPhone(),
            null
        );
        PaymentResultMessage msg = new PaymentResultMessage();
        msg.setBookingId(saved.getBookingId());
        msg.setUserId(saved.getUserId());
        msg.setStatus("REMAINING_PAID");
        msg.setPaidAmount(saved.getAmount());
        msg.setTotalAmount(saved.getAmount());
        msg.setTransactionId(saved.getTransactionId());
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.PAYMENT_RESULT_ROUTING_KEY, msg);
        
        // Gửi tín hiệu real-time qua WebSocket dùng Service có sẵn của bạn
        paymentSocketService.emit("payment:success", event);
        
        return toConfirmResponse(saved);
    }

    @Transactional
    public CheckinPaymentConfirmResponse confirmLateCheckoutPayment(String paymentCode) {
        Payment payment = paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentCode));

        if (payment.getPaymentType() != PaymentType.LATE_CHECKOUT_FEE) {
            throw new IllegalStateException("Use check-in confirmation endpoint for this payment type");
        }

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return toConfirmResponse(payment);
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getAmount());
        payment.setPaidAt(nowVi());
        payment.setTransactionId("CONF_LATE_" + paymentCode + "_" + System.currentTimeMillis());
        Payment saved = paymentRepository.save(payment);

        CheckinPaymentEvent event = new CheckinPaymentEvent(
            saved.getPaymentCode(),
            saved.getBookingId(),
            saved.getAmount(),
            "SUCCESS",
            "PAID",
            saved.getPayerGuestId(),
            saved.getPayerName(),
            saved.getPayerPhone(),
            null
        );
        paymentSocketService.emit("payment:success", event);

        return toConfirmResponse(saved);
    }

    @Transactional
    public BookingCancellationResponse cancelBooking(BookingCancellationRequest request) {
        if (request == null || request.getBookingId() == null) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        Long bookingId = request.getBookingId();
        BookingCancellationResponse response = new BookingCancellationResponse();
        response.setBookingId(bookingId);

        // Find the original successful payment (payment source)
        Payment originalPayment = resolveLatestSuccessfulPayment(bookingId);
        
        if (originalPayment == null) {
            response.setStatus("NO_PAYMENT_FOUND");
            response.setMessage("No original payment found for booking: " + bookingId);
            return response;
        }

        response.setOriginalPaymentId(originalPayment.getId());

        // Do NOT mark the original payment as CANCELLED unless a refund is being created.
        // Preserve original payment record so booking invoice lists only show real payment invoices.
        log.info("Processed booking cancellation without forcing original payment cancellation: paymentId={}, bookingId={}", originalPayment.getId(), bookingId);

        // Case 1: Customer cancels with refund (eligible for refund)
        if (request.getEligibleForRefund() != null && request.getEligibleForRefund() 
            && request.getRefundAmount() != null && request.getRefundAmount() > 0) {
            
            // Create RefundTransaction for staff approval
            RefundTransaction refundTx = new RefundTransaction();
            refundTx.setBookingId(bookingId);
            refundTx.setOriginalPaymentId(originalPayment.getId());
            refundTx.setAmount(BigDecimal.valueOf(request.getRefundAmount()));
            refundTx.setReceiverType(RefundReceiverType.USER);
            refundTx.setReceiverId(request.getUserId());
            refundTx.setReceiverName(originalPayment.getPayerName());
            refundTx.setReceiverPhone(originalPayment.getPayerPhone());
            refundTx.setMethod(resolveRefundMethodFromPayment(originalPayment));
            refundTx.setReason(RefundReason.BOOKING_CANCELLATION);
            refundTx.setStatus(RefundTransactionStatus.STAFF_REVIEW); // Waiting for staff approval
            refundTx.setNote(request.getCancellationReason() != null 
                ? request.getCancellationReason() 
                : "Customer booking cancellation with refund eligibility");
            refundTx.setCreatedAt(nowVi());

            RefundTransaction savedRefundTx = refundTransactionRepository.save(refundTx);
            log.info("Created RefundTransaction for staff review: refundTxId={}, bookingId={}, amount={}", 
                savedRefundTx.getId(), bookingId, request.getRefundAmount());

            response.setRefundTransactionId(savedRefundTx.getId());
            response.setRefundAmount(request.getRefundAmount());
            response.setStatus("PENDING_REFUND_APPROVAL");
            response.setMessage("Refund request created for staff approval. RefundTransaction ID: " + savedRefundTx.getId());
        } 
        // Case 2: Customer cancels without refund (per policy)
        else {
            response.setRefundAmount(0.0);
            response.setStatus("CANCELLED_NO_REFUND");
            response.setMessage("Booking cancelled per policy. No refund requested.");
        }

        // In both cases: Release the room back to AVAILABLE status
        if (request.getRoomId() != null) {
            releaseRoomStatus(bookingId, request.getRoomId());
        } else {
            log.warn("Room ID not provided in cancellation request for booking: {}", bookingId);
        }

        return response;
    }

    /**
     * Legacy method for backward compatibility. 
     * Now delegates to cancelBooking with basic mapping.
     */
    @Transactional
    public CheckinPaymentConfirmResponse cancelCheckinPayment(String paymentCode) {
        Payment payment = paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentCode));
        
        Long bookingId = payment.getBookingId();
        
        // Create cancellation request
        BookingCancellationRequest cancelRequest = new BookingCancellationRequest();
        cancelRequest.setBookingId(bookingId);
        cancelRequest.setEligibleForRefund(false); // For legacy method, assume no refund
        cancelRequest.setCancellationReason("Legacy cancellation");
        
        // Call the new comprehensive cancellation method
        cancelBooking(cancelRequest);
        // Return legacy response format. Do NOT force-mark the original payment as CANCELLED here.
        return toConfirmResponse(payment);
    }

    private void releaseRoomStatus(Long bookingId, Long roomId) {
        try {
            RoomMessage roomMessage = new RoomMessage();
            roomMessage.setBookingId(bookingId);
            roomMessage.setRoomId(roomId);
            
            rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE, 
                RabbitConfig.ROOM_RELEASE_ROUTING_KEY, 
                roomMessage
            );
            log.info("Sent room release message for booking: {}, roomId: {}", bookingId, roomId);
        } catch (Exception e) {
            log.error("Failed to send room release message for booking {}: {}", bookingId, e.getMessage());
            // Don't fail the entire cancellation if messaging fails
        }
    }

    private RefundTransactionMethod resolveRefundMethodFromPayment(Payment payment) {
        if (payment == null || payment.getMethod() == null) {
            return RefundTransactionMethod.ORIGINAL_PAYMENT;
        }
        String method = payment.getMethod().toUpperCase();
        if (method.contains("VNPAY")) {
            return RefundTransactionMethod.VNPAY_REFUND;
        } else if (method.contains("BANK") || method.contains("TRANSFER")) {
            return RefundTransactionMethod.BANK_TRANSFER;
        } else if (method.contains("CASH")) {
            return RefundTransactionMethod.CASH;
        }
        return RefundTransactionMethod.ORIGINAL_PAYMENT;
    }

    private CheckinPaymentConfirmResponse toConfirmResponse(Payment p) {
        CheckinPaymentConfirmResponse r = new CheckinPaymentConfirmResponse();
        r.setPaymentCode(p.getPaymentCode());
        r.setBookingId(p.getBookingId());
        r.setAmount(p.getAmount());
        r.setStatus(p.getStatus().name());
        r.setPaymentType(p.getPaymentType() != null ? p.getPaymentType().name() : null);
        r.setInvoiceCategory(p.getInvoiceCategory() != null ? p.getInvoiceCategory().name() : null);
        return r;
    }

    // --- CÁC PHƯƠNG THỨC NGHIỆP VỤ CHECKOUT ---
    public PaymentStatusResponse getInvoiceStatus(Long bookingId) {
        List<Payment> payments = dedupeFinalInvoices(paymentRepository.findByBookingId(bookingId).stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList());
        if (payments.isEmpty()) {
            return new PaymentStatusResponse(bookingId, "UNPAID", 0.0, 0.0);
        }

        double totalAmount = payments.stream()
                .filter(p -> p.getInvoiceCategory() == InvoiceCategory.CHECKIN)
                .mapToDouble(p -> valueOrZero(p.getAmount()))
                .sum();
        
        double paidAmount = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> p.getInvoiceCategory() == InvoiceCategory.CHECKIN)
                .mapToDouble(p -> valueOrZero(p.getPaidAmount()))
                .sum();

        String status = (paidAmount >= totalAmount && totalAmount > 0) ? "PAID" : "PARTIAL";
        if (paidAmount == 0) status = "UNPAID";

        return new PaymentStatusResponse(bookingId, status, totalAmount, paidAmount);
    }

    @Transactional
    public Payment recordRemainingPayment(Long bookingId, OperationalPaymentRequest request) {
        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(request.getUserId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(request.getAmount());
        payment.setTotalAmount(request.getAmount());
        payment.setPaymentType(PaymentType.REMAINING);
        payment.setInvoiceCategory(InvoiceCategory.CHECKIN);
        payment.setMethod(request.getMethod() != null ? request.getMethod() : "CASH");
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId("REM_" + bookingId + "_" + System.currentTimeMillis());
        payment.setPayerName(request.getPayerName());
        payment.setPayerPhone(request.getPayerPhone());
        payment.setCreatedAt(nowVi());
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment createLateCheckoutFee(Long bookingId, OperationalPaymentRequest request) {
        List<Payment> pendingFees = paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.LATE_CHECKOUT_FEE)
                .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .toList();
        if (!pendingFees.isEmpty()) {
            Payment existing = pendingFees.stream()
                    .max(Comparator.comparing(
                            Payment::getCreatedAt,
                            Comparator.nullsLast(Comparator.naturalOrder())
                    ))
                    .orElse(pendingFees.get(pendingFees.size() - 1));
            existing.setUserId(request.getUserId());
            existing.setAmount(request.getAmount());
            existing.setPaidAmount(0.0);
            existing.setTotalAmount(request.getAmount());
            existing.setInvoiceCategory(InvoiceCategory.CHECKOUT);
            existing.setMethod("PENDING");
            existing.setExpiredAt(nowVi().plusMinutes(30));
            return paymentRepository.save(existing);
        }

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(request.getUserId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(0.0);
        payment.setTotalAmount(request.getAmount());
        payment.setPaymentType(PaymentType.LATE_CHECKOUT_FEE);
        payment.setInvoiceCategory(InvoiceCategory.CHECKOUT);
        payment.setMethod("PENDING");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentCode(generatePaymentCode());
        LocalDateTime now = nowVi();
        payment.setCreatedAt(now);
        payment.setExpiredAt(now.plusMinutes(30));
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment createEarlyCheckinFee(Long bookingId, OperationalPaymentRequest request) {
        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setUserId(request.getUserId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(0.0);
        payment.setTotalAmount(request.getAmount());
        payment.setPaymentType(PaymentType.EARLY_CHECKIN_FEE);
        payment.setInvoiceCategory(InvoiceCategory.CHECKIN);
        payment.setMethod("PENDING");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentCode(generatePaymentCode());
        LocalDateTime now = nowVi();
        payment.setCreatedAt(now);
        payment.setExpiredAt(now.plusMinutes(30));
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment markLateCheckoutFeePaid(Long bookingId) {
        return markLateCheckoutFeePaid(bookingId, "CASH");
    }

    @Transactional
    public Payment markLateCheckoutFeePaid(Long bookingId, String method) {
        List<Payment> fees = paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.LATE_CHECKOUT_FEE)
                .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .toList();
        if (fees.isEmpty()) return null;
        Payment fee = fees.stream()
                .max(Comparator
                        .comparing(Payment::getAmount, Comparator.nullsLast(Double::compareTo))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(fees.get(fees.size() - 1));
        fee.setStatus(PaymentStatus.SUCCESS);
        fee.setPaidAmount(fee.getAmount());
        fee.setPaidAt(nowVi());
        String finalMethod = (method != null && !method.isBlank()) ? method.toUpperCase() : "CASH";
        fee.setMethod(finalMethod);
        String prefix = "CASH".equalsIgnoreCase(finalMethod) ? "CASH_LATE_" : "BANK_LATE_";
        fee.setTransactionId(prefix + fee.getPaymentCode() + "_" + System.currentTimeMillis());
        return paymentRepository.save(fee);
    }

    /**
     * Mark late checkout fee as paid, optionally recording payer info from the request.
     * This keeps backward compatibility with the existing methods but allows callers
     * (e.g. staff UI) to pass payerName/payerPhone/payerGuestId/payerCccd in the body.
     */
    public Payment markLateCheckoutFeePaid(Long bookingId, String method, OperationalPaymentRequest request) {
        Payment fee = markLateCheckoutFeePaid(bookingId, method);
        if (fee == null) return null;

        boolean updated = false;
        if (request != null) {
            if (request.getPayerName() != null && !request.getPayerName().isBlank()) {
                fee.setPayerName(request.getPayerName());
                updated = true;
            }
            if (request.getPayerPhone() != null && !request.getPayerPhone().isBlank()) {
                fee.setPayerPhone(request.getPayerPhone());
                updated = true;
            }
            if (request.getPayerGuestId() != null && request.getPayerGuestId() > 0) {
                fee.setPayerGuestId(request.getPayerGuestId());
                updated = true;
            }
        }
        if (updated) {
            fee = paymentRepository.save(fee);
        }

        // Emit event including payerCccd if provided in request (not persisted)
        String payerCccd = request != null ? request.getPayerCccd() : null;
        CheckinPaymentEvent event = new CheckinPaymentEvent(
                fee.getPaymentCode(),
                fee.getBookingId(),
                fee.getAmount(),
                "SUCCESS",
                "PAID",
                fee.getPayerGuestId(),
                fee.getPayerName(),
                fee.getPayerPhone(),
                payerCccd
        );
        paymentSocketService.emit("payment:success", event);

        return fee;
    }

    @Transactional
    public Payment markEarlyCheckinFeePaid(Long bookingId) {
        return markEarlyCheckinFeePaid(bookingId, "CASH");
    }

    @Transactional
    public Payment markEarlyCheckinFeePaid(Long bookingId, String method) {
        List<Payment> fees = paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.EARLY_CHECKIN_FEE)
                .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .toList();
        if (fees.isEmpty()) return null;
        Payment fee = fees.get(0);
        fee.setStatus(PaymentStatus.SUCCESS);
        fee.setPaidAmount(fee.getAmount());
        fee.setPaidAt(nowVi());
        String finalMethod = (method != null && !method.isBlank()) ? method.toUpperCase() : "CASH";
        fee.setMethod(finalMethod);
        String prefix = "CASH".equalsIgnoreCase(finalMethod) ? "CASH_EARLY_" : "BANK_EARLY_";
        fee.setTransactionId(prefix + fee.getPaymentCode() + "_" + System.currentTimeMillis());
        return paymentRepository.save(fee);
    }

    public PaymentStatusResponse getLateCheckoutFeeStatus(Long bookingId) {
        List<Payment> fees = paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.LATE_CHECKOUT_FEE)
                .toList();
        if (fees.isEmpty()) return new PaymentStatusResponse(bookingId, "NONE", 0.0, 0.0);

        double requiredAmount = fees.stream()
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .max(Double::compareTo)
                .orElse(0.0);
        double paidAmount = fees.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getPaidAmount)
                .filter(Objects::nonNull)
                .max(Double::compareTo)
                .orElse(0.0);

        if (paidAmount >= requiredAmount && requiredAmount > 0) {
            return new PaymentStatusResponse(bookingId, "PAID", requiredAmount, paidAmount);
        }

        Optional<Payment> latest = fees.stream()
                .max(Comparator.comparing(
                        Payment::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ));
        Payment fee = latest.orElse(fees.get(fees.size() - 1));
        String statusStr = fee.getStatus() == PaymentStatus.SUCCESS ? "PAID" : fee.getStatus().name();
        return new PaymentStatusResponse(bookingId, statusStr, requiredAmount, paidAmount);
    }

    public PaymentStatusResponse getEarlyCheckinFeeStatus(Long bookingId) {
        List<Payment> fees = paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.EARLY_CHECKIN_FEE)
                .toList();
        if (fees.isEmpty()) return new PaymentStatusResponse(bookingId, "NONE", 0.0, 0.0);
        Payment fee = fees.get(0);
        String statusStr = fee.getStatus() == PaymentStatus.SUCCESS ? "PAID" : fee.getStatus().name();
        return new PaymentStatusResponse(bookingId, statusStr, fee.getAmount(), fee.getPaidAmount());
    }

    @Transactional
    public Payment createRefundPayment(RefundPaymentRequest request) {
        if (request == null || request.getBookingId() == null) {
            throw new IllegalArgumentException("bookingId is required");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }

        String idempotencyKey = request.getRefundRequestId() != null
                ? "REFUND_REQUEST_" + request.getRefundRequestId()
                : "REFUND_BOOKING_" + request.getBookingId() + "_" + Math.round(request.getAmount());
        Optional<Payment> existingRefund = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existingRefund.isPresent()) {
            return existingRefund.get();
        }
        Optional<Payment> existingSuccessfulInvoice = findExistingSuccessfulRefundInvoice(
                request.getBookingId(), request.getAmount());
        if (existingSuccessfulInvoice.isPresent()) {
            return existingSuccessfulInvoice.get();
        }

        Payment sourcePayment = resolveRefundSource(request.getBookingId(), request.getPaymentTransactionId());
        Payment payment = new Payment();
        payment.setBookingId(request.getBookingId());
        payment.setAmount(request.getAmount());
        payment.setPaidAmount(request.getAmount());
        payment.setTotalAmount(request.getAmount());
        payment.setPaymentType(PaymentType.REFUND);
        payment.setInvoiceCategory(InvoiceCategory.REFUND);
        payment.setPaymentCode("RF-" + request.getRefundRequestId() + "-" + UUID.randomUUID().toString().substring(0, 8));
        payment.setTransactionId("refund_" + request.getRefundRequestId() + "_" + UUID.randomUUID());
        payment.setIdempotencyKey(idempotencyKey);
        LocalDateTime now = nowVi();
        payment.setCreatedAt(now);
        payment.setPaidAt(now);
        if (sourcePayment != null && isVnPayMethod(sourcePayment.getMethod())) {
            if (sourcePayment.getTransactionId() == null || sourcePayment.getTransactionId().isBlank()) {
                throw new IllegalStateException("Missing VNPAY transaction reference for refund");
            }
            String txnDate = formatVnpDate(sourcePayment.getPaidAt() != null
                    ? sourcePayment.getPaidAt()
                    : sourcePayment.getCreatedAt());
            String txnType = resolveRefundTransactionType(request.getAmount(), sourcePayment.getPaidAmount());
            VNPayService.VNPayRefundResult result = vnPayService.refund(
                    sourcePayment.getTransactionId(),
                    txnDate,
                    request.getAmount(),
                    "SYSTEM",
                    null,
                    "Refund booking " + request.getBookingId(),
                    txnType,
                    sourcePayment.getVnpTransactionNo()
            );
            if (!result.success()) {
                Optional<Payment> existingAfterGatewayFailure = findExistingSuccessfulRefundInvoice(
                        request.getBookingId(), request.getAmount());
                if (existingAfterGatewayFailure.isPresent()) {
                    log.warn("VNPAY refund rejected but a successful refund invoice already exists. bookingId={}, refundRequestId={}, message={}",
                            request.getBookingId(), request.getRefundRequestId(), result.message());
                    return existingAfterGatewayFailure.get();
                }
                throw new IllegalStateException("VNPAY refund failed: " + result.message());
            }
            payment.setMethod("VNPAY_REFUND");
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setVnpResponseCode(result.responseCode());
            payment.setVnpTransactionNo(result.transactionNo());
        } else {
            payment.setMethod(resolveManualRefundMethod(sourcePayment));
            payment.setStatus(PaymentStatus.SUCCESS);
        }
        return paymentRepository.save(payment);
    }

    private Optional<Payment> findExistingSuccessfulRefundInvoice(Long bookingId, Double amount) {
        if (bookingId == null || amount == null || amount <= 0) {
            return Optional.empty();
        }
        long expectedAmount = Math.round(valueOrZero(amount));
        return paymentRepository.findByBookingId(bookingId).stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> payment.getInvoiceCategory() == InvoiceCategory.REFUND)
                .filter(payment -> payment.getPaymentType() == PaymentType.REFUND
                        || payment.getPaymentType() == PaymentType.EARLY_CHECKOUT_REFUND)
                .filter(payment -> Math.round(valueOrZero(payment.getAmount())) == expectedAmount)
                .max(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
    }

    private String resolveManualRefundMethod(Payment sourcePayment) {
        String method = sourcePayment != null && sourcePayment.getMethod() != null
                ? sourcePayment.getMethod().toUpperCase()
                : "";
        if (method.contains("BANK") || method.contains("TRANSFER")) {
            return "BANK_TRANSFER_REFUND";
        }
        return "CASH_REFUND";
    }

    public List<RefundAllocationPreviewDto> previewEarlyCheckoutRefund(Long bookingId, BigDecimal totalRefund) {
        return computeRefundSlices(bookingId, totalRefund).stream().map(this::toAllocationPreview).toList();
    }

    @Transactional
    public List<RefundTransaction> createEarlyCheckoutRefund(EarlyCheckoutRefundRequest request) {
        if (request == null || request.getBookingId() == null) {
            throw new IllegalArgumentException("bookingId is required");
        }

        List<RefundSlice> slices = new ArrayList<>();
        try {
            slices = computeRefundSlices(request.getBookingId(), BigDecimal.valueOf(valueOrZero(request.getAmount())));
        } catch (Exception ex) {
            if (!request.isForceImmediate()) {
                throw ex;
            }
            log.warn("No source payments found for booking {}, but forceImmediate is true. Proceeding with manual cash refund.", request.getBookingId());
        }

        RefundReason reason = RefundReason.EARLY_CHECKOUT;
        List<RefundTransaction> created = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        boolean isCounterRefund = false;
        boolean hasOnlineRefund = false;
        String refundMethod = "REFUND_QUEUE";

        if (slices.isEmpty() && request.isForceImmediate()) {
            isCounterRefund = true;
            refundMethod = "CASH";
        } else {
            boolean hasOnline = false;
            boolean hasCounter = false;
            String detectedCounterMethod = "CASH";
            for (RefundSlice slice : slices) {
                String m = slice.source().getMethod() != null ? slice.source().getMethod().toUpperCase() : "";
                if (m.contains("VNPAY") || m.contains("MOMO")) {
                    hasOnline = true;
                } else if (m.contains("CASH") || "STAFF_COLLECTED".equalsIgnoreCase(m)) {
                    hasCounter = true;
                    detectedCounterMethod = "CASH";
                } else if (m.contains("BANK") || m.contains("TRANSFER")) {
                    hasCounter = true;
                    detectedCounterMethod = "BANK_TRANSFER";
                }
            }
            if (hasCounter && !hasOnline) {
                isCounterRefund = true;
                refundMethod = detectedCounterMethod;
            }
        }

        if (slices.isEmpty() && request.isForceImmediate()) {
            RefundTransaction rt = new RefundTransaction();
            rt.setBookingId(request.getBookingId());
            rt.setAmount(BigDecimal.valueOf(valueOrZero(request.getAmount())));
            rt.setMethod(RefundTransactionMethod.CASH);
            rt.setStatus(RefundTransactionStatus.COMPLETED);
            rt.setReason(reason);
            rt.setProcessedByStaffId(request.getProcessedByStaffId());
            rt.setNote("Hoàn tiền mặt trực tiếp tại quầy (Không tìm thấy giao dịch gốc trên hệ thống)");
            rt.setCreatedAt(now);
            created.add(refundTransactionRepository.save(rt));
        } else {
            for (RefundSlice slice : slices) {
                Payment source = slice.source();
                RefundTransaction rt = new RefundTransaction();
                rt.setBookingId(request.getBookingId());
                rt.setOriginalPaymentId(source.getId());
                applyReceiverFromPayment(source, rt);
                rt.setAmount(slice.amount());

                if (request.isForceImmediate()) {
                    if (isVnPayMethod(source.getMethod())) {
                        hasOnlineRefund = true;
                        String txnDate = formatVnpDate(source.getPaidAt() != null ? source.getPaidAt() : source.getCreatedAt());
                        String txnType = resolveRefundTransactionType(slice.amount().doubleValue(), source.getPaidAmount());
                        VNPayService.VNPayRefundResult result = vnPayService.refund(
                                source.getTransactionId(),
                                txnDate,
                                slice.amount().doubleValue(),
                                String.valueOf(request.getProcessedByStaffId()),
                                null,
                                "Early checkout refund for booking " + request.getBookingId(),
                                txnType,
                                source.getVnpTransactionNo()
                        );
                        if (!result.success()) {
                            throw new IllegalStateException("VNPAY refund failed: " + result.message());
                        }
                        rt.setMethod(RefundTransactionMethod.VNPAY_REFUND);
                        rt.setStatus(RefundTransactionStatus.COMPLETED);
                        rt.setCompletedAt(now);
                        if (result.transactionNo() != null) {
                            rt.setNote(buildRefundNote(source) + " | VNPAY refund txn: " + result.transactionNo());
                        }
                    } else {
                        rt.setMethod(RefundTransactionMethod.CASH);
                        rt.setStatus(RefundTransactionStatus.COMPLETED);
                        rt.setCompletedAt(now);
                    }
                } else if (isCounterRefund) {
                    rt.setMethod(RefundTransactionMethod.CASH);
                    rt.setStatus(RefundTransactionStatus.COMPLETED);
                    rt.setCompletedAt(now);
                } else {
                    applyRefundMethodAndStatus(source, rt);
                }

                rt.setReason(reason);
                rt.setProcessedByStaffId(request.getProcessedByStaffId());
                if (rt.getNote() == null || rt.getNote().isBlank()) {
                    rt.setNote(buildRefundNote(source));
                }
                rt.setCreatedAt(now);
                created.add(refundTransactionRepository.save(rt));
            }
        }

        if (isCounterRefund || request.isForceImmediate()) {
            Payment refundInvoice = new Payment();
            refundInvoice.setBookingId(request.getBookingId());
            refundInvoice.setAmount(request.getAmount());
            refundInvoice.setPaidAmount(request.getAmount());
            refundInvoice.setTotalAmount(request.getAmount());
            refundInvoice.setPaymentType(PaymentType.EARLY_CHECKOUT_REFUND);
            refundInvoice.setInvoiceCategory(InvoiceCategory.REFUND);
            refundInvoice.setMethod(request.isForceImmediate() && hasOnlineRefund ? "VNPAY_REFUND" : refundMethod);
            refundInvoice.setStatus(PaymentStatus.SUCCESS);
            refundInvoice.setPaymentCode("RF-ECO-" + request.getBookingId() + "-" + System.currentTimeMillis());
            refundInvoice.setTransactionId("RT_TOTAL_" + request.getBookingId() + "_" + System.currentTimeMillis());
            refundInvoice.setCreatedAt(now);
            refundInvoice.setPaidAt(now);
            paymentRepository.save(refundInvoice);
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
            throw new IllegalStateException("No refundable payment transactions found for booking " + bookingId);
        }

        Map<Long, BigDecimal> allocatedByPaymentId = loadAllocatedSums(sourcePayments);
        List<RefundSlice> slices = new ArrayList<>();
        for (Payment source : sourcePayments) {
            if (remainingRefund.compareTo(REFUND_SLICE_MIN) < 0) break;
            BigDecimal available = refundableHeadroom(source, allocatedByPaymentId);
            if (available.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal sliceAmount = remainingRefund.min(available);
            if (sliceAmount.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal sliceScaled = sliceAmount.setScale(2, RoundingMode.HALF_UP);
            slices.add(new RefundSlice(source, sliceScaled));
            remainingRefund = remainingRefund.subtract(sliceScaled);
        }
        return slices;
    }

    private BigDecimal refundableHeadroom(Payment source, Map<Long, BigDecimal> allocatedByPaymentId) {
        BigDecimal paid = BigDecimal.valueOf(valueOrZero(source.getPaidAmount()));
        BigDecimal alreadyAllocated = allocatedByPaymentId.getOrDefault(source.getId(), BigDecimal.ZERO);
        return paid.subtract(alreadyAllocated);
    }

    private RefundAllocationPreviewDto toAllocationPreview(RefundSlice slice) {
        RefundAllocationPreviewDto dto = new RefundAllocationPreviewDto();
        dto.setAmount(slice.amount());
        RefundReceiverType rt = resolveReceiverType(slice.source());
        dto.setReceiverType(rt.name());
        dto.setReceiverName(slice.source().getPayerName());
        dto.setReceiverPhone(slice.source().getPayerPhone());
        
        if (rt == RefundReceiverType.USER) {
            dto.setReceiverUserId(slice.source().getUserId());
        } else if (rt == RefundReceiverType.REPRESENTATIVE_GUEST) {
            dto.setReceiverGuestId(slice.source().getPayerGuestId());
        }

        dto.setSourcePaymentPurpose(purposeLabelVi(slice.source().getPaymentType()));
        dto.setRefundChannel(channelLabelVi(slice.source()));
        dto.setRecipientSummaryVi(buildRecipientSummaryVi(slice.amount(), slice.source(), rt));
        return dto;
    }

    private RefundReceiverType resolveReceiverType(Payment source) {
        if (source.getUserId() != null) return RefundReceiverType.USER;
        if (source.getPayerGuestId() != null) return RefundReceiverType.REPRESENTATIVE_GUEST;
        return RefundReceiverType.WALK_IN_GUEST;
    }

    private String buildRecipientSummaryVi(BigDecimal amount, Payment source, RefundReceiverType rt) {
        java.text.NumberFormat nf = java.text.NumberFormat.getNumberInstance(new Locale("vi", "VN"));
        String money = nf.format(amount.doubleValue()) + "đ";
        String who = switch (rt) {
            case USER -> "Người đặt phòng (User #" + source.getUserId() + ")";
            case REPRESENTATIVE_GUEST -> "Khách / đại diện thanh toán (guest #" + source.getPayerGuestId() + ")";
            case WALK_IN_GUEST -> "Khách thanh toán tại quầy (không gắn User)";
        };
        if (source.getPayerName() != null && !source.getPayerName().isBlank()) {
            who += " — " + source.getPayerName();
        }
        return money + " → " + who + " · " + channelLabelVi(source) + " · Khoản: " + purposeLabelVi(source.getPaymentType());
    }

    private String channelLabelVi(Payment source) {
        String m = source.getMethod() != null ? source.getMethod().toUpperCase() : "";
        if (m.contains("VNPAY")) return "Hoàn qua VNPAY";
        if (m.contains("CASH") || "STAFF_COLLECTED".equalsIgnoreCase(m)) return "Tiền mặt — staff xác nhận đã trả khách";
        if (m.contains("BANK")) return "Chuyển khoản — staff xác nhận";
        return "Theo kênh thanh toán gốc";
    }

    private String purposeLabelVi(PaymentType paymentType) {
        if (paymentType == null) return "Không xác định";
        return switch (paymentType) {
            case DEPOSIT -> "Cọc / đặt trước";
            case FULL -> "Thanh toán 100%";
            case REMAINING, CHECKIN_REMAINING_PAYMENT -> "Thanh toán phần còn lại";
            default -> paymentType.name();
        };
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
        }
        rt.setReceiverName(source.getPayerName());
        rt.setReceiverPhone(source.getPayerPhone());
    }

    private void applyRefundMethodAndStatus(Payment source, RefundTransaction rt) {
        String m = source.getMethod() != null ? source.getMethod().toUpperCase() : "";
        if (m.contains("VNPAY")) {
            rt.setMethod(RefundTransactionMethod.VNPAY_REFUND);
            rt.setStatus(RefundTransactionStatus.PENDING_APPROVAL);
        } else if (m.contains("CASH") || "STAFF_COLLECTED".equalsIgnoreCase(m)) {
            rt.setMethod(RefundTransactionMethod.CASH);
            rt.setStatus(RefundTransactionStatus.COMPLETED); // Completed immediately at counter!
        } else if (m.contains("BANK") || m.contains("TRANSFER")) {
            rt.setMethod(RefundTransactionMethod.CASH);
            rt.setStatus(RefundTransactionStatus.COMPLETED); // Completed immediately at counter!
        } else {
            rt.setMethod(RefundTransactionMethod.ORIGINAL_PAYMENT);
            rt.setStatus(RefundTransactionStatus.PENDING_APPROVAL);
        }
    }

    private Map<Long, BigDecimal> loadAllocatedSums(List<Payment> sourcePayments) {
        List<Long> ids = sourcePayments.stream().map(Payment::getId).toList();
        List<RefundTransaction> txs = refundTransactionRepository.findByOriginalPaymentIdIn(ids);
        return txs.stream()
                .filter(t -> t.getStatus() != RefundTransactionStatus.FAILED)
                .collect(Collectors.groupingBy(
                        RefundTransaction::getOriginalPaymentId,
                        Collectors.reducing(BigDecimal.ZERO, RefundTransaction::getAmount, BigDecimal::add)
                ));
    }

    private String buildRefundNote(Payment source) {
        return "Refund tied to original payment #" + source.getId();
    }

    private String generatePaymentCode() {
        return "PAY-" + LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private Payment resolveLatestSuccessfulPayment(Long bookingId) {
        if (bookingId == null) {
            return null;
        }
        List<Payment> payments = paymentRepository.findByBookingId(bookingId);
        return payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> switch (payment.getPaymentType()) {
                    case REMAINING, CHECKIN_REMAINING_PAYMENT, FULL, DEPOSIT -> true;
                    default -> false;
                })
                .max(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private Payment resolveRefundSource(Long bookingId, String paymentTransactionId) {
        if (paymentTransactionId != null && !paymentTransactionId.isBlank()) {
            return paymentRepository.findByTransactionId(paymentTransactionId).orElse(null);
        }
        return resolveLatestSuccessfulPayment(bookingId);
    }

    private boolean isVnPayMethod(String method) {
        return method != null && method.toUpperCase().contains("VNPAY");
    }

    private String resolveRefundTransactionType(Double refundAmount, Double paidAmount) {
        if (refundAmount == null || paidAmount == null) {
            return "02";
        }
        double diff = Math.abs(paidAmount - refundAmount);
        return diff < 1 ? "02" : "03";
    }

    private String formatVnpDate(LocalDateTime dateTime) {
        LocalDateTime resolved = dateTime != null ? dateTime : nowVi();
        return resolved.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    private LocalDateTime nowVi() {
        return ZonedDateTime.now(VIETNAM_ZONE).toLocalDateTime();
    }

    private int refundPriority(PaymentType paymentType) {
        return switch (paymentType) {
            case REMAINING, CHECKIN_REMAINING_PAYMENT -> 0;
            case FULL -> 1;
            case DEPOSIT -> 2;
            default -> 3;
        };
    }

    private record RefundSlice(Payment source, BigDecimal amount) {}
}
