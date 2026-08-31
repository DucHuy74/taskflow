package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.Builder;
import lombok.Data;

import java.util.Set;

@Data
@Builder
public class RolePermissionMatrixResponse {
    WorkspaceRoleType role;
    Set<Permission> permissions;
}
