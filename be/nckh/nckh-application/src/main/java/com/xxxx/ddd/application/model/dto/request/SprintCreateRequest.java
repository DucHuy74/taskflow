package com.xxxx.ddd.application.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SprintCreateRequest {
    @NotBlank(message = "SPRINT_NAME_REQUIRED")
    String name;

    LocalDate startDate;

    LocalDate endDate;
}
