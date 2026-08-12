package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.request.UserStoryCreateRequest;
import com.xxxx.ddd.application.model.dto.request.UserStoryStatusUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.ddd.application.service.userstory.UserStoryAppService;
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
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/user-stories")
public class UserStoryController {

    UserStoryAppService userStoryService;

    // Create user story
    @PostMapping("/workspace/{workspaceId}")
    public ResponseEntity<ApiResponse<List<UserStoryResponse>>> createUserStory(
            @PathVariable("workspaceId") String workspaceId,
            @RequestBody List<UserStoryCreateRequest> requests
    ) {
        return ResponseEntity.ok(
                ApiResponse.<List<UserStoryResponse>>builder()
                        .message("User story created successfully")
                        .result(userStoryService.create(workspaceId, requests))
                        .build()
        );
    }

    // Get backlog of workspace
    @GetMapping("/workspace/{workspaceId}/backlog")
    public ResponseEntity<ApiResponse<List<UserStoryResponse>>> getBacklog(
            @PathVariable("workspaceId") String workspaceId
    ) {
        return ResponseEntity.ok(
                ApiResponse.<List<UserStoryResponse>>builder()
                        .message("Get backlog user stories successfully")
                        .result(userStoryService.getBacklog(workspaceId))
                        .build()
        );
    }

    // Update status
    @PutMapping("/{userStoryId}/status")
    public ResponseEntity<ApiResponse<UserStoryResponse>> updateStatus(
            @PathVariable("userStoryId") String userStoryId,
            @RequestBody UserStoryStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.<UserStoryResponse>builder()
                        .message("User story status updated")
                        .result(userStoryService.updateStatus(userStoryId, request))
                        .build()
        );
    }

    // Delete user story
    @DeleteMapping("/{userStoryId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("userStoryId") String userStoryId
    ) {
        userStoryService.delete(userStoryId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("User story deleted")
                        .build()
        );
    }



    @GetMapping("/{id}")
    public UserStoryResponse getById(@PathVariable("id") String id){
        return userStoryService.getById(id);
    }

}

