package com.xxxx.ddd.application.service.access.impl;

import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.profile.ProfileAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import com.xxxx.dddd.domain.model.enums.WorkspaceAccess;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import com.xxxx.dddd.domain.model.permission.DefaultPermissionMatrix;
import com.xxxx.dddd.domain.model.permission.WorkspaceRoleFactory;
import com.xxxx.dddd.domain.repository.ResourceGrantRepository;
import com.xxxx.dddd.domain.repository.WorkspaceMemberRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRoleRepository;
import com.xxxx.dddd.domain.service.AccessEvaluator;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceAccessServiceImpl implements WorkspaceAccessService {

    WorkspaceMemberRepository workspaceMemberRepository;
    WorkspaceRepository workspaceRepository;
    WorkspaceRoleRepository workspaceRoleRepository;
    ResourceGrantRepository resourceGrantRepository;
    ProfileAppService profileAppService;

    @Override
    @Transactional(readOnly = true)
    public WorkspaceMember require(String workspaceId, Permission permission) {
        return decide(workspaceId, permission, loadWorkspaceGrants(workspaceId));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceMember requireSprint(Sprint sprint, Permission permission) {
        String workspaceId = sprint.getWorkspace().getId();
        List<ResourceGrant> grants = loadWorkspaceGrants(workspaceId);
        grants.addAll(resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                workspaceId, ResourceType.SPRINT, sprint.getId()
        ));
        return decide(workspaceId, permission, grants);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceMember requireUserStory(UserStory story, Permission permission) {
        String workspaceId = story.getWorkspace().getId();
        List<ResourceGrant> grants = loadWorkspaceGrants(workspaceId);
        if (story.getSprint() != null) {
            grants.addAll(resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                    workspaceId, ResourceType.SPRINT, story.getSprint().getId()
            ));
        }
        grants.addAll(resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                workspaceId, ResourceType.USER_STORY, story.getId()
        ));
        return decide(workspaceId, permission, grants);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceMember requireOnResource(
            String workspaceId,
            ResourceType resourceType,
            String resourceId,
            Permission permission
    ) {
        List<ResourceGrant> grants = loadWorkspaceGrants(workspaceId);
        if (resourceType != ResourceType.WORKSPACE) {
            grants.addAll(resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                    workspaceId, resourceType, resourceId
            ));
        }
        return decide(workspaceId, permission, grants);
    }

    private WorkspaceMember decide(String workspaceId, Permission permission, List<ResourceGrant> grants) {
        Profile profile = profileAppService.getOrCreateCurrentProfile();
        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspace_IdAndProfile_UserId(workspaceId, profile.getUserId())
                .orElseGet(() -> accessLevelMember(workspaceId, profile));

        boolean allowed = AccessEvaluator.isAllowed(
                effectiveRolePermissions(member),
                grants,
                profile.getUserId(),
                member.getWorkspaceRole().getRoleName(),
                permission
        );
        if (!allowed) {
            throw new AppException(ErrorCode.NO_PERMISSION);
        }
        return member;
    }

    /**
     * Jira team-managed access semantics for authenticated users who have not been added explicitly:
     * OPEN grants the default MEMBER role, LIMITED grants VIEWER, and PRIVATE grants nothing.
     * The returned member is intentionally transient; browsing an accessible workspace must not
     * silently mutate its membership list.
     */
    private WorkspaceMember accessLevelMember(String workspaceId, Profile profile) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.WORKSPACE_NOT_FOUND));

        WorkspaceRoleType implicitRole = switch (workspace.getAccess() == null
                ? WorkspaceAccess.PRIVATE
                : workspace.getAccess()) {
            case OPEN -> WorkspaceRoleType.MEMBER;
            case LIMITED -> WorkspaceRoleType.VIEWER;
            case PRIVATE -> throw new AppException(ErrorCode.NO_PERMISSION);
        };

        WorkspaceRole role = workspaceRoleRepository.findByWorkspaceAndRoleName(workspace, implicitRole)
                .orElseGet(() -> WorkspaceRoleFactory.seeded(workspace, implicitRole));

        return WorkspaceMember.builder()
                .workspace(workspace)
                .profile(profile)
                .workspaceRole(role)
                .build();
    }

    private List<ResourceGrant> loadWorkspaceGrants(String workspaceId) {
        return new ArrayList<>(
                resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                        workspaceId, ResourceType.WORKSPACE, workspaceId
                )
        );
    }

    @Override
    public Set<Permission> effectiveRolePermissions(WorkspaceMember member) {
        WorkspaceRole role = member.getWorkspaceRole();
        if (role.getPermissions() == null || role.getPermissions().isEmpty()) {
            return DefaultPermissionMatrix.of(role.getRoleName());
        }
        return new HashSet<>(role.getPermissions());
    }
}
