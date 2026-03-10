package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceMemberJpaMapper;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class WorkspaceMemberInfrasRepositoryImpl implements WorkspaceMemberRepository {
    private final WorkspaceMemberJpaMapper jpa;

    @Override
    public Optional<WorkspaceMember> findByWorkspace_IdAndProfile_UserId(
            String workspaceId,
            String userId
    ) {
        return jpa.findByWorkspace_IdAndProfile_UserId(workspaceId, userId);
    }

    @Override
    public List<WorkspaceMember> findAllByProfile_UserId(String userId) {
        return jpa.findAllByProfile_UserId(userId);
    }

    @Override
    public List<WorkspaceMember> findAllByWorkspace_Id(String workspaceId) {
        return jpa.findAllByWorkspace_Id(workspaceId);
    }

    @Override
    public WorkspaceMember save(WorkspaceMember workspaceMember) {
        return jpa.save(workspaceMember);
    }
}
