package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.List;
import java.util.Optional;

public interface WorkspaceRoleRepository {
    Optional<WorkspaceRole> findByWorkspaceAndRoleName(Workspace workspace, WorkspaceRoleType roleName);

    List<WorkspaceRole> findAllByWorkspace_Id(String workspaceId);

    WorkspaceRole save(WorkspaceRole workspaceRole);
}
