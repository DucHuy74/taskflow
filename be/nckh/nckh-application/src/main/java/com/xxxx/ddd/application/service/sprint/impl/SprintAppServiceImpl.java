package com.xxxx.ddd.application.service.sprint.impl;

import com.xxxx.ddd.application.annotation.ReadOnly;
import com.xxxx.ddd.application.mapper.SprintMapper;
import com.xxxx.ddd.application.mapper.UserStoryMapper;
import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.ddd.application.service.sprint.SprintAppService;
import com.xxxx.ddd.application.support.TransactionalEvents;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.event.UserStoryMovedEvent;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import com.xxxx.dddd.domain.repository.SprintRepository;
import com.xxxx.dddd.domain.repository.UserStoryRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SprintAppServiceImpl implements SprintAppService {
    WorkspaceRepository workspaceRepository;
    SprintRepository sprintRepository;
    UserStoryRepository userStoryRepository;
    SprintMapper sprintMapper;
    UserStoryMapper userStoryMapper;
    UserStoryEventPort userStoryEventPort;

    //Create Sprint
    @Override
    @Transactional
    public SprintResponse createSprint(String workspaceId, SprintCreateRequest request) {

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.WORKSPACE_NOT_FOUND));

        Sprint sprint = sprintMapper.toEntity(request);
        sprint.setWorkspace(workspace);
        sprint.setStatus(SprintStatus.ToDo);

        return sprintMapper.toResponse(sprintRepository.save(sprint));
    }

    //Get all sprints of workspace
    @Override
    @ReadOnly
    @Transactional(readOnly = true)
    public List<SprintResponse> getSprints(String workspaceId) {

        return sprintMapper.toResponses(
                sprintRepository.findByWorkspace_IdOrderByCreatedAtDesc(workspaceId)
        );
    }

    //Start Sprint
    @Override
    @Transactional
    public void startSprint(String sprintId) {

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new AppException(ErrorCode.SPRINT_NOT_FOUND));

        if (sprint.getStatus() != SprintStatus.ToDo) {
            throw new AppException(ErrorCode.SPRINT_INVALID_STATE);
        }

        //1 workspace chỉ có 1 sprint ACTIVE
        boolean existsActiveSprint =
                sprintRepository.existsByWorkspace_IdAndStatus(
                        sprint.getWorkspace().getId(),
                        SprintStatus.InProgress
                );

        if (existsActiveSprint) {
            throw new AppException(ErrorCode.SPRINT_ALREADY_ACTIVE);
        }

        sprint.setStatus(SprintStatus.InProgress);
        sprintRepository.save(sprint);

        List<UserStory> stories = userStoryRepository.findBySprint_Id(sprintId);
        String workspaceId = sprint.getWorkspace().getId();

        if (stories.isEmpty()) {
            log.warn("Sprint {} started with no user stories — no USER_STORY_MOVED events", sprintId);
            return;
        }

        List<UserStoryMovedEvent> moveEvents = stories.stream()
                .map(story -> new UserStoryMovedEvent(
                        story.getId(),
                        sprintId,
                        null,
                        workspaceId
                ))
                .toList();

        TransactionalEvents.afterCommit(() ->
                moveEvents.forEach(userStoryEventPort::publishMoved)
        );
    }

    //Complete Sprint
    @Override
    @Transactional
    public void completeSprint(String sprintId) {

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new AppException(ErrorCode.SPRINT_NOT_FOUND));

        if (sprint.getStatus() != SprintStatus.InProgress) {
            throw new AppException(ErrorCode.SPRINT_INVALID_STATE);
        }

        sprint.setStatus(SprintStatus.Done);
        sprintRepository.save(sprint);

        String workspaceId = sprint.getWorkspace().getId();
        String backlogId = sprint.getWorkspace().getBacklog().getId();

        List<UserStory> stories = userStoryRepository.findBySprint_Id(sprintId);
        List<UserStoryMovedEvent> moveEvents = new ArrayList<>();

        for (UserStory story : stories) {
            if (story.getStatus() != UserStoryStatus.Done) {
                story.setSprint(null);
                story.setBacklog(sprint.getWorkspace().getBacklog());
                story.setStatus(UserStoryStatus.ToDo);
                userStoryRepository.save(story);

                moveEvents.add(new UserStoryMovedEvent(
                        story.getId(),
                        null,
                        backlogId,
                        workspaceId
                ));
            }
        }

        if (!moveEvents.isEmpty()) {
            TransactionalEvents.afterCommit(() ->
                    moveEvents.forEach(userStoryEventPort::publishMoved)
            );
        }
    }

    // Add userstories to sprint
    @Override
    @Transactional
    public void addUserStoryToSprint(String sprintId, String userStoryId) {
        addUserStoriesToSprint(sprintId, List.of(userStoryId));
    }

    @Override
    @Transactional
    public void addUserStoriesToSprint(String sprintId, List<String> userStoryIds) {

        if (userStoryIds == null || userStoryIds.isEmpty()) {
            return;
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new AppException(ErrorCode.SPRINT_NOT_FOUND));

        if (sprint.getStatus() != SprintStatus.ToDo) {
            throw new AppException(ErrorCode.SPRINT_INVALID_STATE);
        }

        Set<String> uniqueIds = new HashSet<>(userStoryIds);
        List<UserStory> stories = userStoryRepository.findAllById(uniqueIds);

        if (stories.size() != uniqueIds.size()) {
            throw new AppException(ErrorCode.USER_STORY_NOT_FOUND);
        }

        for (UserStory story : stories) {
            assignStoryToSprint(sprint, story);
        }
    }

    private void assignStoryToSprint(Sprint sprint, UserStory story) {

        if (!story.getWorkspace().getId().equals(sprint.getWorkspace().getId())) {
            throw new AppException(ErrorCode.INVALID_WORKSPACE);
        }

        story.setSprint(sprint);
        story.setBacklog(null);
        userStoryRepository.save(story);
    }

    //Remove user story khỏi sprint (về backlog)
    @Override
    @Transactional
    public void removeUserStoryFromSprint(String userStoryId) {

        UserStory story = userStoryRepository.findById(userStoryId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_STORY_NOT_FOUND));

        story.setSprint(null);
    }

    //Get backlog (spr_id IS NULL)
    @Override
    @Transactional(readOnly = true)
    public List<UserStoryResponse> getBacklog(String workspaceId) {

        return userStoryMapper.toResponses(
                userStoryRepository.findByWorkspace_IdAndSprintIsNull(workspaceId)
        );
    }

    //Get user stories of sprint
    @Override
    @Transactional(readOnly = true)
    public List<UserStoryResponse> getUserStoriesOfSprint(String sprintId) {

        return userStoryMapper.toResponses(
                userStoryRepository.findBySprint_Id(sprintId)
        );
    }
}
