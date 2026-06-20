package com.xxxx.ddd.infrastructure.event;

import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.event.UserStoryMovedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserStoryEventPortImpl implements UserStoryEventPort {

    private final UserStoryEventPublisher publisher;

    @Override
    public void publishCreated(UserStoryCreatedEvent event) {
        log.info("Publishing USER_STORY_CREATED for story {}", event.id());
        publisher.publishCreated(event);
    }

    @Override
    public void publishMoved(UserStoryMovedEvent event) {
        log.info(
                "Publishing USER_STORY_MOVED for story {} (sprint={}, backlog={})",
                event.getId(),
                event.getSprintId(),
                event.getBacklogId()
        );
        publisher.publishMoved(event);
    }
}
