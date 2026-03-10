package com.xxxx.dddd.domain.event;

public record UserStoryCreatedEvent(
        String id,
        String storyText,
        String sprintId,
        String backlogId,
        String workspaceId
) {}
