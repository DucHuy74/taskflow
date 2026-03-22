package com.xxxx.ddd.infrastructure.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserStoryEventListener {
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserStoryCreated(UserStoryCreatedEvent event){
        try {
            String message = objectMapper.writeValueAsString(event);

            rabbitTemplate.convertAndSend(
                    "userstory.exchange",
                    "userstory.created",
                    message
            );
        } catch (Exception e){
            throw new RuntimeException("Failed to send message to RabbitMQ", e);
        }
    }
}
