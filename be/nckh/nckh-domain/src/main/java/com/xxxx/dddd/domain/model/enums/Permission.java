package com.xxxx.dddd.domain.model.enums;

import lombok.Getter;

/**
 * Fine-grained actions, named like Jira permissions and S3 IAM actions ({@code resource:Action}).
 */
@Getter
public enum Permission {
    WORKSPACE_BROWSE("workspace:Browse"),
    WORKSPACE_ADMINISTER("workspace:Administer"),
    WORKSPACE_DELETE("workspace:Delete"),

    MEMBER_VIEW("member:View"),
    MEMBER_INVITE("member:Invite"),
    MEMBER_MANAGE("member:Manage"),

    SPRINT_VIEW("sprint:View"),
    SPRINT_CREATE("sprint:Create"),
    SPRINT_EDIT("sprint:Edit"),
    SPRINT_MANAGE("sprint:Manage"),

    ISSUE_VIEW("issue:View"),
    ISSUE_CREATE("issue:Create"),
    ISSUE_EDIT("issue:Edit"),
    ISSUE_DELETE("issue:Delete"),
    ISSUE_TRANSITION("issue:Transition"),
    ISSUE_ASSIGN("issue:Assign"),
    ISSUE_LINK("issue:Link"),
    ISSUE_MOVE("issue:Move"),
    ISSUE_REPORTER_EDIT("issue:EditReporter"),
    ISSUE_DUE_DATE_EDIT("issue:EditDueDate"),

    COMMENT_ADD("comment:Add"),
    COMMENT_EDIT("comment:Edit"),
    COMMENT_DELETE("comment:Delete"),

    ATTACHMENT_ADD("attachment:Add"),
    ATTACHMENT_DELETE("attachment:Delete"),

    WORKLOG_ADD("worklog:Add"),
    WORKLOG_EDIT("worklog:Edit"),
    WORKLOG_DELETE("worklog:Delete"),

    WATCHER_MANAGE("watcher:Manage"),
    DEVELOPMENT_TOOLS_VIEW("development:View"),

    ACL_READ("acl:Read"),
    ACL_WRITE("acl:Write"),
    ACL_FULL_CONTROL("acl:FullControl");

    private final String action;

    Permission(String action) {
        this.action = action;
    }
}
