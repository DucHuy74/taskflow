package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.graph.GraphNodeDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GraphNodeMapper {

    @Mapping(target = "id", expression = "java(node.get(\"id\").asString())")
    @Mapping(target = "label", expression = "java(resolveLabel(node))")
    @Mapping(target = "type", expression = "java(resolveType(node))")
    GraphNodeDTO toDto(org.neo4j.driver.types.Node node);

    default String resolveLabel(org.neo4j.driver.types.Node node) {
        if (node.containsKey("title")) {
            return node.get("title").asString();
        }
        if (node.containsKey("name")) {
            return node.get("name").asString();
        }
        return node.get("id").asString();
    }

    default String resolveType(org.neo4j.driver.types.Node node) {
        return node.labels().iterator().next();
    }
}
