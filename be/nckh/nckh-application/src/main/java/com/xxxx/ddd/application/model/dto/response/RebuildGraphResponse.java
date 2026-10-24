package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.RecommendationJobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RebuildGraphResponse {
    private String jobId;
    private RecommendationJobStatus status;
}
