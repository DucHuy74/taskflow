package com.xxxx.ddd.application.model.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
public class RecommendationListResponse {
    private List<RecommendationResponse> data;
    private Page page;
    private Summary summary;

    @Data @Builder
    public static class Page {
        private String nextCursor;
        private boolean hasMore;
    }

    @Data @Builder
    public static class Summary {
        private long open;
        private long high;
        private long medium;
    }
}
