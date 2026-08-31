package com.xxxx.dddd.domain.model.permission;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Jira-style default scheme: Administrators / Members / Viewers.
 */
public final class DefaultPermissionMatrix {

    private DefaultPermissionMatrix() {
    }

    public static Set<Permission> of(WorkspaceRoleType role) {
        return switch (role) {
            case ADMIN -> EnumSet.allOf(Permission.class);
            case MEMBER -> EnumSet.of(
                    Permission.WORKSPACE_BROWSE,
                    Permission.MEMBER_VIEW,
                    Permission.SPRINT_VIEW,
                    Permission.SPRINT_CREATE,
                    Permission.SPRINT_EDIT,
                    Permission.SPRINT_MANAGE,
                    Permission.ISSUE_VIEW,
                    Permission.ISSUE_CREATE,
                    Permission.ISSUE_EDIT,
                    Permission.ISSUE_TRANSITION,
                    Permission.ISSUE_ASSIGN,
                    Permission.ISSUE_LINK,
                    Permission.ISSUE_MOVE,
                    Permission.COMMENT_ADD,
                    Permission.COMMENT_EDIT,
                    Permission.COMMENT_DELETE,
                    Permission.ATTACHMENT_ADD,
                    Permission.ATTACHMENT_DELETE,
                    Permission.WORKLOG_ADD,
                    Permission.WORKLOG_EDIT,
                    Permission.WORKLOG_DELETE,
                    Permission.WATCHER_MANAGE,
                    Permission.DEVELOPMENT_TOOLS_VIEW,
                    Permission.ACL_READ
            );
            case VIEWER -> EnumSet.of(
                    Permission.WORKSPACE_BROWSE,
                    Permission.MEMBER_VIEW,
                    Permission.SPRINT_VIEW,
                    Permission.ISSUE_VIEW,
                    Permission.COMMENT_ADD,
                    Permission.ATTACHMENT_ADD,
                    Permission.ACL_READ
            );
        };
    }

    public static Set<Permission> copyOf(WorkspaceRoleType role) {
        return Collections.unmodifiableSet(EnumSet.copyOf(of(role)));
    }
}
