package iuh.fit.hotelsystem_payment.service;

import iuh.fit.hotelsystem_payment.dto.EarlyCheckoutRefundRequest;
import iuh.fit.hotelsystem_payment.entity.Payment;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.entity.RefundReceiverType;
import iuh.fit.hotelsystem_payment.entity.RefundReason;
import iuh.fit.hotelsystem_payment.entity.RefundTransaction;
import iuh.fit.hotelsystem_payment.entity.RefundTransactionMethod;
import iuh.fit.hotelsystem_payment.entity.RefundTransactionStatus;
import iuh.fit.hotelsystem_payment.repository.PaymentRepository;
import iuh.fit.hotelsystem_payment.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_payment.socket.PaymentSocketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentServiceEarlyCheckoutRefundTest {

    private PaymentRepository paymentRepository;
    private RefundTransactionRepository refundTransactionRepository;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        refundTransactionRepository = mock(RefundTransactionRepository.class);
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        PaymentSocketService socketService = mock(PaymentSocketService.class);
        paymentService = new PaymentService(paymentRepository, refundTransactionRepository, rabbitTemplate, socketService);
        when(refundTransactionRepository.save(any(RefundTransaction.class))).thenAnswer(inv -> {
            RefundTransaction rt = inv.getArgument(0);
            if (rt.getId() == null) {
                rt.setId(System.nanoTime());
            }
            return rt;
        });
    }

    @Test
    void depositsAndRemaining_sameUser_refundAllToA() {
        List<Payment> payments = new ArrayList<>();
        payments.add(deposit(1L, 10L, 7_000_000.0, "VNPAY"));
        payments.add(remaining(2L, 10L, 7_000_000.0, "CASH"));
        when(paymentRepository.findByBookingId(99L)).thenReturn(payments);

        EarlyCheckoutRefundRequest req = new EarlyCheckoutRefundRequest();
        req.setBookingId(99L);
        req.setAmount(9_600_000.0);
        req.setReason("EARLY_CHECKOUT");
        req.setProcessedByStaffId(5L);

        List<RefundTransaction> out = paymentService.createEarlyCheckoutRefund(req);
        assertEquals(2, out.size());

        ArgumentCaptor<RefundTransaction> captor = ArgumentCaptor.forClass(RefundTransaction.class);
        verify(refundTransactionRepository, times(2)).save(captor.capture());
        List<RefundTransaction> saved = captor.getAllValues();

        RefundTransaction first = saved.stream().filter(r -> r.getOriginalPaymentId().equals(2L)).findFirst().orElseThrow();
        assertEquals(new BigDecimal("7000000.00"), first.getAmount());
        assertEquals(RefundReceiverType.USER, first.getReceiverType());
        assertEquals(10L, first.getReceiverId());
        assertEquals(RefundTransactionMethod.CASH, first.getMethod());
        assertEquals(RefundTransactionStatus.COMPLETED, first.getStatus());

        RefundTransaction second = saved.stream().filter(r -> r.getOriginalPaymentId().equals(1L)).findFirst().orElseThrow();
        assertEquals(new BigDecimal("2600000.00"), second.getAmount());
        assertEquals(RefundTransactionMethod.VNPAY_REFUND, second.getMethod());
        assertEquals(RefundTransactionStatus.PENDING_APPROVAL, second.getStatus());
        assertEquals(RefundReason.EARLY_CHECKOUT, second.getReason());
        assertEquals(5L, second.getProcessedByStaffId());
    }

    @Test
    void vnpayRefund_doesNotRequireCardFields_onlyPendingApproval() {
        List<Payment> payments = List.of(deposit(1L, 20L, 5_000_000.0, "VNPAY"));
        when(paymentRepository.findByBookingId(1L)).thenReturn(payments);

        EarlyCheckoutRefundRequest req = new EarlyCheckoutRefundRequest();
        req.setBookingId(1L);
        req.setAmount(1_000_000.0);

        RefundTransaction rt = paymentService.createEarlyCheckoutRefund(req).get(0);
        assertEquals(RefundTransactionMethod.VNPAY_REFUND, rt.getMethod());
        assertEquals(RefundTransactionStatus.PENDING_APPROVAL, rt.getStatus());
    }

    @Test
    void cashRefund_startsCompletedForImmediateCounterHandout() {
        List<Payment> payments = List.of(remaining(3L, null, 2_000_000.0, "CASH"));
        payments.get(0).setPayerName("Guest B");
        payments.get(0).setPayerPhone("0909111222");
        when(paymentRepository.findByBookingId(1L)).thenReturn(payments);

        EarlyCheckoutRefundRequest req = new EarlyCheckoutRefundRequest();
        req.setBookingId(1L);
        req.setAmount(2_000_000.0);

        RefundTransaction rt = paymentService.createEarlyCheckoutRefund(req).get(0);
        assertEquals(RefundTransactionMethod.CASH, rt.getMethod());
        assertEquals(RefundTransactionStatus.COMPLETED, rt.getStatus());
        assertEquals(RefundReceiverType.WALK_IN_GUEST, rt.getReceiverType());
    }

    private static Payment deposit(Long id, Long userId, double amount, String method) {
        Payment p = new Payment();
        p.setId(id);
        p.setUserId(userId);
        p.setPaidAmount(amount);
        p.setAmount(amount);
        p.setPaymentType(PaymentType.DEPOSIT);
        p.setStatus(PaymentStatus.SUCCESS);
        p.setMethod(method);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }

    private static Payment remaining(Long id, Long userId, double amount, String method) {
        Payment p = new Payment();
        p.setId(id);
        p.setUserId(userId);
        p.setPaidAmount(amount);
        p.setAmount(amount);
        p.setPaymentType(PaymentType.REMAINING);
        p.setStatus(PaymentStatus.SUCCESS);
        p.setMethod(method);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }
}
