package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.Optional;

public interface WorkspaceRoleRepository {
    Optional<WorkspaceRole> findByWorkspaceAndRoleName(Workspace workspace, WorkspaceRoleType roleName);

    WorkspaceRole save(WorkspaceRole workspaceRole);
}
