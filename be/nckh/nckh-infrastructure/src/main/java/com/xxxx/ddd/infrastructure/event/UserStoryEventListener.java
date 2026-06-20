package com.xxxx.ddd.infrastructure.event;

import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.ddd.infrastructure.config.rmq.RabbitConfig;
import com.xxxx.dddd.domain.event.BaseEventMessage;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.event.UserStoryCreatedMessage;
import com.xxxx.dddd.domain.event.UserStoryMovedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
/**
 * Fallback for code paths that still use ApplicationEventPublisher.
 * Primary publish path is {@link UserStoryEventPort} via {@link com.xxxx.ddd.application.support.TransactionalEvents}.
 */
@Component
@RequiredArgsConstructor
public class UserStoryEventListener {

    private final UserStoryEventPort userStoryEventPort;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCreated(UserStoryCreatedEvent event) {
        userStoryEventPort.publishCreated(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onMoved(UserStoryMovedEvent event) {
        userStoryEventPort.publishMoved(event);
    }
}
