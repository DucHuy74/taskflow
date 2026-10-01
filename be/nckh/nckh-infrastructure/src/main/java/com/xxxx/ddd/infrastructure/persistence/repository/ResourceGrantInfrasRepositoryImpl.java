package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.ResourceGrantJpaMapper;
import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import com.xxxx.dddd.domain.repository.ResourceGrantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ResourceGrantInfrasRepositoryImpl implements ResourceGrantRepository {

    private final ResourceGrantJpaMapper jpa;

    @Override
    public ResourceGrant save(ResourceGrant grant) {
        return jpa.save(grant);
    }

    @Override
    public Optional<ResourceGrant> findById(String id) {
        return jpa.findById(id);
    }

    @Override
    public void deleteById(String id) {
        jpa.deleteById(id);
    }

    @Override
    public List<ResourceGrant> findAllByWorkspaceId(String workspaceId) {
        return jpa.findAllByWorkspaceId(workspaceId);
    }

    @Override
    public List<ResourceGrant> findAllByWorkspaceIdAndResourceTypeAndResourceId(
            String workspaceId,
            ResourceType resourceType,
            String resourceId
    ) {
        return jpa.findAllByWorkspaceIdAndResourceTypeAndResourceId(workspaceId, resourceType, resourceId);
    }
}
