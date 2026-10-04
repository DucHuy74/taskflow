package com.xxxx.dddd.domain.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseEventMessage<T> {
    private String type;
    private String version;
    private String eventId;
    private Instant occurredAt;
    private String jobId;
    private String workspaceId;
    private T payload;

    public BaseEventMessage(String type, String version, T payload) {
        this.type = type;
        this.version = version;
        this.eventId = UUID.randomUUID().toString();
        this.occurredAt = Instant.now();
        this.payload = payload;
    }
}
