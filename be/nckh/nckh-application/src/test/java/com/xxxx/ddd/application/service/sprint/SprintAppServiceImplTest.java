package com.xxxx.ddd.application.service.sprint;

import com.xxxx.ddd.application.mapper.SprintMapperImpl;
import com.xxxx.ddd.application.mapper.UserStoryMapper;
import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.request.SprintUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.sprint.impl.SprintAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import com.xxxx.dddd.domain.repository.SprintRepository;
import com.xxxx.dddd.domain.repository.UserStoryRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SprintAppServiceImplTest {
    private WorkspaceRepository workspaces;
    private SprintRepository sprints;
    private WorkspaceAccessService access;
    private SprintAppServiceImpl service;

    @BeforeEach
    void setUp() {
        workspaces = mock(WorkspaceRepository.class);
        sprints = mock(SprintRepository.class);
        access = mock(WorkspaceAccessService.class);
        service = new SprintAppServiceImpl(
                workspaces,
                sprints,
                mock(EntityManager.class),
                mock(UserStoryRepository.class),
                new SprintMapperImpl(),
                mock(UserStoryMapper.class),
                mock(UserStoryEventPort.class),
                access);
        when(sprints.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createStoresDates() {
        when(workspaces.findById("ws-1")).thenReturn(Optional.of(Workspace.builder().id("ws-1").build()));
        SprintCreateRequest request = new SprintCreateRequest();
        request.setName("Sprint 1");
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setEndDate(LocalDate.of(2026, 1, 14));

        SprintResponse response = service.createSprint("ws-1", request);

        assertThat(response.getStartDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(response.getEndDate()).isEqualTo(LocalDate.of(2026, 1, 14));
        assertThat(response.getStatus()).isEqualTo(SprintStatus.ToDo);
    }

    @Test
    void createRejectsEndBeforeStart() {
        when(workspaces.findById("ws-1")).thenReturn(Optional.of(Workspace.builder().id("ws-1").build()));
        SprintCreateRequest request = new SprintCreateRequest();
        request.setName("Sprint 1");
        request.setStartDate(LocalDate.of(2026, 1, 14));
        request.setEndDate(LocalDate.of(2026, 1, 1));

        assertThatThrownBy(() -> service.createSprint("ws-1", request))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SPRINT_DATES);
        verify(sprints, never()).save(any());
    }

    @Test
    void updateChangesNameAndDatesWithSprintEditPermission() {
        Sprint sprint = Sprint.builder().id("sp-1").name("Old").status(SprintStatus.InProgress)
                .workspace(Workspace.builder().id("ws-1").build()).build();
        when(sprints.findById("sp-1")).thenReturn(Optional.of(sprint));
        SprintUpdateRequest request = new SprintUpdateRequest();
        request.setName("New");
        request.setStartDate(LocalDate.of(2026, 2, 1));
        request.setEndDate(LocalDate.of(2026, 2, 1));

        SprintResponse response = service.updateSprint("sp-1", request);

        verify(access).requireSprint(sprint, Permission.SPRINT_EDIT);
        assertThat(response.getName()).isEqualTo("New");
        assertThat(response.getStatus()).isEqualTo(SprintStatus.InProgress);
        assertThat(response.getStartDate()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(response.getEndDate()).isEqualTo(LocalDate.of(2026, 2, 1));
    }

    @Test
    void updateUnknownSprintIsNotFound() {
        when(sprints.findById("missing")).thenReturn(Optional.empty());
        SprintUpdateRequest request = new SprintUpdateRequest();
        request.setName("New");

        assertThatThrownBy(() -> service.updateSprint("missing", request))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SPRINT_NOT_FOUND);
    }
}
