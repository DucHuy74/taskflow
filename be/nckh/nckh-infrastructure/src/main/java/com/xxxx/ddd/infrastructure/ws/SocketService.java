package com.xxxx.ddd.infrastructure.ws;

import com.corundumstudio.socketio.SocketIOServer;
import com.xxxx.ddd.application.port.async.RealtimeNotificationPort;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SocketService implements RealtimeNotificationPort {
    SocketIOServer server;

    // userId -> set of socket sessionIds
    Map<String, Set<UUID>> onlineUsers = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() {
        server.start();
        log.info("Socket.IO server started at port 9092");

        // Khi client connect
        server.addConnectListener(client -> {
            String userId = client.getHandshakeData()
                    .getSingleUrlParam("userId");

            if (userId == null || userId.isBlank()) {
                log.warn("Socket connection rejected (missing userId), session={}",
                        client.getSessionId());
                client.disconnect();
                return;
            }

            onlineUsers
                    .computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet())
                    .add(client.getSessionId());

            log.info("User {} connected, session={}", userId, client.getSessionId());
        });

        // Khi client disconnect
        server.addDisconnectListener(client -> {
            UUID sessionId = client.getSessionId();

            onlineUsers.forEach((userId, sessions) -> {
                if (sessions.remove(sessionId)) {
                    log.info("User {} disconnected, session={}", userId, sessionId);

                    if (sessions.isEmpty()) {
                        onlineUsers.remove(userId);
                    }
                }
            });
        });
    }

    @PreDestroy
    public void stop() {
        server.stop();
        log.info("Socket.IO server stopped");
    }

    public boolean isOnline(String userId) {
        return onlineUsers.containsKey(userId);
    }

    public void send(String userId, Object data) {
        Set<UUID> sessions = onlineUsers.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        for (UUID sessionId : sessions) {
            server.getClient(sessionId)
                    .sendEvent("notification", data);
        }
    }
}
