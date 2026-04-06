package com.xxxx.dddd.domain.event;

public class UserStoryMovedEvent {

    private final String id;
    private final String sprintId;
    private final String backlogId;
    private final String workspaceId;

    public UserStoryMovedEvent(
            String id,
            String sprintId,
            String backlogId,
            String workspaceId
    ) {
        this.id = id;
        this.sprintId = sprintId;
        this.backlogId = backlogId;
        this.workspaceId = workspaceId;
    }

    public String getId() { return id; }
    public String getSprintId() { return sprintId; }
    public String getBacklogId() { return backlogId; }
    public String getWorkspaceId() { return workspaceId; }
}