package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SprintJpaMapper extends JpaRepository<Sprint, String> {
    List<Sprint> findByWorkspace_IdOrderByCreatedAtDesc(String workspaceId);

    boolean existsByWorkspace_IdAndStatus(String workspaceId, SprintStatus status);
}
