package com.xxxx.dddd.domain.model.entity;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RecommendationJobChunkId implements Serializable {
    private String jobId;
    private int chunkIndex;
}
