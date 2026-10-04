package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.Recommendation;
import com.xxxx.dddd.domain.model.enums.RecommendationConfidence;
import com.xxxx.dddd.domain.model.enums.RecommendationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RecommendationRepository extends JpaRepository<Recommendation, String> {
    Optional<Recommendation> findByIdAndWorkspaceId(String id, String workspaceId);

    Optional<Recommendation> findByWorkspaceIdAndPairKeyAndLeftFingerprintAndRightFingerprint(
            String workspaceId, String pairKey, String leftFingerprint, String rightFingerprint);

    @Query("""
        select r from Recommendation r
        where r.workspaceId = :workspaceId
          and (:type is null or r.type = :type)
          and (:status is null or r.status = :status)
          and (:confidence is null or r.confidenceBand = :confidence)
          and (:cursorTime is null or r.generatedAt < :cursorTime
               or (r.generatedAt = :cursorTime and r.id < :cursorId))
        order by r.generatedAt desc, r.id desc
        """)
    List<Recommendation> findQueue(
            @Param("workspaceId") String workspaceId,
            @Param("type") String type,
            @Param("status") RecommendationStatus status,
            @Param("confidence") RecommendationConfidence confidence,
            @Param("cursorTime") Instant cursorTime,
            @Param("cursorId") String cursorId,
            Pageable pageable);

    long countByWorkspaceIdAndStatus(String workspaceId, RecommendationStatus status);
    long countByWorkspaceIdAndStatusAndConfidenceBand(
            String workspaceId, RecommendationStatus status, RecommendationConfidence confidence);

    @Modifying
    @Query("""
        update Recommendation r set r.status = com.xxxx.dddd.domain.model.enums.RecommendationStatus.STALE
        where r.workspaceId = :workspaceId and r.status = com.xxxx.dddd.domain.model.enums.RecommendationStatus.OPEN
          and r.jobId <> :jobId
        """)
    int markPreviousOpenStale(@Param("workspaceId") String workspaceId, @Param("jobId") String jobId);
}
