package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.enums.RecommendationDecisionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "recommendation_decisions",
        uniqueConstraints = @UniqueConstraint(name = "uq_recommendation_idempotency", columnNames = "idempotency_key"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationDecision {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "recommendation_id", nullable = false, length = 36)
    private String recommendationId;

    @Column(name = "workspace_id", nullable = false, length = 36)
    private String workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecommendationDecisionType decision;

    @Column(length = 1000)
    private String note;

    @Column(name = "reviewed_by", nullable = false, length = 100)
    private String reviewedBy;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
