package com.xxxx.ddd.application.model.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class InvitationResponse {
    private String id;
    private String workspaceId;
    private String inviterId;
    private Instant expiredAt;
}
