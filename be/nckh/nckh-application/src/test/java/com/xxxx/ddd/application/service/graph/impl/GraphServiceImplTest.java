package com.xxxx.ddd.application.service.graph.impl;

import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.data.neo4j.core.Neo4jClient;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class GraphServiceImplTest {

    @Test
    void rejectsUnknownSourceBeforeQueryingNeo4j() {
        Neo4jClient neo4jClient = mock(Neo4jClient.class);
        WorkspaceAccessService access = mock(WorkspaceAccessService.class);
        GraphServiceImpl service = new GraphServiceImpl(neo4jClient, access);

        assertThatThrownBy(() -> service.getWorkspaceGraph(
                "ws-1", null, null, "LIVE", true, true, 0, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LIVE");

        verifyNoInteractions(neo4jClient, access);
    }

    @Test
    void aggregatesSvoRowIntoWeightedEdge() {
        Map<String, Object> row = new HashMap<>();
        row.put("from", "user");
        row.put("to", "login");
        row.put("type", "PERFORM");
        row.put("storyIds", List.of("s2", "s1", "s2"));
        row.put("sources", List.of("REALTIME"));

        GraphEdgeDTO edge = GraphServiceImpl.toSvoEdge(row, "sp-1", null);

        assertThat(edge.storyIds()).containsExactly("s1", "s2");
        assertThat(edge.weight()).isEqualTo(2);
        assertThat(edge.storyId()).isEqualTo("s1");
        assertThat(edge.sprintId()).isEqualTo("sp-1");
        assertThat(edge.backlogId()).isNull();
        assertThat(edge.source()).isEqualTo("REALTIME");
    }

    @Test
    void mixedSourcesYieldNullSource() {
        assertThat(GraphServiceImpl.singleSource(List.of("REALTIME", "BATCH"))).isNull();
        assertThat(GraphServiceImpl.singleSource(Arrays.asList("BATCH", null))).isEqualTo("BATCH");
        assertThat(GraphServiceImpl.singleSource(List.of())).isNull();
    }

    @Test
    void derivesRolesFromEdgeDirection() {
        List<GraphEdgeDTO> edges = List.of(
                GraphEdgeDTO.builder().from("user").to("login").type("PERFORM").build(),
                GraphEdgeDTO.builder().from("login").to("account").type("TARGET").build(),
                GraphEdgeDTO.builder().from("account").to("view").type("PERFORM").build()
        );

        Map<String, Set<String>> roles = GraphServiceImpl.deriveEdgeRoles(edges);

        assertThat(roles.get("user")).containsExactly("SUBJECT");
        assertThat(roles.get("login")).containsExactly("ACTION");
        assertThat(roles.get("account")).containsExactlyInAnyOrder("OBJECT", "SUBJECT");
        assertThat(roles.get("view")).containsExactly("ACTION");
    }

    @Test
    void mergesLabelsWithEdgeRolesAndComputesType() {
        List<String> single = GraphServiceImpl.mergeRoles(List.of("Term", "Subject"), Set.of("SUBJECT"));
        assertThat(single).containsExactly("SUBJECT");
        assertThat(GraphServiceImpl.nodeType(single)).isEqualTo("SUBJECT");

        List<String> mixed = GraphServiceImpl.mergeRoles(List.of("Term", "Object"), Set.of("SUBJECT"));
        assertThat(mixed).containsExactly("SUBJECT", "OBJECT");
        assertThat(GraphServiceImpl.nodeType(mixed)).isEqualTo("TERM");

        List<String> unknown = GraphServiceImpl.mergeRoles(List.of("Term"), Set.of());
        assertThat(unknown).isEmpty();
        assertThat(GraphServiceImpl.nodeType(unknown)).isEqualTo("TERM");
    }
}
