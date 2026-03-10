package com.xxxx.ddd.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    INVALID_USERNAME(1003, "Username must be at least {min} characters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least {min} characters", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    EMAIL_EXISTED(1008, "Email existed, please choose another one", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1009, "Username existed, please choose another one", HttpStatus.BAD_REQUEST),
    USERNAME_IS_MISSING(1010, "Please enter username", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1011, "User not existed", HttpStatus.BAD_REQUEST),
    WORKSPACE_NOT_FOUND(1012, "Workspace not found", HttpStatus.NOT_FOUND),
    NOT_ADMIN_OF_WORKSPACE(1013, "You are not admin of this workspace", HttpStatus.FORBIDDEN),
    NO_PERMISSION(1014, "You do not have permission", HttpStatus.FORBIDDEN),
    MEMBER_EXISTED(1015, "Member existed", HttpStatus.BAD_REQUEST),
    INVALID_INVITE(1016, "Invalid invite code", HttpStatus.BAD_REQUEST),
    INVITE_USED(1017, "Invite code has been used", HttpStatus.BAD_REQUEST),
    INVITE_EXPIRED(1018, "Invite code has expired", HttpStatus.BAD_REQUEST),
    INVITATION_ALREADY_SENT(1019, "Invitation already sent", HttpStatus.BAD_REQUEST),
    SPRINT_NOT_FOUND(1020, "Sprint not found", HttpStatus.NOT_FOUND),
    SPRINT_INVALID_STATE(1021, "Sprint is not in the correct state", HttpStatus.BAD_REQUEST),
    SPRINT_ALREADY_ACTIVE(1022, "Sprint is already active", HttpStatus.BAD_REQUEST),
    USER_STORY_NOT_FOUND(1023, "User story not found", HttpStatus.NOT_FOUND),
    INVALID_WORKSPACE(1024, "Invalid workspace", HttpStatus.BAD_REQUEST),
    NOTIFICATION_NOT_FOUND(1025, "Notification not found", HttpStatus.NOT_FOUND),
    USER_STORY_NOT_IN_SPRINT(1026, "User story is not in sprint", HttpStatus.BAD_REQUEST),
    SPRINT_NOT_ACTIVE(1027, "Sprint is not active", HttpStatus.BAD_REQUEST),
    INVALID_USER_STORY_STATUS(1028, "Invalid user story status", HttpStatus.BAD_REQUEST),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private int code;
    private String message;
    private HttpStatusCode statusCode;
}

