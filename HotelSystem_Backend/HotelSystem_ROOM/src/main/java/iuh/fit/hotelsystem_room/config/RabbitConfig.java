package iuh.fit.hotelsystem_room.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.*;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "hotel.exchange";

    public static final String ROOM_HOLD_QUEUE = "room.hold.queue";
    public static final String ROOM_CONFIRM_QUEUE = "room.confirm.queue";
    public static final String ROOM_RELEASE_QUEUE = "room.release.queue";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue holdQueue() {
        return new Queue(ROOM_HOLD_QUEUE);
    }

    @Bean
    public Queue confirmQueue() {
        return new Queue(ROOM_CONFIRM_QUEUE);
    }

    @Bean
    public Queue releaseQueue() {
        return new Queue(ROOM_RELEASE_QUEUE);
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
    public JacksonJsonMessageConverter jsonMessageConverter() {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter();
        converter.setAlwaysConvertToInferredType(true);
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
