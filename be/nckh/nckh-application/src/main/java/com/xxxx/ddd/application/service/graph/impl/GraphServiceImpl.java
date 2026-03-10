package com.xxxx.ddd.application.service.graph.impl;

import com.xxxx.ddd.application.mapper.GraphNodeMapper;
import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.graph.GraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GraphServiceImpl implements GraphService {

    private final Neo4jClient neo4jClient;
    private final GraphNodeMapper graphNodeMapper;

    @Override
    public GraphResponse getGraph(String backlogId) {

        var rows = neo4jClient.query("""
        MATCH (b:Backlog {id:$backlogId})-[:CONTAINS]->(us:UserStory)
        OPTIONAL MATCH (us)-[r]->(n)
        RETURN us, r, n,
               startNode(r) AS fromNode,
               endNode(r)   AS toNode
    """)
                .bind(backlogId).to("backlogId")
                .fetch()
                .all();

        Map<String, GraphNodeDTO> nodeMap = new LinkedHashMap<>();
        List<GraphEdgeDTO> edges = new ArrayList<>();

        for (Map<String, Object> row : rows) {

            if (row.get("us") instanceof org.neo4j.driver.types.Node us) {
                nodeMap.putIfAbsent(
                        us.get("id").asString(),
                        graphNodeMapper.toDto(us)
                );
            }

            if (row.get("n") instanceof org.neo4j.driver.types.Node n) {
                String id = n.containsKey("id")
                        ? n.get("id").asString()
                        : n.get("name").asString();

                nodeMap.putIfAbsent(id, graphNodeMapper.toDto(n));
            }

            if (row.get("r") instanceof org.neo4j.driver.types.Relationship r
                    && row.get("fromNode") instanceof org.neo4j.driver.types.Node from
                    && row.get("toNode") instanceof org.neo4j.driver.types.Node to) {

                edges.add(new GraphEdgeDTO(
                        from.get("id").asString(),
                        to.containsKey("id")
                                ? to.get("id").asString()
                                : to.get("name").asString(),
                        r.type()
                ));
            }
        }

        return new GraphResponse(
                new ArrayList<>(nodeMap.values()),
                edges
        );
    }

    @Override
    public GraphResponse getSprintGraph(String sprintId) {

        var rows = neo4jClient.query("""
        MATCH (s:Sprint {id:$sprintId})<-[:IN_SPRINT]-(us:UserStory)
        OPTIONAL MATCH (us)-[r]-(n)
        RETURN us, r, n,
               startNode(r) AS fromNode,
               endNode(r)   AS toNode
    """)
                .bind(sprintId).to("sprintId")
                .fetch()
                .all();

        Map<String, GraphNodeDTO> nodeMap = new LinkedHashMap<>();
        List<GraphEdgeDTO> edges = new ArrayList<>();

        for (Map<String, Object> row : rows) {

            if (row.get("us") instanceof org.neo4j.driver.types.Node us) {
                nodeMap.putIfAbsent(
                        us.get("id").asString(),
                        graphNodeMapper.toDto(us)
                );
            }

            if (row.get("n") instanceof org.neo4j.driver.types.Node n) {
                String id = n.containsKey("id")
                        ? n.get("id").asString()
                        : n.get("name").asString();

                nodeMap.putIfAbsent(id, graphNodeMapper.toDto(n));
            }

            if (row.get("r") instanceof org.neo4j.driver.types.Relationship r
                    && row.get("fromNode") instanceof org.neo4j.driver.types.Node from
                    && row.get("toNode") instanceof org.neo4j.driver.types.Node to) {

                edges.add(new GraphEdgeDTO(
                        from.get("id").asString(),
                        to.containsKey("id")
                                ? to.get("id").asString()
                                : to.get("name").asString(),
                        r.type()
                ));
            }
        }

        return new GraphResponse(
                new ArrayList<>(nodeMap.values()),
                edges
        );
    }
}