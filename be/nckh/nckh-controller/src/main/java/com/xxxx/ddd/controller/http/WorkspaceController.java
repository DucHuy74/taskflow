package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.request.WorkspaceAddMemberRequest;
import com.xxxx.ddd.application.model.dto.request.WorkspaceCreateRequest;
import com.xxxx.ddd.application.model.dto.request.WorkspaceUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.WorkspaceMemberResponse;
import com.xxxx.ddd.application.model.dto.response.WorkspaceResponse;
import com.xxxx.ddd.application.service.workspace.WorkspaceAppService;
import com.xxxx.ddd.application.service.workspace.impl.WorkspaceAppServiceImpl;
import com.xxxx.ddd.common.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/workspace")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceController {

    WorkspaceAppService workspaceService;

    @PostMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> createWorkspace(
            @RequestBody WorkspaceCreateRequest request) {

        WorkspaceResponse response = workspaceService.createWorkspace(request);

        return ResponseEntity.ok(
                ApiResponse.<WorkspaceResponse>builder()
                        .result(response)
                        .message("Workspace created successfully")
                        .build()
        );
    }

    @PutMapping("/{workspaceId}")
    public ApiResponse<WorkspaceResponse> updateWorkspace(
            @PathVariable("workspaceId") String workspaceId,
            @RequestBody WorkspaceUpdateRequest request) {

        return ApiResponse.<WorkspaceResponse>builder()
                .result(workspaceService.updateWorkspace(workspaceId, request))
                .build();
    }

    @PostMapping("/{workspaceId}/invitations")
    public ApiResponse<Void> addMember(
            @PathVariable("workspaceId") String workspaceId,
            @RequestBody WorkspaceAddMemberRequest request) {

        workspaceService.inviteMemberToWorkspace(workspaceId, request);

        return ApiResponse.<Void>builder()
                .message("Invitation sent successfully")
                .build();
    }


    @GetMapping
    public ApiResponse<List<WorkspaceResponse>> getAllWorkspaces() {
        return ApiResponse.<List<WorkspaceResponse>>builder()
                .result(workspaceService.getAllWorkspaces())
                .build();
    }

    @DeleteMapping("/{workspaceId}")
    public ApiResponse<Void> deleteWorkspace(@PathVariable("workspaceId")String workspaceId) {
        workspaceService.deleteWorkspace(workspaceId);
        return ApiResponse.<Void>builder()
                .message("Workspace deleted successfully")
                .build();
    }

    @GetMapping("/{workspaceId}/members")
    public ApiResponse<List<WorkspaceMemberResponse>> getMembers(
            @PathVariable("workspaceId") String workspaceId
    ) {
        return ApiResponse.<List<WorkspaceMemberResponse>>builder()
                .result(workspaceService.getMembers(workspaceId))
                .build();
    }

    @PostMapping("/{workspaceId}/rebuild-graph")
    public ResponseEntity<String> rebuildGraph(@PathVariable("workspaceId") String workspaceId) {

        workspaceService.triggerRebuildGraph(workspaceId);

        return ResponseEntity.ok("Rebuild triggered");
    }
}

