package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundAuditLogRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefundServiceTest {

    @Test
    void createRefundRequestIsIdempotentByBookingId() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        PaymentGateway paymentGateway = mock(PaymentGateway.class);
        RefundQueueProducer refundQueueProducer = mock(RefundQueueProducer.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                paymentGateway,
                refundQueueProducer,
                mock(RefundPaymentTransactionRepository.class),
                new RefundAuditService(mock(RefundAuditLogRepository.class)),
                mock(RefundNotificationService.class));

        Booking booking = new Booking();
        booking.setId(10L);
        booking.setPaymentTransactionId("vnpay_10");

        CancellationPolicyResult policy = new CancellationPolicyResult();
        policy.setPaidAmount(1000000);
        policy.setCancellationFee(500000);
        policy.setRefundAmount(500000);
        policy.setReason("Late cancel: charge one night");

        RefundTransaction existing = new RefundTransaction();
        existing.setId(1L);
        existing.setBookingId(10L);
        existing.setIdempotencyKey("refund_10");
        existing.setStatus(RefundStatus.PENDING);

        when(refundRepository.findByIdempotencyKey("refund_10")).thenReturn(Optional.of(existing));

        RefundTransaction result = refundService.createRefundTransaction(booking, policy);

        assertSame(existing, result);
        verify(refundRepository, never()).save(any());
    }

    @Test
    void createRefundCreatesAuditNotificationAndQueueEvent() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        PaymentGateway paymentGateway = mock(PaymentGateway.class);
        RefundQueueProducer refundQueueProducer = mock(RefundQueueProducer.class);
        RefundAuditService auditService = mock(RefundAuditService.class);
        RefundNotificationService notificationService = mock(RefundNotificationService.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                paymentGateway,
                refundQueueProducer,
                mock(RefundPaymentTransactionRepository.class),
                auditService,
                notificationService);

        Booking booking = new Booking();
        booking.setId(10L);
        booking.setUserId(20L);
        booking.setPaymentTransactionId("vnpay_10");

        CancellationPolicyResult policy = new CancellationPolicyResult();
        policy.setPaidAmount(1000000);
        policy.setCancellationFee(0);
        policy.setRefundAmount(1000000);
        policy.setReason("Free cancellation");

        when(refundRepository.findByIdempotencyKey("refund_10")).thenReturn(Optional.empty());
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> {
            RefundTransaction refund = invocation.getArgument(0);
            refund.setId(1L);
            return refund;
        });

        RefundTransaction result = refundService.createRefundTransaction(booking, policy);

        assertEquals(1L, result.getId());
        verify(auditService).log(eq(1L), eq("CREATED"), isNull(), eq(RefundStatus.PENDING), eq("20"), eq("CUSTOMER"), any());
        verify(notificationService).notifyCreated(result, booking);
        verify(refundQueueProducer).publishRequested(result);
    }

    @Test
    void approveRefundUsesGatewayAndMarksRefunded() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        PaymentGateway paymentGateway = mock(PaymentGateway.class);
        RefundQueueProducer refundQueueProducer = mock(RefundQueueProducer.class);
        RefundPaymentTransactionRepository paymentTransactionRepository = mock(RefundPaymentTransactionRepository.class);
        RefundAuditService auditService = mock(RefundAuditService.class);
        RefundNotificationService notificationService = mock(RefundNotificationService.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                paymentGateway,
                refundQueueProducer,
                paymentTransactionRepository,
                auditService,
                notificationService);

        RefundTransaction refund = new RefundTransaction();
        refund.setId(1L);
        refund.setBookingId(10L);
        refund.setPaymentTransactionId("vnpay_10");
        refund.setPaidAmount(1000000.0);
        refund.setRefundAmount(1000000.0);
        refund.setIdempotencyKey("refund_10");
        refund.setStatus(RefundStatus.PENDING);

        Booking booking = new Booking();
        booking.setId(10L);

        when(refundRepository.findById(1L)).thenReturn(Optional.of(refund));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(paymentGateway.refund("vnpay_10", 1000000.0, "refund_10"))
                .thenReturn(new PaymentGateway.GatewayRefundResult(true, "ok", "SIMULATED_10"));
        when(paymentTransactionRepository.findByRefundRequestId(1L)).thenReturn(Optional.empty());
        when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundTransaction result = refundService.approveRefund(1L, "admin");

        assertEquals(RefundStatus.REFUNDED, result.getStatus());
        assertEquals("REFUNDED", booking.getPaymentStatus());
        verify(auditService).log(eq(1L), eq("APPROVED"), eq(RefundStatus.PENDING), eq(RefundStatus.PROCESSING), eq("admin"), eq("REFUND_STAFF"), any());
        verify(auditService).log(eq(1L), eq("REFUNDED"), eq(RefundStatus.PROCESSING), eq(RefundStatus.REFUNDED), eq("admin"), eq("SYSTEM"), any());
        verify(notificationService).notifyApproved(refund);
        verify(notificationService).notifyRefunded(refund, "SIMULATED_10");
        verify(paymentTransactionRepository, atLeastOnce()).save(any(RefundPaymentTransaction.class));
    }

    @Test
    void rejectRefundWritesAuditAndNotificationWithReason() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        RefundAuditService auditService = mock(RefundAuditService.class);
        RefundNotificationService notificationService = mock(RefundNotificationService.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                mock(PaymentGateway.class),
                mock(RefundQueueProducer.class),
                mock(RefundPaymentTransactionRepository.class),
                auditService,
                notificationService);

        RefundTransaction refund = new RefundTransaction();
        refund.setId(1L);
        refund.setBookingId(10L);
        refund.setStatus(RefundStatus.PENDING);

        Booking booking = new Booking();
        booking.setId(10L);

        when(refundRepository.findById(1L)).thenReturn(Optional.of(refund));
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));

        RefundTransaction result = refundService.rejectRefund(1L, "staff1", "Invalid request");

        assertEquals(RefundStatus.REJECTED, result.getStatus());
        verify(auditService).log(eq(1L), eq("REJECTED"), eq(RefundStatus.PENDING), eq(RefundStatus.REJECTED), eq("staff1"), eq("REFUND_STAFF"), eq("Invalid request"));
        verify(notificationService).notifyRejected(refund, "Invalid request");
    }
}
