package com.xxxx.ddd.application.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SprintCreateRequest {
    @NotBlank
    String name;
}