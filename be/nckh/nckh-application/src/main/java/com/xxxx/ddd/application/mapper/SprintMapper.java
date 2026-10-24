package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.request.SprintUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.dddd.domain.model.entity.Sprint;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SprintMapper {
    Sprint toEntity(SprintCreateRequest request);

    SprintResponse toResponse(Sprint sprint);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "workspace", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "userStories", ignore = true)
    void updateSprint(@MappingTarget Sprint sprint, SprintUpdateRequest request);

    List<SprintResponse> toResponses(List<Sprint> sprints);
}