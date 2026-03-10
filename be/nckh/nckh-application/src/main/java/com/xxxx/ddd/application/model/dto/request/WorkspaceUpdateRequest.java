package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.WorkspaceAccess;
import com.xxxx.dddd.domain.model.enums.WorkspaceType;
import lombok.Data;

@Data
public class WorkspaceUpdateRequest {
    private String name;
    private WorkspaceType type;
    private WorkspaceAccess access;
}
