package com.xxxx.dddd.domain.model.graph;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraphRebuildEvent {
    private String type;
    private String workspaceId;
}
