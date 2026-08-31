package com.xxxx.dddd.domain.model.permission;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.HashSet;

public final class WorkspaceRoleFactory {

    private WorkspaceRoleFactory() {
    }

    public static WorkspaceRole seeded(Workspace workspace, WorkspaceRoleType type) {
        return WorkspaceRole.builder()
                .workspace(workspace)
                .roleName(type)
                .permissions(new HashSet<>(DefaultPermissionMatrix.of(type)))
                .build();
    }

    public static void ensurePermissions(WorkspaceRole role) {
        if (role.getPermissions() == null || role.getPermissions().isEmpty()) {
            role.setPermissions(new HashSet<>(DefaultPermissionMatrix.of(role.getRoleName())));
        }
    }
}
