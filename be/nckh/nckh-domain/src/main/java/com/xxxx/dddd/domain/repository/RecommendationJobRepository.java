package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.RecommendationJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RecommendationJobRepository extends JpaRepository<RecommendationJob, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from RecommendationJob job where job.id = :id")
    Optional<RecommendationJob> findByIdForUpdate(@Param("id") String id);

    Optional<RecommendationJob> findFirstByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    Optional<RecommendationJob> findFirstByWorkspaceIdAndStatusOrderByCompletedAtDesc(
            String workspaceId,
            com.xxxx.dddd.domain.model.enums.RecommendationJobStatus status);
}
