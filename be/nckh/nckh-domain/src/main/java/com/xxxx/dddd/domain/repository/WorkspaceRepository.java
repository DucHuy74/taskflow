package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;

import java.util.Optional;

public interface WorkspaceRepository {
    Workspace save(Workspace workspace);
    Workspace saveAndFlush(Workspace workspace);

    Optional<Workspace> findById(String workspaceId);

    void delete(Workspace workspace);
}
