package iuh.fit.hotelsystem_notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";
    public static final String BOOKING_QUEUE = "notification.booking.queue";
    public static final String PAYMENT_QUEUE = "notification.payment.queue";
    public static final String REFUND_QUEUE = "notification.refund.queue";
    public static final String DLX_EXCHANGE = "hotel.dlx";
    public static final String BOOKING_DLQ = "notification.booking.dlq";
    public static final String PAYMENT_DLQ = "notification.payment.dlq";
    public static final String REFUND_DLQ = "notification.refund.dlq";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX_EXCHANGE);
    }

    @Bean
    public Queue bookingQueue() {
        return QueueBuilder.durable(BOOKING_QUEUE)
                .deadLetterExchange(DLX_EXCHANGE)
                .deadLetterRoutingKey("dlq.notification.booking")
                .build();
    }

    @Bean
    public Queue paymentQueue() {
        return QueueBuilder.durable(PAYMENT_QUEUE)
                .deadLetterExchange(DLX_EXCHANGE)
                .deadLetterRoutingKey("dlq.notification.payment")
                .build();
    }

    @Bean
    public Queue refundQueue() {
        return QueueBuilder.durable(REFUND_QUEUE)
                .deadLetterExchange(DLX_EXCHANGE)
                .deadLetterRoutingKey("dlq.notification.refund")
                .build();
    }

    @Bean
    public Queue bookingDlq() {
        return QueueBuilder.durable(BOOKING_DLQ).build();
    }

    @Bean
    public Queue paymentDlq() {
        return QueueBuilder.durable(PAYMENT_DLQ).build();
    }

    @Bean
    public Queue refundDlq() {
        return QueueBuilder.durable(REFUND_DLQ).build();
    }

    @Bean
    public Binding bookingEventBinding() {
        return BindingBuilder.bind(bookingQueue())
                .to(exchange())
                .with("booking.*");
    }

    @Bean
    public Binding paymentResultBinding() {
        return BindingBuilder.bind(paymentQueue())
                .to(exchange())
                .with("payment.result");
    }

    @Bean
    public Binding refundNotificationBinding() {
        return BindingBuilder.bind(refundQueue())
                .to(exchange())
                .with("refund.notification");
    }

    @Bean
    public Binding bookingDlqBinding() {
        return BindingBuilder.bind(bookingDlq())
                .to(deadLetterExchange())
                .with("dlq.notification.booking");
    }

    @Bean
    public Binding paymentDlqBinding() {
        return BindingBuilder.bind(paymentDlq())
                .to(deadLetterExchange())
                .with("dlq.notification.payment");
    }

    @Bean
    public Binding refundDlqBinding() {
        return BindingBuilder.bind(refundDlq())
                .to(deadLetterExchange())
                .with("dlq.notification.refund");
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        converter.setAlwaysConvertToInferredType(true);
        return converter;
    }
}
