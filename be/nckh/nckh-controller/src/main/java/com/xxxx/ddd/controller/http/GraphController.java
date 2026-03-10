package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.graph.GraphResponse;
import com.xxxx.ddd.application.service.graph.GraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/graph")
@RequiredArgsConstructor
public class GraphController {

    private final GraphService graphService;

    @GetMapping("/backlog/{id}")
    public GraphResponse getGraph(@PathVariable ("id") String id) {
        return graphService.getGraph(id);
    }

    @GetMapping("/sprint/{id}")
    public GraphResponse getSprintGraph(@PathVariable("id") String id) {
        return graphService.getSprintGraph(id);
    }
}