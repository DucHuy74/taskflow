package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.RecommendationDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecommendationDecisionRepository extends JpaRepository<RecommendationDecision, String> {
    Optional<RecommendationDecision> findByIdempotencyKey(String idempotencyKey);
}
