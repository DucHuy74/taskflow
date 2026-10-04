package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.RecommendationConfidence;
import com.xxxx.dddd.domain.model.enums.RecommendationStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class RecommendationResponse {
    private String id;
    private String type;
    private RecommendationStatus status;
    private Confidence confidence;
    private String title;
    private List<Story> stories;
    private List<Evidence> evidence;
    private SuggestedAction suggestedAction;
    private String modelVersion;
    private String policyVersion;
    private Instant generatedAt;
    private long version;

    @Data @Builder
    public static class Confidence {
        private RecommendationConfidence band;
        private double score;
        private boolean calibrated;
    }

    @Data @Builder
    public static class Story {
        private String id;
        private String text;
        private Double graphRelevanceScore;
        private Double parseConfidence;
    }

    @Data @Builder
    public static class Evidence {
        private String code;
        private String label;
        private Double value;
    }

    @Data @Builder
    public static class SuggestedAction {
        private String type;
        private String representativeStoryId;
    }
}
