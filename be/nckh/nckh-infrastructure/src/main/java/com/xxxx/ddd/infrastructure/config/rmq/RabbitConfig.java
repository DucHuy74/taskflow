package com.xxxx.ddd.infrastructure.config.rmq;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    public static final String QUEUE = "userstory.created.queue";
    public static final String EXCHANGE = "userstory.exchange";
    public static final String ROUTING_KEY = "userstory.created";

    public static final String REBUILD_ROUTING_KEY = "graph.rebuild";
    public static final String REBUILD_QUEUE = "graph.rebuild.queue";

    @Bean
    public Queue queue() {
        return new Queue(QUEUE, true);
    }

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    public Binding binding() {
        return BindingBuilder
                .bind(queue())
                .to(exchange())
                .with(ROUTING_KEY);
    }

    @Bean
    public Queue rebuildQueue() {
        return new Queue(REBUILD_QUEUE, true);
    }

    @Bean
    public Binding rebuildBinding() {
        return BindingBuilder
                .bind(rebuildQueue())
                .to(exchange())
                .with(REBUILD_ROUTING_KEY);
    }
}
