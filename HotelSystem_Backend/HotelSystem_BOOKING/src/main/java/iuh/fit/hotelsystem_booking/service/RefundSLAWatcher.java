package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class RefundSLAWatcher {

    private static final Logger log = LoggerFactory.getLogger(RefundSLAWatcher.class);
    private static final long OVERDUE_CHECK_DELAY_MS = BookingConstants.REFUND_OVERDUE_CHECK_INTERVAL_MINUTES * 60L * 1000L;
    private static final List<RefundStatus> SLA_ACTIVE_STATUSES = List.of(
            RefundStatus.PENDING,
            RefundStatus.ASSIGNED,
            RefundStatus.PROCESSING,
            RefundStatus.APPROVED
    );

    private final RefundTransactionRepository refundRepository;
    private final RefundQueueProducer refundQueueProducer;

    public RefundSLAWatcher(RefundTransactionRepository refundRepository,
                            RefundQueueProducer refundQueueProducer) {
        this.refundRepository = refundRepository;
        this.refundQueueProducer = refundQueueProducer;
    }

    @Scheduled(fixedDelay = OVERDUE_CHECK_DELAY_MS)
    @Transactional
    public void markOverdueRefunds() {
        List<RefundTransaction> overdue = refundRepository.findByStatusInAndDueAtBefore(
                SLA_ACTIVE_STATUSES,
                LocalDateTime.now());

        for (RefundTransaction refund : overdue) {
            refund.setStatus(RefundStatus.OVERDUE);
            refund.setPriority(BookingConstants.REFUND_PRIORITY_HIGH);
            refund.setUpdatedAt(LocalDateTime.now());
            RefundTransaction saved = refundRepository.save(refund);
            refundQueueProducer.publishOverdue(saved);
            log.warn("Refund request is overdue. refundId={}, bookingId={}, dueAt={}",
                    saved.getId(), saved.getBookingId(), saved.getDueAt());
        }
    }
}
