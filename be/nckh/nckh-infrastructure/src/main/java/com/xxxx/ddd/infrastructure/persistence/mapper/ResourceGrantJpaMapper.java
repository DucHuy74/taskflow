package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceGrantJpaMapper extends JpaRepository<ResourceGrant, String> {
    List<ResourceGrant> findAllByWorkspaceId(String workspaceId);

    List<ResourceGrant> findAllByWorkspaceIdAndResourceTypeAndResourceId(
            String workspaceId,
            ResourceType resourceType,
            String resourceId
    );
}
