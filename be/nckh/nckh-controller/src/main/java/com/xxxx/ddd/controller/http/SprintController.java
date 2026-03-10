package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.ddd.application.service.sprint.SprintAppService;
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
@RequestMapping("/sprints")
public class SprintController {

    SprintAppService sprintService;

    // Create sprint in workspace
    @PostMapping("/workspace/{workspaceId}")
    public ResponseEntity<ApiResponse<SprintResponse>> createSprint(
            @PathVariable("workspaceId") String workspaceId,
            @RequestBody SprintCreateRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.<SprintResponse>builder()
                        .message("Sprint created successfully")
                        .result(sprintService.createSprint(workspaceId, request))
                        .build()
        );
    }

    // Get all sprints of workspace
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<ApiResponse<List<SprintResponse>>> getSprints(
            @PathVariable("workspaceId") String workspaceId
    ) {
        return ResponseEntity.ok(
                ApiResponse.<List<SprintResponse>>builder()
                        .message("Get sprints successfully")
                        .result(sprintService.getSprints(workspaceId))
                        .build()
        );
    }

    // Start sprint
    @PostMapping("/{sprintId}/start")
    public ResponseEntity<ApiResponse<Void>> startSprint(
            @PathVariable("sprintId") String sprintId
    ) {
        sprintService.startSprint(sprintId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Sprint started successfully")
                        .build()
        );
    }

    // Complete sprint
    @PostMapping("/{sprintId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeSprint(
            @PathVariable("sprintId") String sprintId
    ) {
        sprintService.completeSprint(sprintId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Sprint completed successfully")
                        .build()
        );
    }

    // Add user story to sprint
    @PostMapping("/{sprintId}/user-stories/{userStoryId}")
    public ResponseEntity<ApiResponse<Void>> addUserStoryToSprint(
            @PathVariable("sprintId") String sprintId,
            @PathVariable("userStoryId") String userStoryId
    ) {
        sprintService.addUserStoryToSprint(sprintId, userStoryId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("User story added to sprint")
                        .build()
        );
    }

    // Remove userstory from sprint (move to backlog)
    @DeleteMapping("/user-stories/{userStoryId}")
    public ResponseEntity<ApiResponse<Void>> removeUserStoryFromSprint(
            @PathVariable("userStoryId") String userStoryId
    ) {
        sprintService.removeUserStoryFromSprint(userStoryId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("User story removed from sprint")
                        .build()
        );
    }

    // Get user stories of sprint
    @GetMapping("/{sprintId}/user-stories")
    public ResponseEntity<ApiResponse<List<UserStoryResponse>>> getUserStoriesOfSprint(
            @PathVariable("sprintId") String sprintId
    ) {
        return ResponseEntity.ok(
                ApiResponse.<List<UserStoryResponse>>builder()
                        .message("Get sprint user stories successfully")
                        .result(sprintService.getUserStoriesOfSprint(sprintId))
                        .build()
        );
    }
}
