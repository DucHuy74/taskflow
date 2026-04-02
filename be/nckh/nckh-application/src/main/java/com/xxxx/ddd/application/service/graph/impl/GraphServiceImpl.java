package com.xxxx.ddd.application.service.graph.impl;

import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.graph.GraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GraphServiceImpl implements GraphService {

    private final Neo4jClient neo4jClient;

    @Override
    public GraphResponse getWorkspaceGraph(
            String workspaceId,
            boolean includeSimilarity,
            boolean includeAssociation,
            double minScore,
            double minConfidence
    ) {

        // ===================== NODES =====================
        List<GraphNodeDTO> nodes = new ArrayList<>(
                neo4jClient.query("""
                    MATCH (t:Term {workspace_id: $ws})
                    RETURN DISTINCT
                        t.name AS id,
                        t.name AS label,
                        CASE 
                            WHEN t:Subject THEN 'SUBJECT'
                            WHEN t:Action THEN 'ACTION'
                            WHEN t:Object THEN 'OBJECT'
                            ELSE 'TERM'
                        END AS type
                """)
                        .bind(workspaceId).to("ws")
                        .fetchAs(GraphNodeDTO.class)
                        .mappedBy((ts, rec) -> new GraphNodeDTO(
                                rec.get("id").asString(),
                                rec.get("label").asString(),
                                rec.get("type").asString()
                        ))
                        .all()
        );


        // ===================== EDGES =====================
        StringBuilder query = new StringBuilder();

        // --- SVO ---
        query.append("""
            MATCH (a:Term {workspace_id: $ws})-[r:PERFORM|TARGET]->(b:Term {workspace_id: $ws})
            RETURN DISTINCT
                a.name AS from,
                b.name AS to,
                type(r) AS type,
                null AS score,
                null AS confidence,
                null AS lift
        """);

        // --- SIMILAR ---
        if (includeSimilarity) {
            query.append("""
                UNION
                MATCH (a:Term {workspace_id: $ws})-[r:SIMILAR]->(b:Term {workspace_id: $ws})
                WHERE r.score >= $minScore
                RETURN DISTINCT
                    a.name AS from,
                    b.name AS to,
                    'SIMILAR' AS type,
                    r.score AS score,
                    null AS confidence,
                    null AS lift
            """);
        }

        // --- ASSOCIATED ---
        if (includeAssociation) {
            query.append("""
                UNION
                MATCH (a:Term {workspace_id: $ws})-[r:ASSOCIATED]->(b:Term {workspace_id: $ws})
                WHERE r.confidence >= $minConfidence
                RETURN DISTINCT
                    a.name AS from,
                    b.name AS to,
                    'ASSOCIATED' AS type,
                    null AS score,
                    r.confidence AS confidence,
                    r.lift AS lift
            """);
        }

        List<GraphEdgeDTO> edges = new ArrayList<>(
                neo4jClient.query(query.toString())
                        .bind(workspaceId).to("ws")
                        .bind(minScore).to("minScore")
                        .bind(minConfidence).to("minConfidence")
                        .fetchAs(GraphEdgeDTO.class)
                        .mappedBy((ts, rec) -> new GraphEdgeDTO(
                                rec.get("from").asString(),
                                rec.get("to").asString(),
                                rec.get("type").asString(),
                                rec.get("score").isNull() ? null : rec.get("score").asDouble(),
                                rec.get("confidence").isNull() ? null : rec.get("confidence").asDouble(),
                                rec.get("lift").isNull() ? null : rec.get("lift").asDouble()
                        ))
                        .all()
        );

        return new GraphResponse(nodes, edges);
    }
}