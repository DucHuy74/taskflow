package com.xxxx.ddd.application.model.dto.graph;

import java.util.List;

public class GraphResponse {

    private List<GraphNodeDTO> nodes;
    private List<GraphEdgeDTO> edges;

    public GraphResponse(List<GraphNodeDTO> nodes,
                         List<GraphEdgeDTO> edges) {
        this.nodes = nodes;
        this.edges = edges;
    }

    public List<GraphNodeDTO> getNodes() {
        return nodes;
    }

    public List<GraphEdgeDTO> getEdges() {
        return edges;
    }
}
