package com.xxxx.ddd.application.service.invitation;

import com.xxxx.ddd.application.model.dto.response.InvitationResponse;

import java.util.List;

public interface InvitationAppService {
    String accept(String invitationId, String userId);

    void deny(String invitationId, String userId);
    List<InvitationResponse> getMyPendingInvitations(String userId);
}
