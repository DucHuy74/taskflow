package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.RecommendationJobChunk;
import com.xxxx.dddd.domain.model.entity.RecommendationJobChunkId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationJobChunkRepository extends JpaRepository<RecommendationJobChunk, RecommendationJobChunkId> {}
