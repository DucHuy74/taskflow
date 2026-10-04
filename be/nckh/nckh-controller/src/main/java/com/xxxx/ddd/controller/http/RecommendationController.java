package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.request.RecommendationDecisionRequest;
import com.xxxx.ddd.application.model.dto.response.*;
import com.xxxx.ddd.application.service.recommendation.RecommendationAppService;
import com.xxxx.ddd.common.dto.ApiResponse;
import com.xxxx.dddd.domain.model.enums.RecommendationConfidence;
import com.xxxx.dddd.domain.model.enums.RecommendationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/workspaces/{workspaceId}")
public class RecommendationController {
    private final RecommendationAppService recommendationService;

    @GetMapping("/recommendations")
    public ApiResponse<RecommendationListResponse> list(
            @PathVariable("workspaceId") String workspaceId,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "status", required = false) RecommendationStatus status,
            @RequestParam(name = "confidence", required = false) RecommendationConfidence confidence,
            @RequestParam(name = "cursor", required = false) String cursor,
            @RequestParam(name = "limit", defaultValue = "20") @Min(1) @Max(100) int limit) {
        return ApiResponse.<RecommendationListResponse>builder()
                .result(recommendationService.list(workspaceId, type, status, confidence, cursor, limit))
                .build();
    }

    @GetMapping("/recommendations/{recommendationId}")
    public ApiResponse<RecommendationResponse> detail(
            @PathVariable("workspaceId") String workspaceId,
            @PathVariable("recommendationId") String recommendationId) {
        return ApiResponse.<RecommendationResponse>builder()
                .result(recommendationService.detail(workspaceId, recommendationId))
                .build();
    }

    @PostMapping("/recommendations/{recommendationId}/decision")
    public ApiResponse<RecommendationResponse> decide(
            @PathVariable("workspaceId") String workspaceId,
            @PathVariable("recommendationId") String recommendationId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody RecommendationDecisionRequest request) {
        return ApiResponse.<RecommendationResponse>builder()
                .result(recommendationService.decide(
                        workspaceId, recommendationId, idempotencyKey, request))
                .message("Recommendation decision recorded")
                .build();
    }

    @GetMapping("/recommendation-jobs/latest")
    public ApiResponse<RecommendationJobResponse> latestJob(
            @PathVariable("workspaceId") String workspaceId) {
        return ApiResponse.<RecommendationJobResponse>builder()
                .result(recommendationService.latestJob(workspaceId))
                .build();
    }
}
