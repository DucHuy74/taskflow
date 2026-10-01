package com.xxxx.ddd.infrastructure.graphql.resolver;

import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.graph.GraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class GraphQueryResolver {

    private final GraphService graphService;

    @QueryMapping
    public GraphResponse workspaceGraph(
            @Argument("workspaceId") String workspaceId,
            @Argument("sprintId") String sprintId,
            @Argument("backlogId") String backlogId,
            @Argument("source") String source,
            @Argument("includeSimilarity") Boolean includeSimilarity,
            @Argument("includeAssociation") Boolean includeAssociation,
            @Argument("minScore") Double minScore,
            @Argument("minConfidence") Double minConfidence

    ) {

        boolean useSimilarity = includeSimilarity == null || includeSimilarity;
        boolean useAssociation = includeAssociation == null || includeAssociation;
        double score = minScore != null ? minScore : 0.0;
        double confidence = minConfidence != null ? minConfidence : 0.0;
        String graphSource = (source == null) ? "REALTIME" : source;
        if (!graphSource.equals("REALTIME") && !graphSource.equals("BATCH")) {
            throw new IllegalArgumentException("Invalid source: " + source);
        }

        return graphService.getWorkspaceGraph(
                workspaceId,
                sprintId,
                backlogId,
                graphSource,
                useSimilarity,
                useAssociation,
                score,
                confidence
        );
    }
}