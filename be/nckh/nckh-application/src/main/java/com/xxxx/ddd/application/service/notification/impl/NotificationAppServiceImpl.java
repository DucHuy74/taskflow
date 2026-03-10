package com.xxxx.ddd.application.service.notification.impl;

import com.xxxx.ddd.application.model.dto.response.NotificationResponse;
import com.xxxx.ddd.application.port.async.RealtimeNotificationPort;
import com.xxxx.ddd.application.service.notification.NotificationAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Notification;
import com.xxxx.dddd.domain.model.enums.NotificationType;
import com.xxxx.dddd.domain.repository.NotificationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationAppServiceImpl implements NotificationAppService {

    NotificationRepository notificationRepository;
    RealtimeNotificationPort realtimeNotificationPort;

    @Transactional
    public Notification notifyUser(
            String userId,
            String title,
            String content,
            NotificationType type,
            String refId
    ) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .type(type)
                .referenceId(refId)
                .read(false)
                .createdAt(Instant.now())
                .build();

        notificationRepository.save(notification);

        if (realtimeNotificationPort.isOnline(userId)) {
            realtimeNotificationPort.send(userId, notification);
        }

        return notification;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnread(String userId) {
        return notificationRepository
                .findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional
    public void markAsRead(String notificationId, String userId) {

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!notification.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.NO_PERMISSION);
        }

        notification.setRead(true);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .content(n.getContent())
                .type(n.getType())
                .referenceId(n.getReferenceId())
                .createdAt(n.getCreatedAt())
                .read(n.isRead())
                .build();
    }
}
