package com.xxxx.dddd.domain.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserStoryCreatedMessage {
    private String id;
    private String storyText;
    private String workspaceId;
    private String sprintId;
    private String backlogId;
}
