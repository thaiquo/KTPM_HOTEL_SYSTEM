package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.PaymentResult;
import iuh.fit.hotelsystem_payment.dto.InvoiceSummaryResponse;
import iuh.fit.hotelsystem_payment.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_payment.dto.OperationalPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.RefundPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.EarlyCheckoutRefundRequest;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
//@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;


    public PaymentService(PaymentRepository paymentRepository, RabbitTemplate rabbitTemplate) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
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

    public Payment createEarlyCheckoutRefund(EarlyCheckoutRefundRequest request) {
        double remainingRefund = valueOrZero(request.getAmount());
        if (remainingRefund <= 0.0) {
            throw new IllegalArgumentException("Refund amount must be greater than zero");
        }

        List<Payment> sourcePayments = paymentRepository.findByBookingId(request.getBookingId()).stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .filter(payment -> payment.getPaymentType() == PaymentType.REMAINING
                        || payment.getPaymentType() == PaymentType.FULL
                        || payment.getPaymentType() == PaymentType.DEPOSIT)
                .sorted(Comparator
                        .comparingInt((Payment payment) -> refundPriority(payment.getPaymentType()))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<Payment> refunds = new ArrayList<>();
        for (Payment source : sourcePayments) {
            if (remainingRefund <= 0.01) {
                break;
            }
            double sourcePaid = source.getPaidAmount() != null ? source.getPaidAmount() : valueOrZero(source.getAmount());
            double amount = Math.min(remainingRefund, sourcePaid);
            if (amount <= 0.0) {
                continue;
            }
            Payment refund = new Payment();
            refund.setBookingId(request.getBookingId());
            refund.setUserId(source.getUserId());
            refund.setPayerGuestId(source.getPayerGuestId());
            refund.setPayerName(source.getPayerName());
            refund.setPayerPhone(source.getPayerPhone());
            refund.setAmount(amount);
            refund.setTotalAmount(amount);
            refund.setPaidAmount(0.0);
            refund.setPaymentType(PaymentType.REFUND);
            refund.setMethod("REFUND_TO_" + source.getPaymentType().name());
            refund.setStatus(PaymentStatus.PENDING);
            refund.setTransactionId("early_refund_" + request.getBookingId()
                    + "_" + source.getTransactionId() + "_" + UUID.randomUUID());
            refund.setCreatedAt(LocalDateTime.now());
            refunds.add(paymentRepository.save(refund));
            remainingRefund -= amount;
        }

        if (refunds.isEmpty()) {
            Payment fallback = new Payment();
            fallback.setBookingId(request.getBookingId());
            fallback.setUserId(request.getUserId());
            fallback.setAmount(request.getAmount());
            fallback.setTotalAmount(request.getAmount());
            fallback.setPaidAmount(0.0);
            fallback.setPaymentType(PaymentType.REFUND);
            fallback.setMethod("REFUND");
            fallback.setStatus(PaymentStatus.PENDING);
            fallback.setTransactionId("early_refund_" + request.getBookingId() + "_" + UUID.randomUUID());
            fallback.setCreatedAt(LocalDateTime.now());
            return paymentRepository.save(fallback);
        }
        return refunds.get(0);
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

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    private int refundPriority(PaymentType paymentType) {
        if (paymentType == PaymentType.REMAINING) return 0;
        if (paymentType == PaymentType.FULL) return 1;
        if (paymentType == PaymentType.DEPOSIT) return 2;
        return 3;
    }
}
