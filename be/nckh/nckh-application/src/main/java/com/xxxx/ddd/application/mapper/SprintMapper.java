package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.dddd.domain.model.entity.Sprint;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SprintMapper {
    Sprint toEntity(SprintCreateRequest request);

    SprintResponse toResponse(Sprint sprint);

    List<SprintResponse> toResponses(List<Sprint> sprints);
}