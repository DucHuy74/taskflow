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
            String sprintId,
            String backlogId,
            String source,
            boolean includeSimilarity,
            boolean includeAssociation,
            double minScore,
            double minConfidence
    ) {

        List<GraphNodeDTO> nodes = new ArrayList<>();

        // ===== TERM NODES =====
        List<GraphNodeDTO> termNodes = new ArrayList<>(
                neo4jClient.query("""
            MATCH (t:Term {workspace_id: $ws})
            WHERE EXISTS {
                MATCH (t)-[r]-()
                WHERE
                    type(r) IN ['SIMILAR', 'ASSOCIATED']
                    OR (
                        type(r) IN ['PERFORM', 'TARGET']
                        AND ($sprintId IS NULL OR r.sprint_id = $sprintId)
                        AND ($backlogId IS NULL OR r.backlog_id = $backlogId)
                    )
            }
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
                        .bind(source).to("source")
                        .bind(sprintId).to("sprintId")
                        .bind(backlogId).to("backlogId")
                        .fetchAs(GraphNodeDTO.class)
                        .mappedBy((ts, rec) -> new GraphNodeDTO(
                                rec.get("id").asString(),
                                rec.get("label").asString(),
                                rec.get("type").asString(),
                                null
                        ))
                        .all()
        );


        // ===== USER STORY NODES =====
        List<GraphNodeDTO> storyNodes = new ArrayList<>(
                neo4jClient.query("""
        MATCH (s:UserStory)
        MATCH ()-[r:PERFORM]->()
        WHERE
            r.story_id = s.id
            AND ($sprintId IS NULL OR r.sprint_id = $sprintId)
            AND ($backlogId IS NULL OR r.backlog_id = $backlogId)
    
        RETURN DISTINCT
            s.id AS id,
            s.id AS label,
            'USER_STORY' AS type,
            s.priority AS priority
    """)
                        .bind(workspaceId).to("ws")
                        .bind(source).to("source")
                        .bind(sprintId).to("sprintId")
                        .bind(backlogId).to("backlogId")
                        .fetchAs(GraphNodeDTO.class)
                        .mappedBy((ts, rec) -> new GraphNodeDTO(
                                rec.get("id").asString(),
                                rec.get("label").asString(),
                                rec.get("type").asString(),
                                rec.get("priority").isNull() ? null : rec.get("priority").asDouble()
                        ))
                        .all()
        );

        nodes.addAll(termNodes);
        nodes.addAll(storyNodes);


        // ===== EDGES =====
        List<String> parts = new ArrayList<>();

        // --- SVO ---
        parts.add("""
        MATCH (a:Term {workspace_id: $ws})-[r:PERFORM|TARGET]->(b:Term {workspace_id: $ws})
        WHERE
            ($sprintId IS NULL OR r.sprint_id = $sprintId)
            AND ($backlogId IS NULL OR r.backlog_id = $backlogId)
        RETURN DISTINCT
            a.name AS from,
            b.name AS to,
            type(r) AS type,
            null AS score,
            null AS confidence,
            null AS lift
        """);

        // --- USER STORY -> TERM ---
        parts.add("""
        MATCH (sub:Term)-[r:PERFORM]->()
        WHERE
            r.story_id IS NOT NULL
            AND ($sprintId IS NULL OR r.sprint_id = $sprintId)
            AND ($backlogId IS NULL OR r.backlog_id = $backlogId)
        RETURN DISTINCT
            r.story_id AS from,
            sub.name AS to,
            'RELATES_TO' AS type,
            null AS score,
            null AS confidence,
            null AS lift
        """);

        // --- SIMILAR ---
        if (includeSimilarity) {
            parts.add("""
            MATCH (a:Term {workspace_id: $ws})-[r:SIMILAR]->(b:Term {workspace_id: $ws})
            WHERE r.source = $source AND r.score >= $minScore
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
            parts.add("""
            MATCH (a:Term {workspace_id: $ws})-[r:ASSOCIATED]->(b:Term {workspace_id: $ws})
            WHERE r.source = $source AND r.confidence >= $minConfidence
            RETURN DISTINCT
                a.name AS from,
                b.name AS to,
                'ASSOCIATED' AS type,
                null AS score,
                r.confidence AS confidence,
                r.lift AS lift
        """);
        }

        String finalQuery = String.join("\nUNION\n", parts);

        List<GraphEdgeDTO> edges = new ArrayList<>(
                neo4jClient.query(finalQuery)
                        .bind(workspaceId).to("ws")
                        .bind(sprintId).to("sprintId")
                        .bind(backlogId).to("backlogId")
                        .bind(minScore).to("minScore")
                        .bind(minConfidence).to("minConfidence")
                        .bind(source).to("source")
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