package com.xxxx.ddd.application.port.async;

public interface GraphEventPort {
    void sendRebuildEvent(String workspaceId);
}
