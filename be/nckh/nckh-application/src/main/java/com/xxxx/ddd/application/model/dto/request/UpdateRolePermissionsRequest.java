package com.xxxx.ddd.application.model.dto.request;

import com.xxxx.dddd.domain.model.enums.Permission;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateRolePermissionsRequest {
    private Set<Permission> permissions;
}
