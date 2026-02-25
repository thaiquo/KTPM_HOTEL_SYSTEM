package iuh.fit.hotelsystem_notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";
    public static final String BOOKING_QUEUE = "notification.booking.queue";
    public static final String PAYMENT_QUEUE = "notification.payment.queue";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue bookingQueue() {
        return new Queue(BOOKING_QUEUE);
    }

    @Bean
    public Queue paymentQueue() {
        return new Queue(PAYMENT_QUEUE);
    }

    @Bean
    public Binding bookingConfirmedBinding() {
        return BindingBuilder.bind(bookingQueue())
                .to(exchange())
                .with("booking.confirmed");
    }

    @Bean
    public Binding paymentResultBinding() {
        return BindingBuilder.bind(paymentQueue())
                .to(exchange())
                .with("payment.result");
    }

    @Bean
    public JacksonJsonMessageConverter messageConverter() {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter();
        converter.setAlwaysConvertToInferredType(true);
        return converter;
    }
}