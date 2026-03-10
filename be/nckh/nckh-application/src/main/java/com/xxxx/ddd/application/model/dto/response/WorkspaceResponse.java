package com.xxxx.ddd.application.model.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xxxx.dddd.domain.model.enums.WorkspaceAccess;
import com.xxxx.dddd.domain.model.enums.WorkspaceType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkspaceResponse {
    String id;
    String name;
    WorkspaceType type;
    WorkspaceAccess access;
    BacklogResponse backlog;

    LocalDate createdAt;
    LocalDate updatedAt;

    Integer totalBacklogs;
    Integer totalSprints;

    List<String> roles;

    String ownerId;
}
