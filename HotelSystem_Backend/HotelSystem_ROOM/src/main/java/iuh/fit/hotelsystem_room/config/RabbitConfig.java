package iuh.fit.hotelsystem_room.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.*;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";

    public static final String ROOM_HOLD_QUEUE = "room.hold.queue";
    public static final String ROOM_CONFIRM_QUEUE = "room.confirm.queue";
    public static final String ROOM_RELEASE_QUEUE = "room.release.queue";
    public static final String ROOM_STATUS_QUEUE = "room.status.queue";
    public static final String DLX_EXCHANGE = "hotel.dlx";
    public static final String ROOM_HOLD_DLQ = "room.hold.dlq";
    public static final String ROOM_CONFIRM_DLQ = "room.confirm.dlq";
    public static final String ROOM_RELEASE_DLQ = "room.release.dlq";
    public static final String ROOM_STATUS_DLQ = "room.status.dlq";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX_EXCHANGE);
    }

    @Bean
    public Queue holdQueue() {
        return durableQueueWithDlq(ROOM_HOLD_QUEUE, "dlq.room.hold");
    }

    @Bean
    public Queue confirmQueue() {
        return durableQueueWithDlq(ROOM_CONFIRM_QUEUE, "dlq.room.confirm");
    }

    @Bean
    public Queue releaseQueue() {
        return durableQueueWithDlq(ROOM_RELEASE_QUEUE, "dlq.room.release");
    }

    @Bean
    public Queue statusQueue() {
        return durableQueueWithDlq(ROOM_STATUS_QUEUE, "dlq.room.status");
    }

    @Bean
    public Queue holdDlq() {
        return QueueBuilder.durable(ROOM_HOLD_DLQ).build();
    }

    @Bean
    public Queue confirmDlq() {
        return QueueBuilder.durable(ROOM_CONFIRM_DLQ).build();
    }

    @Bean
    public Queue releaseDlq() {
        return QueueBuilder.durable(ROOM_RELEASE_DLQ).build();
    }

    @Bean
    public Queue statusDlq() {
        return QueueBuilder.durable(ROOM_STATUS_DLQ).build();
    }

    @Bean
    public Binding holdBinding() {
        return BindingBuilder.bind(holdQueue())
                .to(exchange())
                .with("room.hold");
    }

    @Bean
    public Binding confirmBinding() {
        return BindingBuilder.bind(confirmQueue())
                .to(exchange())
                .with("room.confirm");
    }

    @Bean
    public Binding releaseBinding() {
        return BindingBuilder.bind(releaseQueue())
                .to(exchange())
                .with("room.release");
    }

    @Bean
    public Binding statusBinding() {
        return BindingBuilder.bind(statusQueue())
                .to(exchange())
                .with("room.status");
    }

    @Bean
    public Binding holdDlqBinding() {
        return BindingBuilder.bind(holdDlq()).to(deadLetterExchange()).with("dlq.room.hold");
    }

    @Bean
    public Binding confirmDlqBinding() {
        return BindingBuilder.bind(confirmDlq()).to(deadLetterExchange()).with("dlq.room.confirm");
    }

    @Bean
    public Binding releaseDlqBinding() {
        return BindingBuilder.bind(releaseDlq()).to(deadLetterExchange()).with("dlq.room.release");
    }

    @Bean
    public Binding statusDlqBinding() {
        return BindingBuilder.bind(statusDlq()).to(deadLetterExchange()).with("dlq.room.status");
    }

    private Queue durableQueueWithDlq(String queueName, String dlqRoutingKey) {
        return QueueBuilder.durable(queueName)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", dlqRoutingKey)
                .build();
    }
    @Bean
    public Jackson2JsonMessageConverter jsonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
