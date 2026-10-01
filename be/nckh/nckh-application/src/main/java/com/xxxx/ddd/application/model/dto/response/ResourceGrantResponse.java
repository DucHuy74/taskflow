package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResourceGrantResponse {
    String id;
    String workspaceId;
    ResourceType resourceType;
    String resourceId;
    PrincipalType principalType;
    String principalId;
    Permission permission;
    PermissionEffect effect;
}
