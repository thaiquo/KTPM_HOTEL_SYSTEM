package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.RefundTaskEvent;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class RefundQueueProducer {

    private static final Logger log = LoggerFactory.getLogger(RefundQueueProducer.class);

    private final RabbitTemplate rabbitTemplate;

    public RefundQueueProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishRequested(RefundTransaction refund) {
        RefundTaskEvent event = toEvent(refund);
        rabbitTemplate.convertAndSend(RabbitConfig.REFUND_EXCHANGE, RabbitConfig.REFUND_REQUESTED_ROUTING_KEY, event);
        log.info("Published REFUND_REQUESTED. refundId={}, bookingId={}", refund.getId(), refund.getBookingId());
    }

    public void publishRetry(RefundTaskEvent event) {
        rabbitTemplate.convertAndSend(RabbitConfig.REFUND_EXCHANGE, RabbitConfig.REFUND_RETRY_ROUTING_KEY, event);
        log.info("Scheduled refund assignment retry. refundId={}", event.getRefundRequestId());
    }

    public void publishAssigned(RefundTransaction refund) {
        RefundTaskEvent event = toEvent(refund);
        event.setAssignedTo(refund.getAssignedTo());
        rabbitTemplate.convertAndSend(RabbitConfig.REFUND_EXCHANGE, RabbitConfig.REFUND_ASSIGNED_ROUTING_KEY, event);
        log.info("Published REFUND_ASSIGNED. refundId={}, staffId={}", refund.getId(), refund.getAssignedTo());
    }

    public void publishOverdue(RefundTransaction refund) {
        rabbitTemplate.convertAndSend(RabbitConfig.REFUND_EXCHANGE, RabbitConfig.REFUND_OVERDUE_ROUTING_KEY, toEvent(refund));
        log.warn("Published REFUND_OVERDUE. refundId={}, dueAt={}", refund.getId(), refund.getDueAt());
    }

    public void publishFailed(RefundTransaction refund) {
        rabbitTemplate.convertAndSend(RabbitConfig.REFUND_EXCHANGE, RabbitConfig.REFUND_FAILED_ROUTING_KEY, toEvent(refund));
        log.warn("Published REFUND_FAILED. refundId={}", refund.getId());
    }

    private RefundTaskEvent toEvent(RefundTransaction refund) {
        return new RefundTaskEvent(
                refund.getId(),
                refund.getBookingId(),
                refund.getRefundAmount(),
                refund.getPriority(),
                refund.getCreatedAt(),
                refund.getDueAt());
    }
}
