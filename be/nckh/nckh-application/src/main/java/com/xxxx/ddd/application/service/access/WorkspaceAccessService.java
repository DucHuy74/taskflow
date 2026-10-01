package com.xxxx.ddd.application.service.access;

import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.ResourceType;

import java.util.Set;

public interface WorkspaceAccessService {

    WorkspaceMember require(String workspaceId, Permission permission);

    WorkspaceMember requireSprint(Sprint sprint, Permission permission);

    WorkspaceMember requireUserStory(UserStory story, Permission permission);

    WorkspaceMember requireOnResource(
            String workspaceId,
            ResourceType resourceType,
            String resourceId,
            Permission permission
    );

    Set<Permission> effectiveRolePermissions(WorkspaceMember member);
}
