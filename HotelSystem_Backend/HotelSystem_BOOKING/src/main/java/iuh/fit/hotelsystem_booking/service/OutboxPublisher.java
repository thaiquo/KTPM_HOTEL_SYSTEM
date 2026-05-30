package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OutboxPublisher(OutboxEventRepository outboxEventRepository, RabbitTemplate rabbitTemplate) {
        this.outboxEventRepository = outboxEventRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Scheduled(fixedDelayString = "${outbox.poll.ms:2000}")
    public void pollAndPublish() {
        try {
            publishPending();
        } catch (Exception ex) {
            log.warn("Outbox publisher error", ex);
        }
    }

    @Transactional
    public void publishPending() {
        List<OutboxEvent> pending = outboxEventRepository.findByProcessedFalseOrderByOccurredAtAsc();
        for (OutboxEvent e : pending) {
            try {
                // simple routing: use type as routing key and exchange from RabbitConfig
                String routingKey = e.getType();
                // if headers present, attempt to propagate them
                if (e.getHeaders() != null && !e.getHeaders().isBlank()) {
                    try {
                        java.util.Map<String, Object> headers = objectMapper.readValue(e.getHeaders(), java.util.Map.class);
                        org.springframework.amqp.core.MessagePostProcessor mpp = msg -> {
                            org.springframework.amqp.core.MessageProperties props = msg.getMessageProperties();
                            headers.forEach((k, v) -> props.setHeader(k, v));
                            return msg;
                        };
                        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, routingKey, e.getPayload(), mpp);
                    } catch (Exception ex) {
                        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, routingKey, e.getPayload());
                    }
                } else {
                    rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, routingKey, e.getPayload());
                }
                e.setProcessed(true);
                e.setProcessedAt(LocalDateTime.now());
                outboxEventRepository.save(e);
            } catch (Exception ex) {
                log.warn("Could not publish outbox event id={}", e.getId(), ex);
            }
        }
    }
}
