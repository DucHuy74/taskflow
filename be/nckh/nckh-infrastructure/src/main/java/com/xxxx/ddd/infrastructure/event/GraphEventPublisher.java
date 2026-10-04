package com.xxxx.ddd.infrastructure.event;

import com.xxxx.ddd.application.port.async.GraphEventPort;
import com.xxxx.ddd.infrastructure.config.rmq.RabbitConfig;
import com.xxxx.dddd.domain.event.BaseEventMessage;
import com.xxxx.dddd.domain.model.graph.GraphRebuildEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GraphEventPublisher implements GraphEventPort {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void sendRebuildEvent(String workspaceId, String jobId, String sourceRevision) {

        GraphRebuildEvent payload = GraphRebuildEvent.builder()
                .workspaceId(workspaceId)
                .jobId(jobId)
                .sourceRevision(sourceRevision)
                .build();

        BaseEventMessage<GraphRebuildEvent> message =
                new BaseEventMessage<>(
                        "REBUILD_GRAPH",
                        "v2",
                        payload
                );
        message.setJobId(jobId);
        message.setWorkspaceId(workspaceId);

        rabbitTemplate.convertAndSend(
                RabbitConfig.USERSTORY_EXCHANGE,
                RabbitConfig.REBUILD_ROUTING_KEY,
                message
        );
    }
}
