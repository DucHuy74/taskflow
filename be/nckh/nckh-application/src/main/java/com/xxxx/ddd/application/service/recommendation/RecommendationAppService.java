package com.xxxx.ddd.application.service.recommendation;

import com.xxxx.ddd.application.model.dto.request.RecommendationDecisionRequest;
import com.xxxx.ddd.application.model.dto.response.*;
import com.xxxx.dddd.domain.model.enums.RecommendationConfidence;
import com.xxxx.dddd.domain.model.enums.RecommendationStatus;

public interface RecommendationAppService {
    RecommendationListResponse list(
            String workspaceId,
            String type,
            RecommendationStatus status,
            RecommendationConfidence confidence,
            String cursor,
            int limit);

    RecommendationResponse detail(String workspaceId, String recommendationId);

    RecommendationResponse decide(
            String workspaceId,
            String recommendationId,
            String idempotencyKey,
            RecommendationDecisionRequest request);

    RecommendationJobResponse latestJob(String workspaceId);
}
