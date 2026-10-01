package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.request.ChangeMemberRoleRequest;
import com.xxxx.ddd.application.model.dto.request.ResourceGrantRequest;
import com.xxxx.ddd.application.model.dto.request.UpdateRolePermissionsRequest;
import com.xxxx.ddd.application.model.dto.response.MyWorkspaceAccessResponse;
import com.xxxx.ddd.application.model.dto.response.ResourceGrantResponse;
import com.xxxx.ddd.application.model.dto.response.RolePermissionMatrixResponse;
import com.xxxx.ddd.application.service.role.WorkspaceRoleAppService;
import com.xxxx.ddd.common.dto.ApiResponse;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/workspace/{workspaceId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceRoleController {

    WorkspaceRoleAppService workspaceRoleAppService;

    @GetMapping("/permission-matrix")
    public ApiResponse<List<RolePermissionMatrixResponse>> getPermissionMatrix(
            @PathVariable("workspaceId") String workspaceId
    ) {
        return ApiResponse.<List<RolePermissionMatrixResponse>>builder()
                .result(workspaceRoleAppService.getPermissionMatrix(workspaceId))
                .build();
    }

    @PutMapping("/roles/{roleName}/permissions")
    public ApiResponse<RolePermissionMatrixResponse> updateRolePermissions(
            @PathVariable("workspaceId") String workspaceId,
            @PathVariable("roleName") WorkspaceRoleType roleName,
            @RequestBody UpdateRolePermissionsRequest request
    ) {
        return ApiResponse.<RolePermissionMatrixResponse>builder()
                .result(workspaceRoleAppService.updateRolePermissions(workspaceId, roleName, request))
                .build();
    }

    @PutMapping("/members/{userId}/role")
    public ApiResponse<Void> changeMemberRole(
            @PathVariable("workspaceId") String workspaceId,
            @PathVariable("userId") String userId,
            @RequestBody ChangeMemberRoleRequest request
    ) {
        workspaceRoleAppService.changeMemberRole(workspaceId, userId, request);
        return ApiResponse.<Void>builder()
                .message("Member role updated")
                .build();
    }

    @GetMapping("/my-access")
    public ApiResponse<MyWorkspaceAccessResponse> myAccess(
            @PathVariable("workspaceId") String workspaceId
    ) {
        return ApiResponse.<MyWorkspaceAccessResponse>builder()
                .result(workspaceRoleAppService.getMyAccess(workspaceId))
                .build();
    }

    @GetMapping("/grants")
    public ApiResponse<List<ResourceGrantResponse>> listGrants(
            @PathVariable("workspaceId") String workspaceId,
            @RequestParam(value = "resourceType", required = false) ResourceType resourceType,
            @RequestParam(value = "resourceId", required = false) String resourceId
    ) {
        return ApiResponse.<List<ResourceGrantResponse>>builder()
                .result(workspaceRoleAppService.listGrants(workspaceId, resourceType, resourceId))
                .build();
    }

    @PostMapping("/grants")
    public ApiResponse<ResourceGrantResponse> createGrant(
            @PathVariable("workspaceId") String workspaceId,
            @RequestBody ResourceGrantRequest request
    ) {
        return ApiResponse.<ResourceGrantResponse>builder()
                .message("Grant created")
                .result(workspaceRoleAppService.createGrant(workspaceId, request))
                .build();
    }

    @DeleteMapping("/grants/{grantId}")
    public ApiResponse<Void> deleteGrant(
            @PathVariable("workspaceId") String workspaceId,
            @PathVariable("grantId") String grantId
    ) {
        workspaceRoleAppService.deleteGrant(workspaceId, grantId);
        return ApiResponse.<Void>builder()
                .message("Grant deleted")
                .build();
    }
}
