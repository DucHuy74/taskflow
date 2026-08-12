package com.xxxx.dddd.domain.event;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class GraphRebuildEvent {
    private String workspaceId;
}
