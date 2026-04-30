package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.PaymentResult;
import iuh.fit.hotelsystem_payment.dto.InvoiceSummaryResponse;
import iuh.fit.hotelsystem_payment.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_payment.dto.OperationalPaymentRequest;
import iuh.fit.hotelsystem_payment.dto.RefundPaymentRequest;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.config.RabbitConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
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
}
