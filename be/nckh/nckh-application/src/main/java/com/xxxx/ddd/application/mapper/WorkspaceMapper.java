package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.request.WorkspaceCreateRequest;
import com.xxxx.ddd.application.model.dto.request.WorkspaceUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.BacklogResponse;
import com.xxxx.ddd.application.model.dto.response.WorkspaceResponse;
import com.xxxx.dddd.domain.model.entity.Backlog;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface WorkspaceMapper {
    Workspace toWorkspace(WorkspaceCreateRequest request);

    @Mapping(target = "backlog", source = "backlog")
    WorkspaceResponse toWorkspaceResponse(Workspace workspace);

    BacklogResponse toBacklogResponse(Backlog backlog);

    // update workspace
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "backlog", ignore = true)
    @Mapping(target = "workspaceRoles", ignore = true)
    @Mapping(target = "members", ignore = true)
    @Mapping(target = "sprints", ignore = true)
    void updateWorkspace(@MappingTarget Workspace workspace,
                         WorkspaceUpdateRequest request);
}