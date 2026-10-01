package com.xxxx.dddd.domain.model.permission;

import static org.assertj.core.api.Assertions.assertThat;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import org.junit.jupiter.api.Test;

class DefaultPermissionMatrixTest {

    @Test
    void adminHasEveryPermission() {
        assertThat(DefaultPermissionMatrix.of(WorkspaceRoleType.ADMIN))
                .containsExactlyInAnyOrder(Permission.values());
    }

    @Test
    void memberCanCollaborateButCannotPerformAdminOnlyActions() {
        assertThat(DefaultPermissionMatrix.of(WorkspaceRoleType.MEMBER))
                .contains(
                        Permission.ISSUE_ASSIGN,
                        Permission.COMMENT_ADD,
                        Permission.ATTACHMENT_ADD,
                        Permission.WORKLOG_ADD,
                        Permission.DEVELOPMENT_TOOLS_VIEW)
                .doesNotContain(
                        Permission.WORKSPACE_ADMINISTER,
                        Permission.ISSUE_DELETE,
                        Permission.ISSUE_REPORTER_EDIT,
                        Permission.ISSUE_DUE_DATE_EDIT);
    }

    @Test
    void viewerCanBrowseAndCollaborateWithoutEditingIssues() {
        assertThat(DefaultPermissionMatrix.of(WorkspaceRoleType.VIEWER))
                .contains(
                        Permission.WORKSPACE_BROWSE,
                        Permission.ISSUE_VIEW,
                        Permission.COMMENT_ADD,
                        Permission.ATTACHMENT_ADD)
                .doesNotContain(
                        Permission.ISSUE_CREATE,
                        Permission.ISSUE_EDIT,
                        Permission.ISSUE_TRANSITION);
    }
}
