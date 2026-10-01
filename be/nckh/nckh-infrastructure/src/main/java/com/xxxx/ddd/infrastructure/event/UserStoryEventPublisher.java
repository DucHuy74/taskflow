package com.xxxx.ddd.infrastructure.event;

import com.xxxx.ddd.infrastructure.config.rmq.RabbitConfig;
import com.xxxx.dddd.domain.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserStoryEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishCreated(UserStoryCreatedEvent event) {

        UserStoryCreatedMessage payload = new UserStoryCreatedMessage(
                event.id(),
                event.storyText(),
                event.workspaceId(),
                event.sprintId(),
                event.backlogId()
        );

        BaseEventMessage<UserStoryCreatedMessage> message =
                new BaseEventMessage<>("USER_STORY_CREATED","v1", payload);

        rabbitTemplate.convertAndSend(
                RabbitConfig.USERSTORY_EXCHANGE,
                RabbitConfig.CREATED_ROUTING_KEY,
                message
        );
        log.debug("Sent to exchange={}, routingKey={}", RabbitConfig.USERSTORY_EXCHANGE, RabbitConfig.CREATED_ROUTING_KEY);
    }

    public void publishMoved(UserStoryMovedEvent event) {

        UserStoryMovedMessage payload = new UserStoryMovedMessage(
                event.getId(),
                event.getSprintId(),
                event.getBacklogId(),
                event.getWorkspaceId()
        );

        BaseEventMessage<UserStoryMovedMessage> message =
                new BaseEventMessage<>("USER_STORY_MOVED", "v1", payload);

        rabbitTemplate.convertAndSend(
                RabbitConfig.USERSTORY_EXCHANGE,
                RabbitConfig.MOVED_ROUTING_KEY,
                message
        );
        log.debug("Sent to exchange={}, routingKey={}", RabbitConfig.USERSTORY_EXCHANGE, RabbitConfig.MOVED_ROUTING_KEY);
    }
}
