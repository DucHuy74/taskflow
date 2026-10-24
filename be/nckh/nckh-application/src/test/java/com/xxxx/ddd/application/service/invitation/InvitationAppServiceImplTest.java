package com.xxxx.ddd.application.service.invitation;

import com.xxxx.ddd.application.model.dto.response.InvitationResponse;
import com.xxxx.ddd.application.service.invitation.impl.InvitationAppServiceImpl;
import com.xxxx.ddd.application.service.notification.NotificationAppService;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceInvitation;
import com.xxxx.dddd.domain.model.enums.InvitationStatus;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import com.xxxx.dddd.domain.repository.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InvitationAppServiceImplTest {

    @Test
    void pendingInvitationsAreEnrichedWithWorkspaceRoleAndEmails() {
        InvitationRepository invitations = mock(InvitationRepository.class);
        WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
        ProfileRepository profiles = mock(ProfileRepository.class);
        InvitationAppServiceImpl service = new InvitationAppServiceImpl(
                invitations,
                workspaces,
                mock(WorkspaceMemberRepository.class),
                mock(WorkspaceRoleRepository.class),
                profiles,
                mock(NotificationAppService.class));

        Instant expiry = Instant.parse("2026-11-01T00:00:00Z");
        when(invitations.findByInviteeUserIdAndStatus("invitee", InvitationStatus.PENDING)).thenReturn(List.of(
                WorkspaceInvitation.builder().id("inv-1").workspaceId("ws-1").inviterId("inviter")
                        .email("invitee@x.com").roleName(WorkspaceRoleType.VIEWER).expiredAt(expiry).build(),
                WorkspaceInvitation.builder().id("inv-2").workspaceId("ws-gone").inviterId("ghost")
                        .email("invitee@x.com").expiredAt(expiry).build()
        ));
        when(workspaces.findById("ws-1")).thenReturn(Optional.of(Workspace.builder().id("ws-1").name("Alpha").build()));
        when(workspaces.findById("ws-gone")).thenReturn(Optional.empty());
        when(profiles.findByUserId("inviter")).thenReturn(Optional.of(Profile.builder().email("boss@x.com").build()));
        when(profiles.findByUserId("ghost")).thenReturn(Optional.empty());

        List<InvitationResponse> result = service.getMyPendingInvitations("invitee");

        assertThat(result).hasSize(2);
        InvitationResponse first = result.get(0);
        assertThat(first.getWorkspaceName()).isEqualTo("Alpha");
        assertThat(first.getRole()).isEqualTo(WorkspaceRoleType.VIEWER);
        assertThat(first.getEmail()).isEqualTo("invitee@x.com");
        assertThat(first.getInviterEmail()).isEqualTo("boss@x.com");
        assertThat(first.getExpiredAt()).isEqualTo(expiry);

        InvitationResponse second = result.get(1);
        assertThat(second.getWorkspaceName()).isNull();
        assertThat(second.getInviterEmail()).isNull();
        assertThat(second.getRole()).isEqualTo(WorkspaceRoleType.MEMBER);
    }
}
