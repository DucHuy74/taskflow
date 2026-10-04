package com.xxxx.ddd.infrastructure.config.rmq;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String USERSTORY_EXCHANGE = "userstory.exchange";
    public static final String RECOMMENDATION_DLX = "recommendation.dlx";

    public static final String CREATED_ROUTING_KEY = "userstory.created";
    public static final String MOVED_ROUTING_KEY = "userstory.moved";
    public static final String REBUILD_ROUTING_KEY = "graph.rebuild";
    public static final String RECOMMENDATION_STATUS_ROUTING_KEY = "recommendation.job-status";
    public static final String RECOMMENDATION_CANDIDATES_ROUTING_KEY = "recommendation.candidates";

    public static final String CREATED_QUEUE = "userstory.created.queue";
    public static final String MOVED_QUEUE = "userstory.moved.queue";
    public static final String REBUILD_QUEUE = "graph.rebuild.queue";
    public static final String RECOMMENDATION_STATUS_QUEUE = "recommendation.job-status.spring.queue";
    public static final String RECOMMENDATION_CANDIDATES_QUEUE = "recommendation.candidates.spring.queue";
    public static final String RECOMMENDATION_STATUS_DLQ = "recommendation.job-status.spring.dlq";
    public static final String RECOMMENDATION_CANDIDATES_DLQ = "recommendation.candidates.spring.dlq";

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
    public DirectExchange recommendationDeadLetterExchange() {
        return new DirectExchange(RECOMMENDATION_DLX);
    }

    @Bean
    public Queue recommendationStatusQueue() {
        return QueueBuilder.durable(RECOMMENDATION_STATUS_QUEUE)
                .deadLetterExchange(RECOMMENDATION_DLX)
                .deadLetterRoutingKey(RECOMMENDATION_STATUS_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue recommendationCandidatesQueue() {
        return QueueBuilder.durable(RECOMMENDATION_CANDIDATES_QUEUE)
                .deadLetterExchange(RECOMMENDATION_DLX)
                .deadLetterRoutingKey(RECOMMENDATION_CANDIDATES_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue recommendationStatusDeadLetterQueue() {
        return QueueBuilder.durable(RECOMMENDATION_STATUS_DLQ).build();
    }

    @Bean
    public Queue recommendationCandidatesDeadLetterQueue() {
        return QueueBuilder.durable(RECOMMENDATION_CANDIDATES_DLQ).build();
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

    @Bean
    public Binding recommendationStatusBinding(
            @Qualifier("recommendationStatusQueue") Queue queue,
            @Qualifier("userStoryExchange") DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(RECOMMENDATION_STATUS_ROUTING_KEY);
    }

    @Bean
    public Binding recommendationCandidatesBinding(
            @Qualifier("recommendationCandidatesQueue") Queue queue,
            @Qualifier("userStoryExchange") DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(RECOMMENDATION_CANDIDATES_ROUTING_KEY);
    }

    @Bean
    public Binding recommendationStatusDeadLetterBinding(
            @Qualifier("recommendationStatusDeadLetterQueue") Queue queue,
            @Qualifier("recommendationDeadLetterExchange") DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(RECOMMENDATION_STATUS_ROUTING_KEY);
    }

    @Bean
    public Binding recommendationCandidatesDeadLetterBinding(
            @Qualifier("recommendationCandidatesDeadLetterQueue") Queue queue,
            @Qualifier("recommendationDeadLetterExchange") DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(RECOMMENDATION_CANDIDATES_ROUTING_KEY);
    }
}
