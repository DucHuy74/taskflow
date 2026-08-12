package com.xxxx.ddd.application.service.userstory.impl;

import com.xxxx.ddd.application.mapper.UserStoryMapper;
import com.xxxx.ddd.application.model.dto.request.UserStoryCreateRequest;
import com.xxxx.ddd.application.model.dto.request.UserStoryStatusUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.ddd.application.service.userstory.UserStoryAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Backlog;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import com.xxxx.dddd.domain.repository.UserStoryRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserStoryAppServiceImpl implements UserStoryAppService {
    UserStoryRepository userStoryRepository;
    WorkspaceRepository workspaceRepository;
    UserStoryMapper userStoryMapper;

    ApplicationEventPublisher publisher;

    @Override
    @Transactional
    public List<UserStoryResponse> create(String workspaceId, List<UserStoryCreateRequest> requests) {

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.WORKSPACE_NOT_FOUND));

        Backlog backlog = workspace.getBacklog();

        List<UserStory> stories = requests.stream()
                        .map(userStoryMapper::toEntity)
                        .toList();

        stories.forEach(story -> {
            story.setWorkspace(workspace);
            story.setBacklog(backlog);
            story.setStatus(UserStoryStatus.ToDo);
            story.setSprint(null);
        });

        stories = userStoryRepository.saveAll(stories);

        stories.forEach(story ->
                publisher.publishEvent(
                        new UserStoryCreatedEvent(
                                story.getId(),
                                story.getStoryText(),
                                null,
                                backlog.getId(),
                                workspace.getId()
                        )
                )
        );

        return userStoryMapper.toResponses(stories);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserStoryResponse> getBacklog(String workspaceId) {

        return userStoryMapper.toResponses(
                userStoryRepository.findByWorkspace_IdAndSprintIsNull(workspaceId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserStoryResponse> getBySprint(String sprintId) {

        return userStoryMapper.toResponses(
                userStoryRepository.findBySprint_Id(sprintId)
        );
    }

    @Override
    @Transactional
    public UserStoryResponse updateStatus(
            String userStoryId,
            UserStoryStatusUpdateRequest request
    ) {

        UserStory story = userStoryRepository.findById(userStoryId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_STORY_NOT_FOUND));

        if(story.getSprint() == null){
            throw new AppException(ErrorCode.USER_STORY_NOT_IN_SPRINT);
        }

        if (story.getSprint().getStatus() != SprintStatus.InProgress) {
            throw new AppException(ErrorCode.SPRINT_NOT_ACTIVE);
        }

        if(!List.of(
                UserStoryStatus.ToDo,
                UserStoryStatus.InProgress,
                UserStoryStatus.Done
        ).contains(request.getStatus())) {
            throw new AppException(ErrorCode.INVALID_USER_STORY_STATUS);
        }

        story.setStatus(request.getStatus());

        return userStoryMapper.toResponse(story);
    }

    @Override
    @Transactional
    public void delete(String userStoryId) {

        userStoryRepository.findById(userStoryId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_STORY_NOT_FOUND));

        userStoryRepository.delete(userStoryId);
    }

    @Override
    @Transactional(readOnly = true)
    public UserStoryResponse getById(String userStoryId) {

        UserStory story = userStoryRepository.findById(userStoryId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_STORY_NOT_FOUND));

        return userStoryMapper.toResponse(story);
    }
}
