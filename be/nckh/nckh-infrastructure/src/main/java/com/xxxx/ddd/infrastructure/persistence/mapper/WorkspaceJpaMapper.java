package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceJpaMapper extends JpaRepository<Workspace, String> {
}
