package com.xxxx.ddd.infrastructure.config.rmq;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String USERSTORY_EXCHANGE = "userstory.exchange";

    public static final String CREATED_ROUTING_KEY = "userstory.created";
    public static final String MOVED_ROUTING_KEY = "userstory.moved";
    public static final String REBUILD_ROUTING_KEY = "graph.rebuild";

    public static final String CREATED_QUEUE = "userstory.created.queue";
    public static final String MOVED_QUEUE = "userstory.moved.queue";
    public static final String REBUILD_QUEUE = "graph.rebuild.queue";

    @Bean
    public DirectExchange userStoryExchange() {
        return new DirectExchange(USERSTORY_EXCHANGE);
    }

    @Bean
    public Queue createdQueue() {
        return QueueBuilder.durable(CREATED_QUEUE).build();
    }

    @Bean
    public Queue movedQueue() {
        return QueueBuilder.durable(MOVED_QUEUE).build();
    }

    @Bean
    public Queue rebuildQueue() {
        return QueueBuilder.durable(REBUILD_QUEUE).build();
    }

    @Bean
    public Binding createdBinding(
            @Qualifier("createdQueue") Queue queue,
            @Qualifier("userStoryExchange") DirectExchange exchange
    ) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with(CREATED_ROUTING_KEY);
    }

    @Bean
    public Binding movedBinding(
            @Qualifier("movedQueue") Queue queue,
            @Qualifier("userStoryExchange") DirectExchange exchange
    ) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with(MOVED_ROUTING_KEY);
    }

    @Bean
    public Binding rebuildBinding(
            @Qualifier("rebuildQueue") Queue queue,
            @Qualifier("userStoryExchange") DirectExchange exchange
    ) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with(REBUILD_ROUTING_KEY);
    }
}