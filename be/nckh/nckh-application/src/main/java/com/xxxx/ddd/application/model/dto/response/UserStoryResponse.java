package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStoryResponse {
    String id;
    String storyText;
    UserStoryStatus status;

    String sprintId;    // null = backlog
    String workspaceId;
    String backlogId;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}