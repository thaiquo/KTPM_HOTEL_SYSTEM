package iuh.fit.hotelsystem_booking.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";
    public static final String REFUND_EXCHANGE = "refund.exchange";
    public static final String DLX_EXCHANGE = "hotel.dlx";

    // QUEUES
    public static final String ROOM_HELD_QUEUE = "room.held.queue";
    public static final String ROOM_HELD_DLQ = "room.held.dlq";
    public static final String PAYMENT_RESULT_QUEUE = "payment.result.queue";
    public static final String PAYMENT_RESULT_DLQ = "payment.result.dlq";
    public static final String REFUND_REQUESTED_QUEUE = "refund.requested.queue";
    public static final String REFUND_ASSIGNED_QUEUE = "refund.assigned.queue";
    public static final String REFUND_OVERDUE_QUEUE = "refund.overdue.queue";
    public static final String REFUND_FAILED_QUEUE = "refund.failed.queue";
    public static final String REFUND_RETRY_QUEUE = "refund.retry.queue";

    // ROUTING KEYS
    public static final String ROOM_HELD_ROUTING_KEY = "room.held";
    public static final String PAYMENT_RESULT_ROUTING_KEY = "payment.result";
    public static final String DLQ_ROUTING_KEY_ROOM = "dlq.room.held";
    public static final String DLQ_ROUTING_KEY_PAYMENT = "dlq.payment.result";
    public static final String REFUND_REQUESTED_ROUTING_KEY = "refund.requested";
    public static final String REFUND_ASSIGNED_ROUTING_KEY = "refund.assigned";
    public static final String REFUND_OVERDUE_ROUTING_KEY = "refund.overdue";
    public static final String REFUND_FAILED_ROUTING_KEY = "refund.failed";
    public static final String REFUND_RETRY_ROUTING_KEY = "refund.retry";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public TopicExchange refundExchange() {
        return new TopicExchange(REFUND_EXCHANGE);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX_EXCHANGE);
    }

    // -------------------------
    // ROOM HELD
    // -------------------------
    @Bean
    public Queue roomHeldQueue() {
        return QueueBuilder.durable(ROOM_HELD_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", DLQ_ROUTING_KEY_ROOM)
                .build();
    }

    @Bean
    public Queue roomHeldDlq() {
        return new Queue(ROOM_HELD_DLQ);
    }

    @Bean
    public Binding roomHeldBinding() {
        return BindingBuilder
                .bind(roomHeldQueue())
                .to(exchange())
                .with(ROOM_HELD_ROUTING_KEY);
    }

    @Bean
    public Binding roomHeldDlqBinding() {
        return BindingBuilder.bind(roomHeldDlq())
                .to(deadLetterExchange())
                .with(DLQ_ROUTING_KEY_ROOM);
    }

    // -------------------------
    // PAYMENT RESULT
    // -------------------------
    @Bean
    public Queue paymentResultQueue() {
        return QueueBuilder.durable(PAYMENT_RESULT_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", DLQ_ROUTING_KEY_PAYMENT)
                .build();
    }

    @Bean
    public Queue paymentResultDlq() {
        return new Queue(PAYMENT_RESULT_DLQ);
    }

    @Bean
    public Binding paymentResultBinding() {
        return BindingBuilder
                .bind(paymentResultQueue())
                .to(exchange())
                .with(PAYMENT_RESULT_ROUTING_KEY);
    }

    @Bean
    public Binding paymentResultDlqBinding() {
        return BindingBuilder.bind(paymentResultDlq())
                .to(deadLetterExchange())
                .with(DLQ_ROUTING_KEY_PAYMENT);
    }

    @Bean
    public Queue refundRequestedQueue() {
        return new Queue(REFUND_REQUESTED_QUEUE);
    }

    @Bean
    public Binding refundRequestedBinding() {
        return BindingBuilder.bind(refundRequestedQueue())
                .to(refundExchange())
                .with(REFUND_REQUESTED_ROUTING_KEY);
    }

    @Bean
    public Queue refundAssignedQueue() {
        return new Queue(REFUND_ASSIGNED_QUEUE);
    }

    @Bean
    public Binding refundAssignedBinding() {
        return BindingBuilder.bind(refundAssignedQueue())
                .to(refundExchange())
                .with(REFUND_ASSIGNED_ROUTING_KEY);
    }

    @Bean
    public Queue refundOverdueQueue() {
        return new Queue(REFUND_OVERDUE_QUEUE);
    }

    @Bean
    public Binding refundOverdueBinding() {
        return BindingBuilder.bind(refundOverdueQueue())
                .to(refundExchange())
                .with(REFUND_OVERDUE_ROUTING_KEY);
    }

    @Bean
    public Queue refundFailedQueue() {
        return new Queue(REFUND_FAILED_QUEUE);
    }

    @Bean
    public Binding refundFailedBinding() {
        return BindingBuilder.bind(refundFailedQueue())
                .to(refundExchange())
                .with(REFUND_FAILED_ROUTING_KEY);
    }

    @Bean
    public Queue refundRetryQueue() {
        return QueueBuilder.durable(REFUND_RETRY_QUEUE)
                .ttl(iuh.fit.hotelsystem_booking.constants.BookingConstants.REFUND_RETRY_DELAY_MINUTES * 60 * 1000)
                .deadLetterExchange(REFUND_EXCHANGE)
                .deadLetterRoutingKey(REFUND_REQUESTED_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding refundRetryBinding() {
        return BindingBuilder.bind(refundRetryQueue())
                .to(refundExchange())
                .with(REFUND_RETRY_ROUTING_KEY);
    }

    // -------------------------
    // JSON CONVERTER (QUAN TRỌNG)
    // -------------------------
    @Bean
    public Jackson2JsonMessageConverter jsonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        converter.setAlwaysConvertToInferredType(true); // QUAN TRỌNG
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
