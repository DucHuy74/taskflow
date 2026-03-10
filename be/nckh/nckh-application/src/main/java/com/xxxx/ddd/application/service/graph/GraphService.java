package com.xxxx.ddd.application.service.graph;

import com.xxxx.ddd.application.model.dto.graph.GraphResponse;

public interface GraphService {
    GraphResponse getGraph(String sprintId);
    GraphResponse getSprintGraph(String sprintId);
}