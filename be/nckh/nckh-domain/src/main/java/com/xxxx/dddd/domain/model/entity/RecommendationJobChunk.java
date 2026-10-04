package com.xxxx.dddd.domain.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "recommendation_job_chunks")
@IdClass(RecommendationJobChunkId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationJobChunk {
    @Id
    @Column(name = "job_id", length = 36)
    private String jobId;

    @Id
    @Column(name = "chunk_index")
    private int chunkIndex;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
