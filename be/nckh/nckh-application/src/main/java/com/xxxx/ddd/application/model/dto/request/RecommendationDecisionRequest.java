package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.RecommendationDecisionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RecommendationDecisionRequest {
    @NotNull
    private RecommendationDecisionType decision;

    @Size(max = 1000)
    private String note;

    @NotNull
    private Long version;
}
