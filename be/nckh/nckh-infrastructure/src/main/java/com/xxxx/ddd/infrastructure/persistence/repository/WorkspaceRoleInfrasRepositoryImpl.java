package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceRoleJpaMapper;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import com.xxxx.dddd.domain.repository.WorkspaceRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class WorkspaceRoleInfrasRepositoryImpl implements WorkspaceRoleRepository {

    private final WorkspaceRoleJpaMapper jpa;

    @Override
    public WorkspaceRole save(WorkspaceRole workspaceRole) {
        return jpa.save(workspaceRole);
    }

    @Override
    public Optional<WorkspaceRole> findByWorkspaceAndRoleName(Workspace workspace, WorkspaceRoleType roleName) {
        return jpa.findByWorkspaceAndRoleName(workspace, roleName);
    }

    @Override
    public List<WorkspaceRole> findAllByWorkspace_Id(String workspaceId) {
        return jpa.findAllByWorkspace_Id(workspaceId);
    }
}
