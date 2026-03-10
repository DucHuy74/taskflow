package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class NotificationResponse {
    private String id;
    private String title;
    private String content;
    private NotificationType type;
    private String referenceId;
    private Instant createdAt;
    private boolean read;
}