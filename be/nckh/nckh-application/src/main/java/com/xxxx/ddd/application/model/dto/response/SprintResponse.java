package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.SprintStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class SprintResponse {
    String id;
    String name;
    SprintStatus status;
    LocalDate startDate;
    LocalDate endDate;
    LocalDateTime createdAt;
}
