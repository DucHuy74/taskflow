package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceInvitation;
import com.xxxx.dddd.domain.model.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationJpaMapper extends JpaRepository<WorkspaceInvitation, String> {
    boolean existsByWorkspaceIdAndInviteeUserIdAndStatus(
            String workspaceId,
            String inviteeUserId,
            InvitationStatus status
    );

    List<WorkspaceInvitation> findByInviteeUserIdAndStatus(
            String inviteeUserId,
            InvitationStatus status
    );
}
