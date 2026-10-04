package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.RecommendationJobStage;
import com.xxxx.dddd.domain.model.enums.RecommendationJobStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class RecommendationJobResponse {
    private String id;
    private RecommendationJobStatus status;
    private RecommendationJobStage stage;
    private int progress;
    private int candidateCount;
    private String errorCode;
    private Instant startedAt;
    private Instant completedAt;
    private Instant lastSuccessfulRunAt;
}
