package com.xxxx.ddd.infrastructure.event;

import com.xxxx.ddd.infrastructure.config.rmq.RabbitConfig;
import com.xxxx.dddd.domain.event.BaseEventMessage;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.event.UserStoryCreatedMessage;
import com.xxxx.dddd.domain.event.UserStoryMovedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserStoryEventListener {

    private final UserStoryEventPublisher publisher;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(UserStoryCreatedEvent event) {
        publisher.publishCreated(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMoved(UserStoryMovedEvent event) {
        publisher.publishMoved(event);
    }
}
