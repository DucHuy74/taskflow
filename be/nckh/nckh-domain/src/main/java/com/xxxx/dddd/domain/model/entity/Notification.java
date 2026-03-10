package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false)
    String userId;

    String title;
    String content;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    NotificationType type;

    String referenceId;

    @Column(name = "is_read")
    boolean read;

    Instant createdAt;
}
