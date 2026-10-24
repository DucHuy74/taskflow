package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class InvitationResponse {
    private String id;
    private String workspaceId;
    private String workspaceName;
    private WorkspaceRoleType role;
    private String email;
    private String inviterId;
    private String inviterEmail;
    private Instant expiredAt;
}
