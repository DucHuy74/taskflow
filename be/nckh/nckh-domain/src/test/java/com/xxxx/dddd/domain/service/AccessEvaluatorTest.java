package com.xxxx.dddd.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.xxxx.dddd.domain.model.entity.workspace.ResourceGrant;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AccessEvaluatorTest {

    @Test
    void explicitDenyWinsOverRoleAndAllow() {
        ResourceGrant allow = grant(Permission.ISSUE_EDIT, PermissionEffect.ALLOW);
        ResourceGrant deny = grant(Permission.ISSUE_EDIT, PermissionEffect.DENY);

        boolean result = AccessEvaluator.isAllowed(
                Set.of(Permission.ISSUE_EDIT),
                List.of(allow, deny),
                "user-1",
                WorkspaceRoleType.MEMBER,
                Permission.ISSUE_EDIT);

        assertThat(result).isFalse();
    }

    @Test
    void fullControlAllowMatchesEveryAction() {
        boolean result = AccessEvaluator.isAllowed(
                Set.of(),
                List.of(grant(Permission.ACL_FULL_CONTROL, PermissionEffect.ALLOW)),
                "user-1",
                WorkspaceRoleType.MEMBER,
                Permission.WORKLOG_DELETE);

        assertThat(result).isTrue();
    }

    private ResourceGrant grant(Permission permission, PermissionEffect effect) {
        return ResourceGrant.builder()
                .principalType(PrincipalType.USER)
                .principalId("user-1")
                .permission(permission)
                .effect(effect)
                .build();
    }
}
