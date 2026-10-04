package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.enums.RecommendationConfidence;
import com.xxxx.dddd.domain.model.enums.RecommendationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "recommendations",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_recommendation_revision",
                columnNames = {"workspace_id", "pair_key", "left_fingerprint", "right_fingerprint"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recommendation {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 36)
    private String workspaceId;

    @Column(name = "job_id", nullable = false, length = 36)
    private String jobId;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String type = "POSSIBLE_DUPLICATE";

    @Column(name = "pair_key", nullable = false, length = 100)
    private String pairKey;

    @Column(name = "left_story_id", nullable = false, length = 36)
    private String leftStoryId;

    @Column(name = "right_story_id", nullable = false, length = 36)
    private String rightStoryId;

    @Column(name = "left_fingerprint", nullable = false, length = 64)
    private String leftFingerprint;

    @Column(name = "right_fingerprint", nullable = false, length = 64)
    private String rightFingerprint;

    @Column(name = "duplicate_score", nullable = false)
    private double duplicateScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "confidence_band", nullable = false, length = 10)
    private RecommendationConfidence confidenceBand;

    @Lob
    @Column(name = "evidence_json", nullable = false, columnDefinition = "LONGTEXT")
    private String evidenceJson;

    @Column(name = "representative_story_id", nullable = false, length = 36)
    private String representativeStoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecommendationStatus status;

    @Column(name = "source_revision", length = 64)
    private String sourceRevision;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "policy_version", nullable = false, length = 100)
    private String policyVersion;

    @Column(name = "calibrated", nullable = false)
    private boolean calibrated;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Version
    @Column(nullable = false)
    private long version;
}
