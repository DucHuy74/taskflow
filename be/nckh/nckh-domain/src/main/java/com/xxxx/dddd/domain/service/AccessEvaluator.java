package com.xxxx.dddd.domain.service;

import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.List;
import java.util.Set;

/**
 * IAM/S3 evaluation: matching DENY wins, then matching ALLOW, then role matrix.
 * {@link Permission#ACL_FULL_CONTROL} on a grant matches any requested action.
 */
public final class AccessEvaluator {

    private AccessEvaluator() {
    }

    public static boolean isAllowed(
            Set<Permission> rolePermissions,
            List<ResourceGrant> grants,
            String userId,
            WorkspaceRoleType roleName,
            Permission requested
    ) {
        List<ResourceGrant> mine = grants.stream()
                .filter(g -> matchesPrincipal(g, userId, roleName))
                .toList();

        boolean denied = mine.stream()
                .filter(g -> g.getEffect() == PermissionEffect.DENY)
                .anyMatch(g -> matchesAction(g.getPermission(), requested));
        if (denied) {
            return false;
        }

        boolean allowed = mine.stream()
                .filter(g -> g.getEffect() == PermissionEffect.ALLOW)
                .anyMatch(g -> matchesAction(g.getPermission(), requested));
        if (allowed) {
            return true;
        }

        return rolePermissions != null && rolePermissions.contains(requested);
    }

    private static boolean matchesPrincipal(ResourceGrant grant, String userId, WorkspaceRoleType roleName) {
        if (grant.getPrincipalType() == PrincipalType.USER) {
            return grant.getPrincipalId().equals(userId);
        }
        return roleName != null && grant.getPrincipalId().equalsIgnoreCase(roleName.name());
    }

    private static boolean matchesAction(Permission grantPermission, Permission requested) {
        return grantPermission == Permission.ACL_FULL_CONTROL || grantPermission == requested;
    }
}
