package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.RefundStaff;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundStaffRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefundAssignmentServiceTest {

    @Test
    void availableStaffIsAssigned() {
        TestFixture fixture = fixture(refund(1L, RefundStatus.PENDING), List.of(staff(10L)));
        when(fixture.refundRepository.countByAssignedToAndStatusIn(eq(10L), any())).thenReturn(0L);
        when(fixture.refundRepository.countByAssignedToAndStatus(eq(10L), eq(RefundStatus.OVERDUE))).thenReturn(0L);

        RefundAssignmentService.AssignmentResult result = fixture.assignmentService.assignRefund(1L);

        assertTrue(result.assigned());
        assertEquals(RefundStatus.ASSIGNED, result.refund().getStatus());
        assertEquals(10L, result.refund().getAssignedTo());
        verify(fixture.producer).publishAssigned(any(RefundTransaction.class));
    }

    @Test
    void staffAtMaxWorkloadIsNotAssignedAndRetries() {
        TestFixture fixture = fixture(refund(1L, RefundStatus.PENDING), List.of(staff(10L)));
        when(fixture.refundRepository.countByAssignedToAndStatusIn(eq(10L), any())).thenReturn(5L);

        RefundAssignmentService.AssignmentResult result = fixture.assignmentService.assignRefund(1L);

        assertFalse(result.assigned());
        assertTrue(result.retry());
        assertEquals(RefundStatus.PENDING, result.refund().getStatus());
        verify(fixture.producer, never()).publishAssigned(any());
    }

    @Test
    void noOnlineStaffKeepsPendingForRetry() {
        TestFixture fixture = fixture(refund(1L, RefundStatus.PENDING), List.of());

        RefundAssignmentService.AssignmentResult result = fixture.assignmentService.assignRefund(1L);

        assertFalse(result.assigned());
        assertTrue(result.retry());
        assertEquals(RefundStatus.PENDING, result.refund().getStatus());
    }

    @Test
    void duplicateConsumeDoesNotReassign() {
        RefundTransaction refund = refund(1L, RefundStatus.ASSIGNED);
        refund.setAssignedTo(10L);
        TestFixture fixture = fixture(refund, List.of(staff(11L)));

        RefundAssignmentService.AssignmentResult result = fixture.assignmentService.assignRefund(1L);

        assertFalse(result.assigned());
        assertFalse(result.retry());
        assertEquals(10L, result.refund().getAssignedTo());
        verify(fixture.producer, never()).publishAssigned(any());
    }

    private TestFixture fixture(RefundTransaction refund, List<RefundStaff> staffList) {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        RefundStaffRepository staffRepository = mock(RefundStaffRepository.class);
        RefundQueueProducer producer = mock(RefundQueueProducer.class);

        when(refundRepository.findByIdForUpdate(refund.getId())).thenReturn(Optional.of(refund));
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(staffRepository.findByActiveTrueAndOnlineTrueAndRole("REFUND_STAFF")).thenReturn(staffList);

        StaffWorkloadService workloadService = new StaffWorkloadService(staffRepository, refundRepository);
        RefundAssignmentService assignmentService = new RefundAssignmentService(
                refundRepository,
                workloadService,
                producer,
            mock(RefundAuditService.class),
            mock(iuh.fit.hotelsystem_booking.client.UserServiceClient.class));
        return new TestFixture(refundRepository, producer, assignmentService);
    }

    private RefundTransaction refund(Long id, RefundStatus status) {
        RefundTransaction refund = new RefundTransaction();
        refund.setId(id);
        refund.setStatus(status);
        return refund;
    }

    private RefundStaff staff(Long id) {
        RefundStaff staff = new RefundStaff();
        staff.setId(id);
        staff.setRole("REFUND_STAFF");
        staff.setActive(true);
        staff.setOnline(true);
        staff.setShiftStart(LocalTime.MIN);
        staff.setShiftEnd(LocalTime.MAX);
        return staff;
    }

    private record TestFixture(RefundTransactionRepository refundRepository,
                               RefundQueueProducer producer,
                               RefundAssignmentService assignmentService) {
    }
}
