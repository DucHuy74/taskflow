package com.xxxx.ddd.application.service.role;

import com.xxxx.ddd.application.model.dto.request.ChangeMemberRoleRequest;
import com.xxxx.ddd.application.model.dto.request.ResourceGrantRequest;
import com.xxxx.ddd.application.model.dto.request.UpdateRolePermissionsRequest;
import com.xxxx.ddd.application.model.dto.response.MyWorkspaceAccessResponse;
import com.xxxx.ddd.application.model.dto.response.ResourceGrantResponse;
import com.xxxx.ddd.application.model.dto.response.RolePermissionMatrixResponse;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.List;

public interface WorkspaceRoleAppService {
    List<RolePermissionMatrixResponse> getPermissionMatrix(String workspaceId);

    RolePermissionMatrixResponse updateRolePermissions(
            String workspaceId,
            WorkspaceRoleType roleName,
            UpdateRolePermissionsRequest request
    );

    void changeMemberRole(String workspaceId, String userId, ChangeMemberRoleRequest request);

    MyWorkspaceAccessResponse getMyAccess(String workspaceId);

    List<ResourceGrantResponse> listGrants(String workspaceId, ResourceType resourceType, String resourceId);

    ResourceGrantResponse createGrant(String workspaceId, ResourceGrantRequest request);

    void deleteGrant(String workspaceId, String grantId);
}
