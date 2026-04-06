package com.xxxx.ddd.application.service.graph;

import com.xxxx.ddd.application.model.dto.graph.GraphResponse;

public interface GraphService {
    GraphResponse getWorkspaceGraph(
            String workspaceId,
            String sprintId,
            String backlogId,
            boolean includeSimilarity,
            boolean includeAssociation,
            double minScore,
            double minConfidence
    );
}