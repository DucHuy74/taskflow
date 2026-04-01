package com.xxxx.ddd.infrastructure.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxxx.ddd.application.port.async.GraphEventPort;
import com.xxxx.dddd.domain.model.graph.GraphRebuildEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GraphEventPublisher implements GraphEventPort {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void sendRebuildEvent(String workspaceId) {
        try {
            GraphRebuildEvent event = GraphRebuildEvent.builder()
                    .type("REBUILD_GRAPH")
                    .workspaceId(workspaceId)
                    .build();

            String message = objectMapper.writeValueAsString(event);

            rabbitTemplate.convertAndSend(
                    "userstory.exchange",
                    "graph.rebuild",
                    message
            );

        } catch (Exception e) {
            throw new RuntimeException("Failed to send rebuild event", e);
        }
    }
}
