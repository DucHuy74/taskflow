package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.InvitationJpaMapper;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceInvitation;
import com.xxxx.dddd.domain.model.enums.InvitationStatus;
import com.xxxx.dddd.domain.repository.InvitationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InvitationInfrasRepositoryImpl implements InvitationRepository {

    private final InvitationJpaMapper jpa;

    @Override
    public WorkspaceInvitation save(WorkspaceInvitation invitation) {
        return jpa.save(invitation);
    }

    @Override
    public boolean existsByWorkspaceIdAndInviteeUserIdAndStatus(
            String workspaceId,
            String inviteeUserId,
            InvitationStatus status
    ){
        return jpa.existsByWorkspaceIdAndInviteeUserIdAndStatus(workspaceId, inviteeUserId, status);
    }

    @Override
    public Optional<WorkspaceInvitation> findById(String id) {
        return jpa.findById(id);
    }

    @Override
    public List<WorkspaceInvitation> findByInviteeUserIdAndStatus(String inviteeUserId, InvitationStatus status) {
        return jpa.findByInviteeUserIdAndStatus(inviteeUserId, status);
    }
}
