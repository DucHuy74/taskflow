package com.xxxx.ddd.infrastructure.async;

import com.xxxx.ddd.infrastructure.graphql.messaging.GraphProcessingService;
import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.jobrunr.scheduling.JobScheduler;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BackgroundGraphJobService {

    private final JobScheduler jobScheduler;
    private final GraphProcessingService graphProcessingService;

    public void enqueueAnalysis(UserStoryCreatedEvent event) {

        jobScheduler.enqueue(() ->
                graphProcessingService.process(event)
        );
    }
}

