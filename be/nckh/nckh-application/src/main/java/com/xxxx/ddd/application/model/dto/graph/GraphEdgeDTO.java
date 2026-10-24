package com.xxxx.ddd.application.model.dto.graph;

import lombok.Builder;

import java.util.List;

/**
 * Edge of the workspace graph.
 * PERFORM/TARGET edges are aggregated per (from, to, type): storyIds = distinct stories contributing the edge,
 * weight = storyIds.size(), storyId = first of storyIds (kept for older clients).
 * SIMILAR/ASSOCIATED edges are produced by the batch analyzer and always carry source BATCH.
 */
@Builder
public record GraphEdgeDTO(
        String from,
        String to,
        String type,
        Double score,
        Double confidence,
        Double lift,
        String storyId,
        List<String> storyIds,
        Integer weight,
        String sprintId,
        String backlogId,
        String source
) {
}
