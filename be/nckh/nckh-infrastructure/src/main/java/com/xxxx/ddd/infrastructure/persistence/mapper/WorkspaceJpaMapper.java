package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface WorkspaceJpaMapper extends JpaRepository<Workspace, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Workspace w where w.id = :workspaceId")
    Optional<Workspace> findByIdForUpdate(@Param("workspaceId") String workspaceId);
}