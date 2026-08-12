package com.xxxx.ddd.application.model.dto.graph;

public class GraphEdgeDTO {

    private String from;
    private String to;
    private String type;

    private Double score;
    private Double confidence;
    private Double lift;

    public GraphEdgeDTO(String from, String to, String type,
                        Double score, Double confidence, Double lift) {
        this.from = from;
        this.to = to;
        this.type = type;
        this.score = score;
        this.confidence = confidence;
        this.lift = lift;
    }
}
