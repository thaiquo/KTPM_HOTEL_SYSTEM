package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundPaymentTransaction;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundAuditLogRepository;
import iuh.fit.hotelsystem_booking.repository.RefundPaymentTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

class RefundServiceTest {

    @Test
    void createAssignedEarlyCheckoutRefundIsIdempotentByBookingRoomBatch() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        RefundQueueProducer refundQueueProducer = mock(RefundQueueProducer.class);
        RefundAuditService auditService = mock(RefundAuditService.class);
        RefundNotificationService notificationService = mock(RefundNotificationService.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                mock(CancellationPolicyService.class),
                mock(PaymentGateway.class),
                refundQueueProducer,
                mock(RefundPaymentTransactionRepository.class),
                auditService,
                notificationService,
                mock(PaymentServiceClient.class));

        Booking booking = new Booking();
        booking.setId(10L);
        booking.setUserId(20L);
        booking.setPaidAmount(2_000_000.0);

        when(refundRepository.findByIdempotencyKey("refund_early_checkout_10_rooms_1-2"))
                .thenReturn(Optional.empty());
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        refundService.createAssignedEarlyCheckoutRefundTransaction(
                booking,
                BigDecimal.valueOf(640_000),
                2L,
                List.of(2L, 1L, 1L));

        ArgumentCaptor<RefundTransaction> captor = ArgumentCaptor.forClass(RefundTransaction.class);
        verify(refundRepository).save(captor.capture());
        assertEquals("refund_early_checkout_10_rooms_1-2", captor.getValue().getIdempotencyKey());
        assertEquals(640_000.0, captor.getValue().getRefundAmount());
    }

    @Test
    void createRefundRequestIsIdempotentByBookingId() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        PaymentGateway paymentGateway = mock(PaymentGateway.class);
        RefundQueueProducer refundQueueProducer = mock(RefundQueueProducer.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
            mock(CancellationPolicyService.class),
                paymentGateway,
                refundQueueProducer,
                mock(RefundPaymentTransactionRepository.class),
                new RefundAuditService(mock(RefundAuditLogRepository.class)),
            mock(RefundNotificationService.class),
            mock(iuh.fit.hotelsystem_booking.client.PaymentServiceClient.class));

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
            mock(CancellationPolicyService.class),
                paymentGateway,
                refundQueueProducer,
                mock(RefundPaymentTransactionRepository.class),
                auditService,
            notificationService,
            mock(iuh.fit.hotelsystem_booking.client.PaymentServiceClient.class));

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
            mock(CancellationPolicyService.class),
                paymentGateway,
                refundQueueProducer,
                paymentTransactionRepository,
                auditService,
            notificationService,
            mock(iuh.fit.hotelsystem_booking.client.PaymentServiceClient.class));

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
    void approveRefundByStaffUsesPaymentServiceAndMarksRefunded() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        PaymentServiceClient paymentServiceClient = mock(PaymentServiceClient.class);
        RefundAuditService auditService = mock(RefundAuditService.class);
        RefundNotificationService notificationService = mock(RefundNotificationService.class);
        RefundService refundService = new RefundService(
                refundRepository,
                bookingRepository,
                mock(CancellationPolicyService.class),
                mock(PaymentGateway.class),
                mock(RefundQueueProducer.class),
                mock(RefundPaymentTransactionRepository.class),
                auditService,
                notificationService,
                paymentServiceClient);

        RefundTransaction refund = new RefundTransaction();
        refund.setId(5L);
        refund.setBookingId(37L);
        refund.setRefundAmount(3_000_000.0);
        refund.setPaymentTransactionId("37_02e52914cac0");
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setAssignedTo(2L);

        Booking booking = new Booking();
        booking.setId(37L);
        booking.setStatus(BookingStatus.CANCELLED);

        when(refundRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(refund));
        when(bookingRepository.findById(37L)).thenReturn(Optional.of(booking));
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentServiceClient.processRefund(eq(5L),anyString(), any())).thenReturn(Map.of("status", "SUCCESS"));

        RefundTransaction result = refundService.approveRefundByStaff(5L, 2L);

        assertEquals(RefundStatus.REFUNDED, result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(paymentServiceClient).processRefund(eq(5L),anyString(), any());
        verify(auditService).log(eq(5L), eq("APPROVED"), eq(RefundStatus.ASSIGNED), eq(RefundStatus.PROCESSING), eq("2"), eq("REFUND_STAFF"), any());
        verify(auditService).log(eq(5L), eq("REFUNDED"), eq(RefundStatus.PROCESSING), eq(RefundStatus.REFUNDED), eq("2"), eq("SYSTEM"), any());
        verify(notificationService).notifyApproved(refund);
        verify(notificationService).notifyRefunded(refund, "PAYMENT_SERVICE");
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
            mock(CancellationPolicyService.class),
                mock(PaymentGateway.class),
                mock(RefundQueueProducer.class),
                mock(RefundPaymentTransactionRepository.class),
                auditService,
            notificationService,
            mock(iuh.fit.hotelsystem_booking.client.PaymentServiceClient.class));

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
