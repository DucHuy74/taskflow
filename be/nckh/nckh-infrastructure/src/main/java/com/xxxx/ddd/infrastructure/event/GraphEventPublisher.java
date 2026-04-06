package com.xxxx.ddd.infrastructure.event;

import com.fasterxml.jackson.databind.ObjectMapper;
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
    public void sendRebuildEvent(String workspaceId) {

        GraphRebuildEvent payload = GraphRebuildEvent.builder()
                .workspaceId(workspaceId)
                .build();

        BaseEventMessage<GraphRebuildEvent> message =
                new BaseEventMessage<>(
                        "REBUILD_GRAPH",
                        "v1",
                        payload
                );

        rabbitTemplate.convertAndSend(
                RabbitConfig.USERSTORY_EXCHANGE,
                RabbitConfig.REBUILD_ROUTING_KEY,
                message
        );
    }
}
