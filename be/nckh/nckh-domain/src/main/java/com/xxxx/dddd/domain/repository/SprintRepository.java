package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.SprintStatus;

import java.util.List;
import java.util.Optional;

public interface SprintRepository {
    List<Sprint> findByWorkspace_IdOrderByCreatedAtDesc(String workspaceId);

    boolean existsByWorkspace_IdAndStatus(String workspaceId, SprintStatus status);

    Sprint save(Sprint sprint);
    Optional<Sprint> findById(String sprintId);
}
