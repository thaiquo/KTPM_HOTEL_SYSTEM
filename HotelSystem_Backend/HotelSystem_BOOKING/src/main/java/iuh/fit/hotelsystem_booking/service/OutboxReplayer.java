package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.entity.OutboxEventDlq;
import iuh.fit.hotelsystem_booking.repository.OutboxEventDlqRepository;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OutboxReplayer {

    private static final Logger log = LoggerFactory.getLogger(OutboxReplayer.class);

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final OutboxEventDlqRepository outboxEventDlqRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    private final PlatformTransactionManager transactionManager;

    @Value("${booking.outbox.max-attempts:5}")
    private int maxAttempts;

    @Value("${booking.outbox.replay-limit:50}")
    private int defaultLimit;

    public OutboxReplayer(OutboxEventRepository outboxEventRepository, OutboxEventDlqRepository outboxEventDlqRepository, RabbitTemplate rabbitTemplate, ApplicationContext applicationContext, PlatformTransactionManager transactionManager) {
        this.outboxEventRepository = outboxEventRepository;
        this.outboxEventDlqRepository = outboxEventDlqRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = new ObjectMapper();
        this.applicationContext = applicationContext;
        this.transactionManager = transactionManager;
    }

    @Transactional
    public int replay(int limit) {
        List<OutboxEvent> pending = outboxEventRepository.lockUnprocessed();
        if (pending == null || pending.isEmpty()) return 0;

        int processed = 0;
        for (OutboxEvent e : pending) {
            if (processed >= limit) break;
            try {
                Object payload = objectMapper.readValue(e.getPayload(), Object.class);
                String exchange = (e.getType() != null && e.getType().startsWith("refund."))
                        ? RabbitConfig.REFUND_EXCHANGE
                        : RabbitConfig.EXCHANGE;

                rabbitTemplate.convertAndSend(exchange, e.getType(), payload, m -> {
                    if (e.getHeaders() != null) {
                        e.getHeaders().forEach((k, v) -> m.getMessageProperties().setHeader(k, v));
                    }
                    return m;
                });

                e.setProcessed(true);
                e.setProcessedAt(LocalDateTime.now());
                e.setLastError(null);
                outboxEventRepository.save(e);
                processed++;
            } catch (Exception ex) {
                int attempts = e.getAttempts() + 1;
                e.setAttempts(attempts);
                String msg = ex.getMessage() == null ? ex.toString() : ex.getMessage();
                e.setLastError(msg);
                if (attempts >= maxAttempts) {
                    log.error("Outbox event id={} reached max attempts ({}). Moving to DLQ.", e.getId(), attempts);
                    try {
                        OutboxEventDlq dlq = new OutboxEventDlq();
                        dlq.setAggregateType(e.getAggregateType());
                        dlq.setAggregateId(e.getAggregateId());
                        dlq.setType(e.getType());
                        dlq.setPayload(e.getPayload());
                        dlq.setHeaders(e.getHeaders());
                        dlq.setOccurredAt(e.getOccurredAt());
                        dlq.setAttempts(attempts);
                        dlq.setLastError(msg);
                        // save to DLQ via injected repository
                        outboxEventDlqRepository.save(dlq);
                        outboxEventRepository.delete(e);
                    } catch (Exception ex2) {
                        log.error("Failed to move outbox event id={} to DLQ: {}", e.getId(), ex2.getMessage());
                    }
                } else {
                    log.warn("Failed to replay outbox event id={}. attempts={}. Will retry later: {}", e.getId(), attempts, msg);
                    outboxEventRepository.save(e);
                }
            }
        }
        return processed;
    }

    @Scheduled(fixedDelayString = "${booking.outbox.replay-delay-ms:60000}")
    public void scheduledReplay() {
        try {
            OutboxReplayer proxy = applicationContext.getBean(OutboxReplayer.class);
            int replayed = proxy.replay(defaultLimit);
            if (replayed > 0) log.info("Scheduled outbox replayer published {} events", replayed);
        } catch (Exception ex) {
            log.warn("Scheduled outbox replayer error: {}", ex.getMessage());
        }
    }
}
