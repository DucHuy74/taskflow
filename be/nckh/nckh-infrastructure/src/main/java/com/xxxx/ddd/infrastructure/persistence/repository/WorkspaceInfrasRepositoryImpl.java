package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceJpaMapper;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class WorkspaceInfrasRepositoryImpl implements WorkspaceRepository {

    private final WorkspaceJpaMapper jpa;

    @Override
    public Workspace save(Workspace workspace) {
        return jpa.save(workspace);
    }

    @Override
    public Workspace saveAndFlush(Workspace workspace) {
        return jpa.saveAndFlush(workspace);
    }

    @Override
    public Optional<Workspace> findById(String workspaceId) {
        return jpa.findById(workspaceId);
    }

    @Override
    public void delete(Workspace workspace) {
        jpa.delete(workspace);
    }
}
