package com.xxxx.dddd.domain.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseEventMessage<T> {
    private String type;
    private String version;
    private T payload;
}