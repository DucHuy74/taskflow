package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.enums.RecommendationJobStage;
import com.xxxx.dddd.domain.model.enums.RecommendationJobStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "recommendation_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationJob {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 36)
    private String workspaceId;

    @Column(name = "source_revision", nullable = false, length = 64)
    private String sourceRevision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecommendationJobStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RecommendationJobStage stage;

    @Column(nullable = false)
    private int progress;

    @Column(name = "candidate_count", nullable = false)
    private int candidateCount;

    @Column(name = "expected_chunks", nullable = false)
    private int expectedChunks;

    @Column(name = "received_chunks", nullable = false)
    private int receivedChunks;

    @Column(name = "model_version", length = 100)
    private String modelVersion;

    @Column(name = "policy_version", length = 100)
    private String policyVersion;

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Version
    @Column(nullable = false)
    private long version;
}
