package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import lombok.Data;

@Data
public class ResourceGrantRequest {
    private ResourceType resourceType;
    private String resourceId;
    private PrincipalType principalType;
    private String principalId;
    private Permission permission;
    private PermissionEffect effect;
}
