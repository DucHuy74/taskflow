package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.Data;

@Data
public class ChangeMemberRoleRequest {
    private WorkspaceRoleType role;
}
