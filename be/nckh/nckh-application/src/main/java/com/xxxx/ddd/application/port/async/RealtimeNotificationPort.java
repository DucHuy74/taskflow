package com.xxxx.ddd.application.port.async;

public interface RealtimeNotificationPort {
    boolean isOnline(String userId);

    void send(String userId, Object data);
}
