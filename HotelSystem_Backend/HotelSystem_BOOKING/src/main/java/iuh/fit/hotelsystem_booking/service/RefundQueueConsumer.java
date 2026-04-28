package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.RefundTaskEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class RefundQueueConsumer {

    private static final Logger log = LoggerFactory.getLogger(RefundQueueConsumer.class);

    private final RefundAssignmentService assignmentService;

    public RefundQueueConsumer(RefundAssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @RabbitListener(queues = RabbitConfig.REFUND_REQUESTED_QUEUE)
    public void consumeRefundRequested(RefundTaskEvent event) {
        log.info("Consume REFUND_REQUESTED. refundId={}", event.getRefundRequestId());
        RefundAssignmentService.AssignmentResult result = assignmentService.assignRefund(event.getRefundRequestId());
        if (result.retry()) {
            assignmentService.retryLater(event);
        }
    }
}
