package com.xxxx.ddd.application.service.recommendation.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxxx.ddd.application.model.dto.request.RecommendationDecisionRequest;
import com.xxxx.ddd.application.model.dto.response.*;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.recommendation.RecommendationAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.*;
import com.xxxx.dddd.domain.model.enums.*;
import com.xxxx.dddd.domain.repository.*;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationAppServiceImpl implements RecommendationAppService {
    private final RecommendationRepository recommendationRepository;
    private final RecommendationDecisionRepository decisionRepository;
    private final RecommendationJobRepository jobRepository;
    private final UserStoryRepository userStoryRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Override
    @Transactional(readOnly = true)
    public RecommendationListResponse list(
            String workspaceId,
            String type,
            RecommendationStatus status,
            RecommendationConfidence confidence,
            String cursor,
            int limit) {
        workspaceAccessService.require(workspaceId, Permission.RECOMMENDATION_VIEW);
        Cursor decoded = decodeCursor(cursor);
        List<Recommendation> rows = recommendationRepository.findQueue(
                workspaceId,
                type,
                status == null ? RecommendationStatus.OPEN : status,
                confidence,
                decoded == null ? null : decoded.generatedAt(),
                decoded == null ? null : decoded.id(),
                PageRequest.of(0, limit + 1));
        boolean hasMore = rows.size() > limit;
        List<Recommendation> pageRows = hasMore ? rows.subList(0, limit) : rows;
        Map<String, UserStory> stories = loadStories(pageRows);
        String nextCursor = hasMore && !pageRows.isEmpty()
                ? encodeCursor(pageRows.get(pageRows.size() - 1))
                : null;
        return RecommendationListResponse.builder()
                .data(pageRows.stream().map(row -> toResponse(row, stories)).toList())
                .page(RecommendationListResponse.Page.builder()
                        .hasMore(hasMore)
                        .nextCursor(nextCursor)
                        .build())
                .summary(RecommendationListResponse.Summary.builder()
                        .open(recommendationRepository.countByWorkspaceIdAndStatus(workspaceId, RecommendationStatus.OPEN))
                        .high(recommendationRepository.countByWorkspaceIdAndStatusAndConfidenceBand(
                                workspaceId, RecommendationStatus.OPEN, RecommendationConfidence.HIGH))
                        .medium(recommendationRepository.countByWorkspaceIdAndStatusAndConfidenceBand(
                                workspaceId, RecommendationStatus.OPEN, RecommendationConfidence.MEDIUM))
                        .build())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RecommendationResponse detail(String workspaceId, String recommendationId) {
        workspaceAccessService.require(workspaceId, Permission.RECOMMENDATION_VIEW);
        Recommendation recommendation = find(workspaceId, recommendationId);
        return toResponse(recommendation, loadStories(List.of(recommendation)));
    }

    @Override
    @Transactional
    public RecommendationResponse decide(
            String workspaceId,
            String recommendationId,
            String idempotencyKey,
            RecommendationDecisionRequest request) {
        Permission permission = request.getDecision() == RecommendationDecisionType.MERGE
                ? Permission.RECOMMENDATION_ACCEPT
                : Permission.RECOMMENDATION_REVIEW;
        var member = workspaceAccessService.require(workspaceId, permission);
        String payloadHash = hash(recommendationId + "|" + request.getDecision() + "|"
                + Objects.toString(request.getNote(), "") + "|" + request.getVersion());
        Optional<RecommendationDecision> previous = decisionRepository.findByIdempotencyKey(idempotencyKey);
        if (previous.isPresent()) {
            if (!previous.get().getPayloadHash().equals(payloadHash)) {
                meterRegistry.counter("recommendation.conflicts", "type", "idempotency").increment();
                throw new AppException(ErrorCode.RECOMMENDATION_IDEMPOTENCY_CONFLICT);
            }
            Recommendation current = find(workspaceId, recommendationId);
            return toResponse(current, loadStories(List.of(current)));
        }

        Recommendation recommendation = find(workspaceId, recommendationId);
        if (recommendation.getVersion() != request.getVersion()) {
            meterRegistry.counter("recommendation.conflicts", "type", "version").increment();
            throw new AppException(ErrorCode.RECOMMENDATION_VERSION_CONFLICT);
        }
        if (recommendation.getStatus() != RecommendationStatus.OPEN) {
            meterRegistry.counter("recommendation.conflicts", "type", "resolved").increment();
            throw new AppException(ErrorCode.RECOMMENDATION_ALREADY_RESOLVED);
        }

        RecommendationStatus nextStatus = switch (request.getDecision()) {
            case MERGE -> RecommendationStatus.ACCEPTED;
            case KEEP_SEPARATE -> RecommendationStatus.REJECTED;
            case DEFER -> RecommendationStatus.DEFERRED;
        };
        String reviewer = member.getProfile().getUserId();
        Instant now = Instant.now();
        recommendation.setStatus(nextStatus);
        recommendation.setReviewedAt(now);
        recommendation.setReviewedBy(reviewer);
        recommendationRepository.save(recommendation);
        decisionRepository.save(RecommendationDecision.builder()
                .id(UUID.randomUUID().toString())
                .recommendationId(recommendationId)
                .workspaceId(workspaceId)
                .decision(request.getDecision())
                .note(request.getNote())
                .reviewedBy(reviewer)
                .idempotencyKey(idempotencyKey)
                .payloadHash(payloadHash)
                .createdAt(now)
                .build());
        meterRegistry.counter("recommendation.decisions", "decision", request.getDecision().name()).increment();
        if (recommendation.getGeneratedAt() != null) {
            meterRegistry.timer("recommendation.review.latency")
                    .record(Duration.between(recommendation.getGeneratedAt(), now));
        }
        return toResponse(recommendation, loadStories(List.of(recommendation)));
    }

    @Override
    @Transactional(readOnly = true)
    public RecommendationJobResponse latestJob(String workspaceId) {
        workspaceAccessService.require(workspaceId, Permission.RECOMMENDATION_VIEW);
        RecommendationJob job = jobRepository.findFirstByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.RECOMMENDATION_JOB_NOT_FOUND));
        Instant lastSuccess = jobRepository.findFirstByWorkspaceIdAndStatusOrderByCompletedAtDesc(
                        workspaceId, RecommendationJobStatus.SUCCEEDED)
                .map(RecommendationJob::getCompletedAt)
                .orElse(null);
        return RecommendationJobResponse.builder()
                .id(job.getId())
                .status(job.getStatus())
                .stage(job.getStage())
                .progress(job.getProgress())
                .candidateCount(job.getCandidateCount())
                .errorCode(job.getErrorCode())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .lastSuccessfulRunAt(lastSuccess)
                .build();
    }

    private Recommendation find(String workspaceId, String recommendationId) {
        return recommendationRepository.findByIdAndWorkspaceId(recommendationId, workspaceId)
                .orElseThrow(() -> new AppException(ErrorCode.RECOMMENDATION_NOT_FOUND));
    }

    private Map<String, UserStory> loadStories(List<Recommendation> recommendations) {
        Set<String> ids = recommendations.stream()
                .flatMap(row -> java.util.stream.Stream.of(row.getLeftStoryId(), row.getRightStoryId()))
                .collect(Collectors.toSet());
        return userStoryRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(UserStory::getId, Function.identity()));
    }

    private RecommendationResponse toResponse(Recommendation row, Map<String, UserStory> stories) {
        List<RecommendationResponse.Evidence> evidence;
        try {
            JsonNode evidenceNode = objectMapper.readTree(row.getEvidenceJson());
            List<RecommendationResponse.Evidence> parsed = new ArrayList<>();
            for (JsonNode item : evidenceNode) {
                String code = item.isTextual() ? item.asText() : item.path("code").asText();
                if (!code.isBlank()) {
                    parsed.add(RecommendationResponse.Evidence.builder()
                            .code(code)
                            .label(evidenceLabel(code))
                            .value(item.isObject() && item.hasNonNull("value")
                                    ? item.path("value").asDouble()
                                    : null)
                            .build());
                }
            }
            evidence = List.copyOf(parsed);
        } catch (Exception ignored) {
            evidence = List.of();
        }
        return RecommendationResponse.builder()
                .id(row.getId())
                .type(row.getType())
                .status(row.getStatus())
                .title("Two user stories may describe the same need")
                .confidence(RecommendationResponse.Confidence.builder()
                        .band(row.getConfidenceBand())
                        .score(row.getDuplicateScore())
                        .calibrated(row.isCalibrated())
                        .build())
                .stories(List.of(story(row.getLeftStoryId(), stories), story(row.getRightStoryId(), stories)))
                .evidence(evidence)
                .suggestedAction(RecommendationResponse.SuggestedAction.builder()
                        .type("MERGE_REVIEW")
                        .representativeStoryId(row.getRepresentativeStoryId())
                        .build())
                .modelVersion(row.getModelVersion())
                .policyVersion(row.getPolicyVersion())
                .generatedAt(row.getGeneratedAt())
                .version(row.getVersion())
                .build();
    }

    private RecommendationResponse.Story story(String id, Map<String, UserStory> stories) {
        UserStory story = stories.get(id);
        return RecommendationResponse.Story.builder()
                .id(id)
                .text(story == null ? "Story is no longer available" : story.getStoryText())
                .graphRelevanceScore(null)
                .parseConfidence(null)
                .build();
    }

    private static String evidenceLabel(String code) {
        return switch (code) {
            case "SAME_CANONICAL_ACTION" -> "Same canonical action";
            case "SAME_CANONICAL_OBJECT" -> "Same canonical object";
            case "SEMANTIC_TEXT_SIMILARITY" -> "Story content is semantically similar";
            case "SUBJECT_COMPATIBILITY" -> "Compatible story subjects";
            case "TOKEN_ENTITY_OVERLAP" -> "Overlapping terms or entities";
            case "LOW_PARSE_CONFIDENCE" -> "One story has low parse confidence";
            default -> code;
        };
    }

    private static String encodeCursor(Recommendation row) {
        String value = row.getGeneratedAt() + "|" + row.getId();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static Cursor decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int separator = decoded.lastIndexOf('|');
            return new Cursor(Instant.parse(decoded.substring(0, separator)), decoded.substring(separator + 1));
        } catch (Exception error) {
            throw new AppException(ErrorCode.INVALID_RECOMMENDATION_CURSOR);
        }
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private record Cursor(Instant generatedAt, String id) {}
}
