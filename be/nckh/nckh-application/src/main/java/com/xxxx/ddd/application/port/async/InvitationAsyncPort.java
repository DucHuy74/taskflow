package com.xxxx.ddd.application.port.async;

public interface InvitationAsyncPort {
    void sendInviteEmail(
            String to,
            String workspaceName,
            String inviterName
    );
}