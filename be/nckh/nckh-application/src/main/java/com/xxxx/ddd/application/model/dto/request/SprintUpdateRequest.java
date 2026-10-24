package com.xxxx.ddd.application.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SprintUpdateRequest {
    @NotBlank(message = "SPRINT_NAME_REQUIRED")
    String name;

    // Both dates are replaced as sent: null clears the date.
    LocalDate startDate;

    LocalDate endDate;
}
