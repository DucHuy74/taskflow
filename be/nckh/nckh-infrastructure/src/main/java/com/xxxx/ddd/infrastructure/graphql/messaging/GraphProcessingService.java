package com.xxxx.ddd.infrastructure.graphql.messaging;

import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import com.xxxx.dddd.domain.model.graph.AnalyzedStory;
import com.xxxx.dddd.domain.service.graph.UserStoryAnalyzer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GraphProcessingService {

    private final UserStoryAnalyzer analyzer;
    private final Neo4jClient neo4jClient;

    public void process(UserStoryCreatedEvent event) {

        AnalyzedStory analyzed = analyzer.analyze(event.storyText());

        Map<String, Object> params = new HashMap<>();

        params.put("id", event.id());
        params.put("storyText", event.storyText());
        params.put("actor", analyzed.actor());
        params.put("action", analyzed.action());
        params.put("object", analyzed.object());
        params.put("backlogId", event.backlogId());
        params.put("workspaceId", event.workspaceId());
        params.put("sprintId", event.sprintId());


        neo4jClient.query("""
MERGE (ws:Workspace {id:$workspaceId})
MERGE (us:UserStory {id:$id})
SET us.storyText = $storyText

// ================= BACKLOG =================
WITH us, $backlogId AS backlogId

// Nếu backlogId = null → xóa khỏi backlog
OPTIONAL MATCH (b:Backlog)-[r:CONTAINS]->(us)
WHERE backlogId IS NULL
DELETE r

WITH us, backlogId

// Nếu backlogId != null → tạo relation
FOREACH (_ IN CASE WHEN backlogId IS NOT NULL THEN [1] ELSE [] END |
     MERGE (b:Backlog {id:backlogId})
     MERGE (ws)-[:HAS_BACKLOG]->(b)
     MERGE (b)-[:CONTAINS]->(us)
)

// ================= SPRINT =================
WITH us, $sprintId AS sprintId

// Nếu sprintId = null → xóa khỏi sprint
OPTIONAL MATCH (us)-[r:IN_SPRINT]->(s:Sprint)
WHERE sprintId IS NULL
DELETE r

WITH us, sprintId

// Nếu sprintId != null → tạo relation
FOREACH (_ IN CASE WHEN sprintId IS NOT NULL THEN [1] ELSE [] END |
     MERGE (s:Sprint {id:sprintId})
     MERGE (us)-[:IN_SPRINT]->(s)
)

// ================= SEMANTIC GRAPH =================
WITH us

OPTIONAL MATCH (us)-[oldRel]->()
WHERE type(oldRel) IN ['HAS_ACTOR','PERFORMS','TARGETS']
DELETE oldRel

WITH us

MERGE (actor:Actor {name:$actor})
MERGE (action:Action {name:$action})
MERGE (obj:Object {name:$object})

MERGE (us)-[:HAS_ACTOR]->(actor)
MERGE (us)-[:PERFORMS]->(action)
MERGE (us)-[:TARGETS]->(obj)
""")
                .bindAll(params)
                .run();

    }
}
