package com.xxxx.dddd.domain.event;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserStoryMovedMessage {

    private String id;
    private String sprintId;
    private String backlogId;
    private String workspaceId;

    public UserStoryMovedMessage(String id, String sprintId, String backlogId, String workspaceId) {
        this.id = id;
        this.sprintId = sprintId;
        this.backlogId = backlogId;
        this.workspaceId = workspaceId;
    }
}