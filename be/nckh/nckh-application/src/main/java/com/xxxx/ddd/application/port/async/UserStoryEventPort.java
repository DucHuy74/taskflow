package com.xxxx.ddd.application.port.async;

import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.event.UserStoryMovedEvent;

public interface UserStoryEventPort {

    void publishCreated(UserStoryCreatedEvent event);

    void publishMoved(UserStoryMovedEvent event);
}
