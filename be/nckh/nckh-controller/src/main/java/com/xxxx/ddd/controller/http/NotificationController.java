package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.response.NotificationResponse;
import com.xxxx.ddd.application.service.notification.NotificationAppService;
import com.xxxx.ddd.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationAppService notificationService;

    private String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof JwtAuthenticationToken jwt) {
            return jwt.getToken().getSubject();
        }
        throw new RuntimeException("Unauthorized");
    }

    @GetMapping("/unread")
    public ApiResponse<List<NotificationResponse>> getUnread() {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationService.getUnread(getCurrentUserId()))
                .build();
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable("id") String id) {

        notificationService.markAsRead(id, getCurrentUserId());

        return ApiResponse.<Void>builder()
                .message("Marked as read")
                .build();
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllAsRead() {

        notificationService.markAllAsRead(getCurrentUserId());

        return ApiResponse.<Void>builder()
                .message("All notifications marked as read")
                .build();
    }
}