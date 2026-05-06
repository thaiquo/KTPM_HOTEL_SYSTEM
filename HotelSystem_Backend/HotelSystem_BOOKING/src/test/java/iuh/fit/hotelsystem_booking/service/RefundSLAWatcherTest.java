package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class RefundSLAWatcherTest {

    @Test
    void overdueRefundIsMarkedHighPriorityAndPublished() {
        RefundTransactionRepository refundRepository = mock(RefundTransactionRepository.class);
        RefundQueueProducer producer = mock(RefundQueueProducer.class);
        RefundSLAWatcher watcher = new RefundSLAWatcher(refundRepository, producer);

        RefundTransaction refund = new RefundTransaction();
        refund.setId(1L);
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setDueAt(LocalDateTime.now().minusMinutes(1));

        when(refundRepository.findByStatusInAndDueAtBefore(anyList(), any(LocalDateTime.class)))
                .thenReturn(List.of(refund));
        when(refundRepository.save(any(RefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        watcher.markOverdueRefunds();

        assertEquals(RefundStatus.OVERDUE, refund.getStatus());
        assertEquals("HIGH", refund.getPriority());
        verify(producer).publishOverdue(refund);
    }
}
