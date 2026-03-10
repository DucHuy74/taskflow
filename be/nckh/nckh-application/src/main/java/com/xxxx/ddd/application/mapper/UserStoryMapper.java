package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.request.UserStoryCreateRequest;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.dddd.domain.model.entity.UserStory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserStoryMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "ToDo")
    @Mapping(target = "sprint", ignore = true)
    @Mapping(target = "workspace", ignore = true)
    @Mapping(target = "backlog", ignore = true)
    UserStory toEntity(UserStoryCreateRequest request);

    @Mapping(target = "sprintId", source = "sprint.id")
    @Mapping(target = "workspaceId", source = "workspace.id")
    @Mapping(target = "backlogId", source = "backlog.id")
    UserStoryResponse toResponse(UserStory entity);

    List<UserStoryResponse> toResponses(List<UserStory> entities);
}