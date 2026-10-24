package com.xxxx.ddd.application.model.dto.graph;

import lombok.Builder;

import java.util.List;

/**
 * Node of the workspace graph.
 * <ul>
 *     <li>Term nodes: id/label = term name, type = SUBJECT|ACTION|OBJECT when the term has exactly one role,
 *     otherwise TERM; roles = union of Neo4j role labels and roles derived from PERFORM/TARGET edges in scope.</li>
 *     <li>Story nodes: id/label = story id, type = USER_STORY, roles = [].</li>
 * </ul>
 */
@Builder
public record GraphNodeDTO(
        String id,
        String label,
        String type,
        Double priority,
        Integer degree,
        Double betweenness,
        List<String> roles,
        Double graphRelevanceScore,
        Double duplicateScore
) {
    public GraphNodeDTO {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }
}
