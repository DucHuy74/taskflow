package com.xxxx.ddd.application.model.dto.graph;

public record GraphNodeDTO(
        String id,
        String label,
        String type,
        Double priority
) {}