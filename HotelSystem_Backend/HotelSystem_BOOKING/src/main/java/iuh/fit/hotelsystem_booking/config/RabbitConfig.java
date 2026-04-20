package iuh.fit.hotelsystem_booking.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";

    // QUEUES
    public static final String ROOM_HELD_QUEUE = "room.held.queue";
    public static final String PAYMENT_RESULT_QUEUE = "payment.result.queue";

    // ROUTING KEYS
    public static final String ROOM_HELD_ROUTING_KEY = "room.held";
    public static final String PAYMENT_RESULT_ROUTING_KEY = "payment.result";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    // -------------------------
    // ROOM HELD
    // -------------------------
    @Bean
    public Queue roomHeldQueue() {
        return new Queue(ROOM_HELD_QUEUE);
    }

    @Bean
    public Binding roomHeldBinding() {
        return BindingBuilder
                .bind(roomHeldQueue())
                .to(exchange())
                .with(ROOM_HELD_ROUTING_KEY);
    }

    // -------------------------
    // PAYMENT RESULT
    // -------------------------
    @Bean
    public Queue paymentResultQueue() {
        return new Queue(PAYMENT_RESULT_QUEUE);
    }

    @Bean
    public Binding paymentResultBinding() {
        return BindingBuilder
                .bind(paymentResultQueue())
                .to(exchange())
                .with(PAYMENT_RESULT_ROUTING_KEY);
    }

    // -------------------------
    // JSON CONVERTER (QUAN TRỌNG)
    // -------------------------
    @Bean
    public JacksonJsonMessageConverter jsonMessageConverter() {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter();
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