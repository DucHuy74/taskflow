package com.xxxx.ddd.infrastructure.async;

import com.xxxx.ddd.application.port.async.InvitationAsyncPort;
import lombok.RequiredArgsConstructor;
import org.jobrunr.scheduling.JobScheduler;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BackgroundJobService implements InvitationAsyncPort {

    private final JobScheduler jobScheduler;
    private final EmailService emailService;

    @Override
    public void sendInviteEmail(
            String to,
            String workspaceName,
            String inviterName
    ) {
        jobScheduler.enqueue(() ->
                emailService.sendInviteEmail(
                        to,
                        workspaceName,
                        inviterName
                )
        );
    }
}
