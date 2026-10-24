package com.xxxx.ddd.application.service.graph.impl;

import com.xxxx.ddd.application.model.dto.graph.GraphEdgeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.graph.GraphService;
import com.xxxx.dddd.domain.model.enums.Permission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class GraphServiceImpl implements GraphService {

    static final String SOURCE_REALTIME = "REALTIME";
    static final String SOURCE_BATCH = "BATCH";

    static final String TYPE_PERFORM = "PERFORM";
    static final String TYPE_TARGET = "TARGET";
    static final String TYPE_SIMILAR = "SIMILAR";
    static final String TYPE_ASSOCIATED = "ASSOCIATED";
    static final String TYPE_RELATES_TO = "RELATES_TO";

    static final String ROLE_SUBJECT = "SUBJECT";
    static final String ROLE_ACTION = "ACTION";
    static final String ROLE_OBJECT = "OBJECT";
    static final String NODE_TERM = "TERM";
    static final String NODE_USER_STORY = "USER_STORY";

    /** Stable role order used for the {@code roles} list. */
    private static final List<String> ROLE_ORDER = List.of(ROLE_SUBJECT, ROLE_ACTION, ROLE_OBJECT);

    /**
     * Filter applied to PERFORM/TARGET relationships only. SIMILAR/ASSOCIATED are batch-only analytics edges
     * (always written with source BATCH by the analyzer) and are never filtered by source/sprint/backlog.
     */
    private static final String SVO_FILTER = """
            ($sprintId IS NULL OR r.sprint_id = $sprintId)
            AND ($backlogId IS NULL OR r.backlog_id = $backlogId)
            AND ($source IS NULL OR r.source = $source)
            """;

    private static final String SVO_EDGES_QUERY = """
            MATCH (a:Term {workspace_id: $ws})-[r:PERFORM|TARGET]->(b:Term {workspace_id: $ws})
            WHERE %s
            RETURN
                a.name AS from,
                b.name AS to,
                type(r) AS type,
                collect(DISTINCT r.story_id) AS storyIds,
                collect(DISTINCT r.source) AS sources
            """.formatted(SVO_FILTER);

    private static final String STORY_QUERY = """
            MATCH (sub:Term {workspace_id: $ws})-[r:PERFORM]->(:Term {workspace_id: $ws})
            WHERE r.story_id IS NOT NULL AND %s
            WITH r.story_id AS storyId, sub.name AS subject, collect(DISTINCT r.source) AS sources
            MATCH (s:UserStory {id: storyId})
            WHERE s.workspace_id = $ws
            RETURN
                storyId,
                subject,
                sources,
                s.priority AS priority,
                s.graph_relevance_score AS graphRelevanceScore,
                s.duplicate_score AS duplicateScore
            """.formatted(SVO_FILTER);

    private static final String SIMILAR_QUERY = """
            MATCH (a:Term {workspace_id: $ws})-[r:SIMILAR]->(b:Term {workspace_id: $ws})
            WHERE r.score >= $minScore
            RETURN a.name AS from, b.name AS to, max(r.score) AS score
            """;

    private static final String ASSOCIATED_QUERY = """
            MATCH (a:Term {workspace_id: $ws})-[r:ASSOCIATED]->(b:Term {workspace_id: $ws})
            WHERE r.confidence >= $minConfidence
            WITH a, b, r ORDER BY r.confidence DESC
            WITH a, b, collect(r)[0] AS best
            RETURN a.name AS from, b.name AS to, best.confidence AS confidence, best.lift AS lift
            """;

    private static final String TERM_QUERY = """
            MATCH (t:Term {workspace_id: $ws})
            WHERE t.name IN $names
            RETURN
                t.name AS name,
                labels(t) AS labels,
                t.degree AS degree,
                t.betweenness AS betweenness
            """;

    private final Neo4jClient neo4jClient;
    private final WorkspaceAccessService workspaceAccessService;

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
        if (source != null && !SOURCE_REALTIME.equals(source) && !SOURCE_BATCH.equals(source)) {
            throw new IllegalArgumentException("Invalid source: " + source + " (expected REALTIME or BATCH)");
        }

        workspaceAccessService.require(workspaceId, Permission.WORKSPACE_BROWSE);

        Map<String, Object> params = new HashMap<>();
        params.put("ws", workspaceId);
        params.put("sprintId", sprintId);
        params.put("backlogId", backlogId);
        params.put("source", source);
        params.put("minScore", minScore);
        params.put("minConfidence", minConfidence);

        List<GraphEdgeDTO> edges = new ArrayList<>();

        // ===== PERFORM / TARGET (filtered by sprint/backlog/source), aggregated per (from, to, type) =====
        List<GraphEdgeDTO> svoEdges = run(SVO_EDGES_QUERY, params).stream()
                .map(row -> toSvoEdge(row, sprintId, backlogId))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(GraphEdgeDTO::type)
                        .thenComparing(GraphEdgeDTO::from)
                        .thenComparing(GraphEdgeDTO::to))
                .toList();
        edges.addAll(svoEdges);

        // ===== SIMILAR (batch analytics, never filtered by source) =====
        if (includeSimilarity) {
            run(SIMILAR_QUERY, params).forEach(row -> edges.add(GraphEdgeDTO.builder()
                    .from(asString(row.get("from")))
                    .to(asString(row.get("to")))
                    .type(TYPE_SIMILAR)
                    .score(asDouble(row.get("score")))
                    .storyIds(List.of())
                    .source(SOURCE_BATCH)
                    .build()));
        }

        // ===== ASSOCIATED (batch analytics, never filtered by source) =====
        if (includeAssociation) {
            run(ASSOCIATED_QUERY, params).forEach(row -> edges.add(GraphEdgeDTO.builder()
                    .from(asString(row.get("from")))
                    .to(asString(row.get("to")))
                    .type(TYPE_ASSOCIATED)
                    .confidence(asDouble(row.get("confidence")))
                    .lift(asDouble(row.get("lift")))
                    .storyIds(List.of())
                    .source(SOURCE_BATCH)
                    .build()));
        }

        // ===== USER STORY nodes + RELATES_TO edges (one per story -> subject term) =====
        Map<String, GraphNodeDTO> storyNodes = new LinkedHashMap<>();
        List<GraphEdgeDTO> relatesTo = new ArrayList<>();
        for (Map<String, Object> row : run(STORY_QUERY, params)) {
            String storyId = asString(row.get("storyId"));
            String subject = asString(row.get("subject"));
            if (storyId == null || subject == null) {
                continue;
            }
            storyNodes.computeIfAbsent(storyId, id -> GraphNodeDTO.builder()
                    .id(id)
                    .label(id)
                    .type(NODE_USER_STORY)
                    .priority(asDouble(row.get("priority")))
                    .graphRelevanceScore(asDouble(row.get("graphRelevanceScore")))
                    .duplicateScore(asDouble(row.get("duplicateScore")))
                    .roles(List.of())
                    .build());
            relatesTo.add(GraphEdgeDTO.builder()
                    .from(storyId)
                    .to(subject)
                    .type(TYPE_RELATES_TO)
                    .storyId(storyId)
                    .storyIds(List.of(storyId))
                    .sprintId(sprintId)
                    .backlogId(backlogId)
                    .source(singleSource(asStringList(row.get("sources"))))
                    .build());
        }

        // ===== TERM nodes: every term that is an endpoint of an edge in scope =====
        Set<String> termNames = new LinkedHashSet<>();
        for (GraphEdgeDTO edge : edges) {
            termNames.add(edge.from());
            termNames.add(edge.to());
        }
        relatesTo.forEach(edge -> termNames.add(edge.to()));
        termNames.remove(null);

        Map<String, Set<String>> edgeRoles = deriveEdgeRoles(svoEdges);

        List<GraphNodeDTO> nodes = new ArrayList<>();
        if (!termNames.isEmpty()) {
            params.put("names", new ArrayList<>(termNames));
            Map<String, GraphNodeDTO> termNodes = new TreeMap<>();
            for (Map<String, Object> row : run(TERM_QUERY, params)) {
                String name = asString(row.get("name"));
                if (name == null) {
                    continue;
                }
                List<String> roles = mergeRoles(
                        asStringList(row.get("labels")),
                        edgeRoles.getOrDefault(name, Set.of())
                );
                termNodes.put(name, GraphNodeDTO.builder()
                        .id(name)
                        .label(name)
                        .type(nodeType(roles))
                        .degree(asInteger(row.get("degree")))
                        .betweenness(asDouble(row.get("betweenness")))
                        .roles(roles)
                        .build());
            }
            nodes.addAll(termNodes.values());
        }
        nodes.addAll(storyNodes.values());
        edges.addAll(relatesTo);

        return new GraphResponse(nodes, edges);
    }

    private Collection<Map<String, Object>> run(String query, Map<String, Object> params) {
        Neo4jClient.RunnableSpec spec = neo4jClient.query(query);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            spec = spec.bind(entry.getValue()).to(entry.getKey());
        }
        return spec.fetch().all();
    }

    // ===================== pure helpers (unit tested) =====================

    static GraphEdgeDTO toSvoEdge(Map<String, Object> row, String sprintId, String backlogId) {
        String from = asString(row.get("from"));
        String to = asString(row.get("to"));
        String type = asString(row.get("type"));
        if (from == null || to == null || type == null) {
            return null;
        }
        List<String> storyIds = asStringList(row.get("storyIds")).stream()
                .distinct()
                .sorted()
                .toList();
        return GraphEdgeDTO.builder()
                .from(from)
                .to(to)
                .type(type)
                .storyIds(storyIds)
                .weight(storyIds.size())
                .storyId(storyIds.isEmpty() ? null : storyIds.get(0))
                .sprintId(sprintId)
                .backlogId(backlogId)
                .source(singleSource(asStringList(row.get("sources"))))
                .build();
    }

    /** Returns the shared source when every contributing relationship has the same one, otherwise null. */
    static String singleSource(List<String> sources) {
        Set<String> distinct = new HashSet<>(sources);
        distinct.remove(null);
        return distinct.size() == 1 ? distinct.iterator().next() : null;
    }

    /**
     * Roles implied by the PERFORM/TARGET edges in the current filter scope:
     * outgoing PERFORM = SUBJECT, incoming PERFORM or outgoing TARGET = ACTION, incoming TARGET = OBJECT.
     */
    static Map<String, Set<String>> deriveEdgeRoles(Collection<GraphEdgeDTO> svoEdges) {
        Map<String, Set<String>> roles = new HashMap<>();
        for (GraphEdgeDTO edge : svoEdges) {
            if (TYPE_PERFORM.equals(edge.type())) {
                roles.computeIfAbsent(edge.from(), k -> new HashSet<>()).add(ROLE_SUBJECT);
                roles.computeIfAbsent(edge.to(), k -> new HashSet<>()).add(ROLE_ACTION);
            } else if (TYPE_TARGET.equals(edge.type())) {
                roles.computeIfAbsent(edge.from(), k -> new HashSet<>()).add(ROLE_ACTION);
                roles.computeIfAbsent(edge.to(), k -> new HashSet<>()).add(ROLE_OBJECT);
            }
        }
        return roles;
    }

    /** Union of Neo4j role labels (:Subject/:Action/:Object) and edge-derived roles, in SUBJECT/ACTION/OBJECT order. */
    static List<String> mergeRoles(Collection<String> labels, Collection<String> edgeRoles) {
        Set<String> all = new HashSet<>(edgeRoles);
        for (String label : labels) {
            if (label == null) {
                continue;
            }
            switch (label) {
                case "Subject" -> all.add(ROLE_SUBJECT);
                case "Action" -> all.add(ROLE_ACTION);
                case "Object" -> all.add(ROLE_OBJECT);
                default -> {
                }
            }
        }
        return ROLE_ORDER.stream().filter(all::contains).toList();
    }

    /** Single role when unambiguous, otherwise TERM (mixed or unknown). */
    static String nodeType(List<String> roles) {
        return roles.size() == 1 ? roles.get(0) : NODE_TERM;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static Double asDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private static Integer asInteger(Object value) {
        return value instanceof Number number ? (int) Math.round(number.doubleValue()) : null;
    }

    private static List<String> asStringList(Object value) {
        if (!(value instanceof Collection<?> collection)) {
            return List.of();
        }
        List<String> result = new ArrayList<>(collection.size());
        for (Object item : collection) {
            if (item != null) {
                result.add(item.toString());
            }
        }
        return result;
    }
}
