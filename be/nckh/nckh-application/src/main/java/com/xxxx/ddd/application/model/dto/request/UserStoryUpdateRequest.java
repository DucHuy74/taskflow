package com.xxxx.ddd.application.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStoryUpdateRequest {
    @NotBlank(message = "INVALID_KEY")
    String storyText;

    @NotNull(message = "INVALID_KEY")
    @PositiveOrZero(message = "INVALID_KEY")
    Long version;
}
