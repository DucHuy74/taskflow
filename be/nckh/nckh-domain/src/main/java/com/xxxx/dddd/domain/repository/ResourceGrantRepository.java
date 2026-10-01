package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.enums.ResourceType;

import java.util.List;
import java.util.Optional;

public interface ResourceGrantRepository {
    ResourceGrant save(ResourceGrant grant);

    Optional<ResourceGrant> findById(String id);

    void deleteById(String id);

    List<ResourceGrant> findAllByWorkspaceId(String workspaceId);

    List<ResourceGrant> findAllByWorkspaceIdAndResourceTypeAndResourceId(
            String workspaceId,
            ResourceType resourceType,
            String resourceId
    );
}
