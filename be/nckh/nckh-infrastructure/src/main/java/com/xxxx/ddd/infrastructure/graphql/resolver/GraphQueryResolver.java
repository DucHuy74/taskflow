package com.xxxx.ddd.infrastructure.graphql.resolver;

import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.ArrayList;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class GraphQueryResolver {

    private final Neo4jClient neo4jClient;
    
    @QueryMapping
    public GraphResponse backlogGraph(@Argument String backlogId) {

        List<GraphNodeDTO> nodes = new ArrayList<>(
                neo4jClient.query("""
        MATCH (b:Backlog {id:$backlogId})-[:CONTAINS]->(us:UserStory)
        OPTIONAL MATCH (us)-[r]-(n)
        WITH collect(DISTINCT us) + collect(DISTINCT n) AS allNodes
        UNWIND allNodes AS node
        RETURN DISTINCT
            coalesce(node.id, toString(id(node))) AS id,
            coalesce(node.name, node.id) AS label,
            labels(node)[0] AS type
    """)
                        .bind(backlogId).to("backlogId")
                        .fetchAs(GraphNodeDTO.class)
                        .mappedBy((ts, rec) -> new GraphNodeDTO(
                                rec.get("id").asString(),
                                rec.get("label").asString(),
                                rec.get("type").asString()
                        ))
                        .all()
        );

        List<GraphEdgeDTO> edges = new ArrayList<>(
                neo4jClient.query("""
        MATCH (b:Backlog {id:$backlogId})-[:CONTAINS]->(us:UserStory)
        MATCH (us)-[r]-(n)
        RETURN DISTINCT
            coalesce(us.id, toString(id(us))) AS from,
            coalesce(n.id, toString(id(n))) AS to,
            type(r) AS type
    """)
                        .bind(backlogId).to("backlogId")
                        .fetchAs(GraphEdgeDTO.class)
                        .mappedBy((ts, rec) -> new GraphEdgeDTO(
                                rec.get("from").asString(),
                                rec.get("to").asString(),
                                rec.get("type").asString()
                        ))
                        .all()
        );

        return new GraphResponse(nodes, edges);
    }

    @QueryMapping
    public GraphResponse sprintGraph(@Argument String sprintId) {

        List<GraphNodeDTO> nodes = new ArrayList<>(
                neo4jClient.query("""
        MATCH (s:Sprint {id:$sprintId})<-[:IN_SPRINT]-(us:UserStory)
        OPTIONAL MATCH (us)-[r]-(n)
        WITH collect(DISTINCT us) + collect(DISTINCT n) AS allNodes
        UNWIND allNodes AS node
        RETURN DISTINCT
            coalesce(node.id, toString(id(node))) AS id,
            coalesce(node.name, node.id) AS label,
            labels(node)[0] AS type
    """)
                        .bind(sprintId).to("sprintId")
                        .fetchAs(GraphNodeDTO.class)
                        .mappedBy((ts, rec) -> new GraphNodeDTO(
                                rec.get("id").asString(),
                                rec.get("label").asString(),
                                rec.get("type").asString()
                        ))
                        .all()
        );

        List<GraphEdgeDTO> edges = new ArrayList<>(
                neo4jClient.query("""
        MATCH (s:Sprint {id:$sprintId})<-[:IN_SPRINT]-(us:UserStory)
        MATCH (us)-[r]-(n)
        RETURN DISTINCT
            coalesce(us.id, toString(id(us))) AS from,
            coalesce(n.id, toString(id(n))) AS to,
            type(r) AS type
    """)
                        .bind(sprintId).to("sprintId")
                        .fetchAs(GraphEdgeDTO.class)
                        .mappedBy((ts, rec) -> new GraphEdgeDTO(
                                rec.get("from").asString(),
                                rec.get("to").asString(),
                                rec.get("type").asString()
                        ))
                        .all()
        );

        return new GraphResponse(nodes, edges);
    }
}