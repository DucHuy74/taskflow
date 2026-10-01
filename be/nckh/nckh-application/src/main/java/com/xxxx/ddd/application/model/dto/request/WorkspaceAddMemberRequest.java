package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.Data;

@Data
public class WorkspaceAddMemberRequest {
    private String email;
    private WorkspaceRoleType role;
}

