package com.xxxx.ddd.application.service.recommendation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxxx.ddd.application.model.dto.request.RecommendationDecisionRequest;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.recommendation.impl.RecommendationAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.model.entity.Recommendation;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import com.xxxx.dddd.domain.model.enums.*;
import com.xxxx.dddd.domain.repository.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecommendationAppServiceImplTest {
    private RecommendationRepository recommendations;
    private RecommendationDecisionRepository decisions;
    private WorkspaceAccessService access;
    private RecommendationAppServiceImpl service;

    @BeforeEach
    void setUp() {
        recommendations = mock(RecommendationRepository.class);
        decisions = mock(RecommendationDecisionRepository.class);
        access = mock(WorkspaceAccessService.class);
        UserStoryRepository stories = mock(UserStoryRepository.class);
        when(stories.findAllById(anyCollection())).thenReturn(List.of());
        when(access.require(anyString(), any())).thenReturn(WorkspaceMember.builder()
                .profile(Profile.builder().userId("reviewer-1").build())
                .build());
        service = new RecommendationAppServiceImpl(
                recommendations,
                decisions,
                mock(RecommendationJobRepository.class),
                stories,
                access,
                new ObjectMapper(),
                new SimpleMeterRegistry());
    }

    @Test
    void mergeRecordsAcceptedDecisionWithoutChangingStories() {
        Recommendation recommendation = openRecommendation();
        when(recommendations.findByIdAndWorkspaceId("rec-1", "ws-1"))
                .thenReturn(Optional.of(recommendation));
        when(decisions.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());

        RecommendationDecisionRequest request = new RecommendationDecisionRequest();
        request.setDecision(RecommendationDecisionType.MERGE);
        request.setVersion(0L);

        var response = service.decide("ws-1", "rec-1", "key-1", request);

        assertThat(response.getStatus()).isEqualTo(RecommendationStatus.ACCEPTED);
        verify(access).require("ws-1", Permission.RECOMMENDATION_ACCEPT);
        verify(decisions).save(argThat(decision ->
                decision.getDecision() == RecommendationDecisionType.MERGE
                        && decision.getReviewedBy().equals("reviewer-1")));
    }

    @Test
    void staleVersionReturnsConflict() {
        Recommendation recommendation = openRecommendation();
        recommendation.setVersion(2);
        when(recommendations.findByIdAndWorkspaceId("rec-1", "ws-1"))
                .thenReturn(Optional.of(recommendation));
        when(decisions.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());
        RecommendationDecisionRequest request = new RecommendationDecisionRequest();
        request.setDecision(RecommendationDecisionType.KEEP_SEPARATE);
        request.setVersion(1L);

        assertThatThrownBy(() -> service.decide("ws-1", "rec-1", "key-1", request))
                .isInstanceOfSatisfying(AppException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(ErrorCode.RECOMMENDATION_VERSION_CONFLICT));
    }

    private Recommendation openRecommendation() {
        return Recommendation.builder()
                .id("rec-1")
                .workspaceId("ws-1")
                .jobId("job-1")
                .pairKey("US-1::US-2")
                .leftStoryId("US-1")
                .rightStoryId("US-2")
                .leftFingerprint("left")
                .rightFingerprint("right")
                .duplicateScore(0.9)
                .confidenceBand(RecommendationConfidence.HIGH)
                .evidenceJson("[]")
                .representativeStoryId("US-1")
                .status(RecommendationStatus.OPEN)
                .modelVersion("heuristic-v1")
                .policyVersion("deterministic-v1")
                .generatedAt(Instant.now())
                .version(0)
                .build();
    }
}
