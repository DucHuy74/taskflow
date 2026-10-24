package com.xxxx.ddd.application.service.workspace;

import com.xxxx.ddd.application.mapper.WorkspaceMapper;
import com.xxxx.ddd.application.model.dto.response.RebuildGraphResponse;
import com.xxxx.ddd.application.model.dto.response.WorkspaceResponse;
import com.xxxx.ddd.application.port.async.GraphEventPort;
import com.xxxx.ddd.application.port.async.InvitationAsyncPort;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.notification.NotificationAppService;
import com.xxxx.ddd.application.service.profile.ProfileAppService;
import com.xxxx.ddd.application.service.workspace.impl.WorkspaceAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.model.entity.RecommendationJob;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.RecommendationJobStatus;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import com.xxxx.dddd.domain.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkspaceAppServiceImplTest {
    private WorkspaceRepository workspaces;
    private WorkspaceMapper mapper;
    private WorkspaceAccessService access;
    private GraphEventPort graphEvents;
    private RecommendationJobRepository jobs;
    private WorkspaceAppServiceImpl service;

    @BeforeEach
    void setUp() {
        workspaces = mock(WorkspaceRepository.class);
        mapper = mock(WorkspaceMapper.class);
        access = mock(WorkspaceAccessService.class);
        graphEvents = mock(GraphEventPort.class);
        jobs = mock(RecommendationJobRepository.class);
        service = new WorkspaceAppServiceImpl(
                workspaces,
                mock(WorkspaceRoleRepository.class),
                mock(WorkspaceMemberRepository.class),
                mock(InvitationRepository.class),
                mock(ProfileRepository.class),
                mapper,
                mock(NotificationAppService.class),
                mock(InvitationAsyncPort.class),
                mock(ProfileAppService.class),
                graphEvents,
                access,
                jobs);
    }

    @Test
    void getWorkspaceFillsCallerRoleAndOwner() {
        Workspace workspace = Workspace.builder().id("ws-1").name("Alpha").build();
        WorkspaceMember owner = WorkspaceMember.builder()
                .profile(Profile.builder().userId("owner-1").build())
                .workspaceRole(WorkspaceRole.builder().roleName(WorkspaceRoleType.ADMIN).build())
                .build();
        workspace.setMembers(Set.of(owner));
        WorkspaceMember caller = WorkspaceMember.builder()
                .profile(Profile.builder().userId("me").build())
                .workspaceRole(WorkspaceRole.builder().roleName(WorkspaceRoleType.VIEWER).build())
                .build();
        when(workspaces.findById("ws-1")).thenReturn(Optional.of(workspace));
        when(access.require("ws-1", Permission.WORKSPACE_BROWSE)).thenReturn(caller);
        when(mapper.toWorkspaceResponse(workspace)).thenReturn(WorkspaceResponse.builder().id("ws-1").build());

        WorkspaceResponse response = service.getWorkspace("ws-1");

        assertThat(response.getRoles()).containsExactly("VIEWER");
        assertThat(response.getOwnerId()).isEqualTo("owner-1");
    }

    @Test
    void getWorkspaceUnknownIsNotFound() {
        when(workspaces.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getWorkspace("missing"))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.WORKSPACE_NOT_FOUND);
        verifyNoInteractions(access);
    }

    @Test
    void rebuildReturnsCreatedJob() {
        when(jobs.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RebuildGraphResponse response = service.triggerRebuildGraph("ws-1");

        ArgumentCaptor<RecommendationJob> saved = ArgumentCaptor.forClass(RecommendationJob.class);
        verify(jobs).save(saved.capture());
        assertThat(response.getJobId()).isEqualTo(saved.getValue().getId());
        assertThat(response.getStatus()).isEqualTo(RecommendationJobStatus.QUEUED);
        verify(graphEvents).sendRebuildEvent(eq("ws-1"), eq(response.getJobId()), anyString());
    }
}
