package com.xxxx.ddd.application.service.role.impl;

import com.xxxx.ddd.application.model.dto.request.ChangeMemberRoleRequest;
import com.xxxx.ddd.application.model.dto.request.ResourceGrantRequest;
import com.xxxx.ddd.application.model.dto.request.UpdateRolePermissionsRequest;
import com.xxxx.ddd.application.model.dto.response.MyWorkspaceAccessResponse;
import com.xxxx.ddd.application.model.dto.response.ResourceGrantResponse;
import com.xxxx.ddd.application.model.dto.response.RolePermissionMatrixResponse;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.role.WorkspaceRoleAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceRole;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import com.xxxx.dddd.domain.model.permission.WorkspaceRoleFactory;
import com.xxxx.dddd.domain.repository.ResourceGrantRepository;
import com.xxxx.dddd.domain.repository.WorkspaceMemberRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRepository;
import com.xxxx.dddd.domain.repository.WorkspaceRoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceRoleAppServiceImpl implements WorkspaceRoleAppService {

    WorkspaceAccessService workspaceAccessService;
    WorkspaceRepository workspaceRepository;
    WorkspaceRoleRepository workspaceRoleRepository;
    WorkspaceMemberRepository workspaceMemberRepository;
    ResourceGrantRepository resourceGrantRepository;

    @Override
    @Transactional
    public List<RolePermissionMatrixResponse> getPermissionMatrix(String workspaceId) {
        workspaceAccessService.require(workspaceId, Permission.WORKSPACE_BROWSE);
        Workspace workspace = getWorkspace(workspaceId);
        seedMissingRoles(workspace);

        return workspaceRoleRepository.findAllByWorkspace_Id(workspaceId).stream()
                .map(role -> {
                    WorkspaceRoleFactory.ensurePermissions(role);
                    return RolePermissionMatrixResponse.builder()
                            .role(role.getRoleName())
                            .permissions(new HashSet<>(role.getPermissions()))
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public RolePermissionMatrixResponse updateRolePermissions(
            String workspaceId,
            WorkspaceRoleType roleName,
            UpdateRolePermissionsRequest request
    ) {
        workspaceAccessService.require(workspaceId, Permission.WORKSPACE_ADMINISTER);
        if (request.getPermissions() == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        Set<Permission> next = request.getPermissions().isEmpty()
                ? EnumSet.noneOf(Permission.class)
                : EnumSet.copyOf(request.getPermissions());
        if (roleName == WorkspaceRoleType.ADMIN && !next.contains(Permission.WORKSPACE_ADMINISTER)) {
            next.add(Permission.WORKSPACE_ADMINISTER);
        }

        Workspace workspace = getWorkspace(workspaceId);
        WorkspaceRole role = getOrCreateRole(workspace, roleName);
        role.setPermissions(new HashSet<>(next));
        workspaceRoleRepository.save(role);

        return RolePermissionMatrixResponse.builder()
                .role(role.getRoleName())
                .permissions(new HashSet<>(role.getPermissions()))
                .build();
    }

    @Override
    @Transactional
    public void changeMemberRole(String workspaceId, String userId, ChangeMemberRoleRequest request) {
        workspaceAccessService.require(workspaceId, Permission.MEMBER_MANAGE);
        if (request.getRole() == null) {
            throw new AppException(ErrorCode.INVALID_ROLE);
        }

        WorkspaceMember target = workspaceMemberRepository
                .findByWorkspace_IdAndProfile_UserId(workspaceId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (target.getWorkspaceRole().getRoleName() == WorkspaceRoleType.ADMIN
                && request.getRole() != WorkspaceRoleType.ADMIN
                && countAdmins(workspaceId) <= 1) {
            throw new AppException(ErrorCode.CANNOT_DEMOTE_LAST_ADMIN);
        }

        WorkspaceRole nextRole = getOrCreateRole(target.getWorkspace(), request.getRole());
        target.setWorkspaceRole(nextRole);
        workspaceMemberRepository.save(target);
    }

    @Override
    @Transactional(readOnly = true)
    public MyWorkspaceAccessResponse getMyAccess(String workspaceId) {
        WorkspaceMember member = workspaceAccessService.require(workspaceId, Permission.WORKSPACE_BROWSE);
        return MyWorkspaceAccessResponse.builder()
                .role(member.getWorkspaceRole().getRoleName())
                .permissions(workspaceAccessService.effectiveRolePermissions(member))
                .grants(resourceGrantRepository.findAllByWorkspaceId(workspaceId).stream()
                        .filter(g -> matchesMe(g, member))
                        .map(this::toGrantResponse)
                        .toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceGrantResponse> listGrants(
            String workspaceId,
            ResourceType resourceType,
            String resourceId
    ) {
        workspaceAccessService.require(workspaceId, Permission.ACL_READ);
        List<ResourceGrant> grants;
        if (resourceType != null && resourceId != null) {
            grants = resourceGrantRepository.findAllByWorkspaceIdAndResourceTypeAndResourceId(
                    workspaceId, resourceType, resourceId
            );
        } else {
            grants = resourceGrantRepository.findAllByWorkspaceId(workspaceId);
        }
        return grants.stream().map(this::toGrantResponse).toList();
    }

    @Override
    @Transactional
    public ResourceGrantResponse createGrant(String workspaceId, ResourceGrantRequest request) {
        workspaceAccessService.require(workspaceId, Permission.ACL_WRITE);
        getWorkspace(workspaceId);
        validateGrant(request);

        ResourceGrant grant = ResourceGrant.builder()
                .workspaceId(workspaceId)
                .resourceType(request.getResourceType())
                .resourceId(request.getResourceId())
                .principalType(request.getPrincipalType())
                .principalId(request.getPrincipalId())
                .permission(request.getPermission())
                .effect(request.getEffect() == null ? PermissionEffect.ALLOW : request.getEffect())
                .build();

        return toGrantResponse(resourceGrantRepository.save(grant));
    }

    @Override
    @Transactional
    public void deleteGrant(String workspaceId, String grantId) {
        workspaceAccessService.require(workspaceId, Permission.ACL_WRITE);
        ResourceGrant grant = resourceGrantRepository.findById(grantId)
                .orElseThrow(() -> new AppException(ErrorCode.GRANT_NOT_FOUND));
        if (!grant.getWorkspaceId().equals(workspaceId)) {
            throw new AppException(ErrorCode.NO_PERMISSION);
        }
        resourceGrantRepository.deleteById(grantId);
    }

    private boolean matchesMe(ResourceGrant grant, WorkspaceMember member) {
        if (grant.getPrincipalType() == PrincipalType.USER) {
            return grant.getPrincipalId().equals(member.getProfile().getUserId());
        }
        return grant.getPrincipalId().equalsIgnoreCase(member.getWorkspaceRole().getRoleName().name());
    }

    private Workspace getWorkspace(String workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.WORKSPACE_NOT_FOUND));
    }

    private void seedMissingRoles(Workspace workspace) {
        for (WorkspaceRoleType type : WorkspaceRoleType.values()) {
            getOrCreateRole(workspace, type);
        }
    }

    private WorkspaceRole getOrCreateRole(Workspace workspace, WorkspaceRoleType type) {
        return workspaceRoleRepository.findByWorkspaceAndRoleName(workspace, type)
                .map(role -> {
                    WorkspaceRoleFactory.ensurePermissions(role);
                    return role;
                })
                .orElseGet(() -> workspaceRoleRepository.save(WorkspaceRoleFactory.seeded(workspace, type)));
    }

    private long countAdmins(String workspaceId) {
        return workspaceMemberRepository.findAllByWorkspace_Id(workspaceId).stream()
                .filter(m -> m.getWorkspaceRole().getRoleName() == WorkspaceRoleType.ADMIN)
                .count();
    }

    private void validateGrant(ResourceGrantRequest request) {
        if (request.getResourceType() == null
                || request.getResourceId() == null
                || request.getResourceId().isBlank()
                || request.getPrincipalType() == null
                || request.getPrincipalId() == null
                || request.getPrincipalId().isBlank()
                || request.getPermission() == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }

    private ResourceGrantResponse toGrantResponse(ResourceGrant grant) {
        return ResourceGrantResponse.builder()
                .id(grant.getId())
                .workspaceId(grant.getWorkspaceId())
                .resourceType(grant.getResourceType())
                .resourceId(grant.getResourceId())
                .principalType(grant.getPrincipalType())
                .principalId(grant.getPrincipalId())
                .permission(grant.getPermission())
                .effect(grant.getEffect())
                .build();
    }
}
