package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkspaceRoleJpaMapper extends JpaRepository<WorkspaceRole, String> {
    Optional<WorkspaceRole> findByWorkspaceAndRoleName(Workspace workspace, WorkspaceRoleType roleName);
}
