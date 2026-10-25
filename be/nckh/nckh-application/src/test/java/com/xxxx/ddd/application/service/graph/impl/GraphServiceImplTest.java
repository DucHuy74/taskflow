package com.xxxx.ddd.application.service.graph.impl;

import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.repository.SprintRepository;
import com.xxxx.dddd.domain.repository.UserStoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.neo4j.core.Neo4jClient;

import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class GraphServiceImplTest {

    private final Neo4jClient neo4jClient = mock(Neo4jClient.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final SprintRepository sprintRepository = mock(SprintRepository.class);
    private final UserStoryRepository userStoryRepository = mock(UserStoryRepository.class);

    /** Captured Neo4j calls (query -> params) of the stubbed service. */
    private final Map<String, Map<String, Object>> queries = new LinkedHashMap<>();

    @Test
    void rejectsUnknownSourceBeforeQueryingNeo4j() {
        GraphServiceImpl service = new GraphServiceImpl(neo4jClient, access, sprintRepository, userStoryRepository);

        assertThatThrownBy(() -> service.getWorkspaceGraph(
                "ws-1", null, null, "LIVE", true, true, 0, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LIVE");

        verifyNoInteractions(neo4jClient, access);
    }

    @Test
    void sprintGraphIsScopedByStoryIdsFromRepository() {
        when(sprintRepository.findById("sp-1")).thenReturn(Optional.of(sprint("sp-1", "ws-1")));
        when(userStoryRepository.findBySprint_Id("sp-1")).thenReturn(List.of(story("s1"), story("s2")));

        GraphResponse response = stubbedService(fakeNeo4j()).getWorkspaceGraph(
                "ws-1", "sp-1", null, null, true, true, 0, 0);

        Map<String, Object> svoParams = paramsOf("[r:PERFORM|TARGET]");
        assertThat(svoParams.get("storyIds")).isEqualTo(List.of("s1", "s2"));
        assertThat(svoParams).doesNotContainKeys("sprintId", "backlogId");
        assertThat(queryContaining("[r:PERFORM|TARGET]"))
                .contains("r.story_id IN $storyIds")
                .doesNotContain("r.sprint_id");
        assertThat(paramsOf("[r:SIMILAR]").get("terms"))
                .asList().containsExactlyInAnyOrder("user", "login", "account");

        // the out-of-scope SIMILAR edge (login -> password) and ASSOCIATED edge (report -> export) are dropped
        assertThat(response.getEdges()).extracting(GraphEdgeDTO::type, GraphEdgeDTO::from, GraphEdgeDTO::to)
                .containsExactlyInAnyOrder(
                        tuple("PERFORM", "user", "login"),
                        tuple("TARGET", "login", "account"),
                        tuple("SIMILAR", "login", "account"),
                        tuple("RELATES_TO", "s1", "user"));
        assertThat(response.getEdges()).filteredOn(e -> "PERFORM".equals(e.type()))
                .allSatisfy(e -> assertThat(e.sprintId()).isEqualTo("sp-1"));
        assertThat(response.getNodes()).extracting(GraphNodeDTO::id)
                .containsExactlyInAnyOrder("account", "login", "user", "s1");
        assertThat(response.getNodes()).filteredOn(n -> "user".equals(n.id()))
                .singleElement().satisfies(n -> assertThat(n.type()).isEqualTo("SUBJECT"));
    }

    @Test
    void emptySprintReturnsEmptyGraphWithoutQueryingNeo4j() {
        when(sprintRepository.findById("sp-1")).thenReturn(Optional.of(sprint("sp-1", "ws-1")));
        when(userStoryRepository.findBySprint_Id("sp-1")).thenReturn(List.of());

        GraphResponse response = stubbedService(fakeNeo4j()).getWorkspaceGraph(
                "ws-1", "sp-1", null, null, true, true, 0, 0);

        assertThat(response.getNodes()).isEmpty();
        assertThat(response.getEdges()).isEmpty();
        assertThat(queries).isEmpty();
    }

    @Test
    void sprintOfAnotherWorkspaceIsNotFound() {
        when(sprintRepository.findById("sp-x")).thenReturn(Optional.of(sprint("sp-x", "ws-other")));

        assertThatThrownBy(() -> stubbedService(fakeNeo4j()).getWorkspaceGraph(
                "ws-1", "sp-x", null, null, true, true, 0, 0))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.SPRINT_NOT_FOUND));

        verify(userStoryRepository, never()).findBySprint_Id(anyString());
        assertThat(queries).isEmpty();
    }

    @Test
    void backlogGraphUsesWorkspaceBacklogStories() {
        when(userStoryRepository.findByWorkspace_IdAndSprintIsNull("ws-1")).thenReturn(List.of(story("s1")));

        stubbedService(fakeNeo4j()).getWorkspaceGraph("ws-1", null, "bl-1", null, false, false, 0, 0);

        assertThat(paramsOf("[r:PERFORM|TARGET]").get("storyIds")).isEqualTo(List.of("s1"));
        verifyNoInteractions(sprintRepository);
    }

    @Test
    void unscopedGraphKeepsAllAnalyticalEdges() {
        GraphResponse response = stubbedService(fakeNeo4j()).getWorkspaceGraph(
                "ws-1", null, null, null, true, true, 0, 0);

        assertThat(paramsOf("[r:PERFORM|TARGET]").get("storyIds")).isNull();
        assertThat(paramsOf("[r:SIMILAR]").get("terms")).isNull();
        assertThat(response.getEdges()).extracting(GraphEdgeDTO::type)
                .contains("SIMILAR", "SIMILAR", "ASSOCIATED");
        verifyNoInteractions(sprintRepository, userStoryRepository);
    }

    @Test
    void restrictToTermsKeepsOnlyEdgesBetweenScopedTerms() {
        List<GraphEdgeDTO> edges = List.of(
                GraphEdgeDTO.builder().from("login").to("account").type("SIMILAR").build(),
                GraphEdgeDTO.builder().from("login").to("password").type("SIMILAR").build(),
                GraphEdgeDTO.builder().from("report").to("export").type("ASSOCIATED").build()
        );

        assertThat(GraphServiceImpl.restrictToTerms(edges, Set.of("login", "account")))
                .extracting(GraphEdgeDTO::to).containsExactly("account");
        assertThat(GraphServiceImpl.restrictToTerms(edges, null)).hasSize(3);
        assertThat(GraphServiceImpl.restrictToTerms(edges, Set.of())).isEmpty();
    }

    // ===================== fixtures =====================

    private GraphServiceImpl stubbedService(Map<String, List<Map<String, Object>>> rowsByQueryMarker) {
        return new GraphServiceImpl(neo4jClient, access, sprintRepository, userStoryRepository) {
            @Override
            Collection<Map<String, Object>> run(String query, Map<String, Object> params) {
                queries.put(query, new HashMap<>(params));
                return rowsByQueryMarker.entrySet().stream()
                        .filter(entry -> query.contains(entry.getKey()))
                        .findFirst()
                        .map(Map.Entry::getValue)
                        .orElse(List.of());
            }
        };
    }

    /** Neo4j rows keyed by a marker contained in the matching query (term rows ignore the requested names). */
    private static Map<String, List<Map<String, Object>>> fakeNeo4j() {
        Map<String, List<Map<String, Object>>> rows = new LinkedHashMap<>();
        rows.put("[r:PERFORM|TARGET]", List.of(
                row("from", "user", "to", "login", "type", "PERFORM", "storyIds", List.of("s1"), "sources", List.of("BATCH")),
                row("from", "login", "to", "account", "type", "TARGET", "storyIds", List.of("s1"), "sources", List.of("BATCH"))
        ));
        rows.put("[r:SIMILAR]", List.of(
                row("from", "login", "to", "account", "score", 0.9),
                row("from", "login", "to", "password", "score", 0.8)
        ));
        rows.put("[r:ASSOCIATED]", List.of(
                row("from", "report", "to", "export", "confidence", 0.7, "lift", 1.2)
        ));
        rows.put("MATCH (s:UserStory", List.of(
                row("storyId", "s1", "subject", "user", "sources", List.of("BATCH")),
                row("storyId", "s-foreign", "subject", "user", "sources", List.of("BATCH"))
        ));
        rows.put("t.name IN $names", List.of(
                row("name", "user", "labels", List.of("Term", "Subject")),
                row("name", "login", "labels", List.of("Term", "Action")),
                row("name", "account", "labels", List.of("Term", "Object"))
        ));
        return rows;
    }

    private Map<String, Object> paramsOf(String marker) {
        return queries.get(queryContaining(marker));
    }

    private String queryContaining(String marker) {
        return queries.keySet().stream()
                .filter(query -> query.contains(marker))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No query containing " + marker));
    }

    private static Map<String, Object> row(Object... keyValues) {
        Map<String, Object> row = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            row.put((String) keyValues[i], keyValues[i + 1]);
        }
        return row;
    }

    private static Sprint sprint(String id, String workspaceId) {
        return Sprint.builder().id(id).workspace(Workspace.builder().id(workspaceId).build()).build();
    }

    private static UserStory story(String id) {
        return UserStory.builder().id(id).build();
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
