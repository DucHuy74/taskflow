package com.xxxx.ddd.infrastructure.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxxx.ddd.infrastructure.config.rmq.RabbitConfig;
import com.xxxx.dddd.domain.model.entity.*;
import com.xxxx.dddd.domain.model.enums.*;
import com.xxxx.dddd.domain.repository.*;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationEventConsumer {
    private final ObjectMapper objectMapper;
    private final RecommendationJobRepository jobRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationEventReceiptRepository receiptRepository;
    private final RecommendationJobChunkRepository chunkRepository;
    private final MeterRegistry meterRegistry;

    @RabbitListener(queues = RabbitConfig.RECOMMENDATION_STATUS_QUEUE)
    @Transactional
    public void onStatus(Message message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message.getBody());
        if (!accept(envelope, "RECOMMENDATION_JOB_STATUS")) return;
        JsonNode payload = envelope.path("payload");
        RecommendationJob job = requireJob(payload);
        RecommendationJobStatus status = RecommendationJobStatus.valueOf(payload.path("status").asText());
        Instant now = Instant.now();
        if (status == RecommendationJobStatus.RUNNING) {
            job.setStatus(RecommendationJobStatus.RUNNING);
            job.setStartedAt(job.getStartedAt() == null ? now : job.getStartedAt());
            job.setProgress(payload.path("progress").asInt(job.getProgress()));
            if (payload.hasNonNull("stage")) {
                job.setStage(RecommendationJobStage.valueOf(payload.path("stage").asText()));
            }
        } else if (status == RecommendationJobStatus.FAILED) {
            job.setStatus(RecommendationJobStatus.FAILED);
            job.setProgress(0);
            job.setErrorCode(payload.path("errorCode").asText("RECOMMENDATION_BATCH_FAILED"));
            job.setCompletedAt(now);
            meterRegistry.counter("recommendation.jobs", "status", "failed").increment();
        } else if (status == RecommendationJobStatus.SUCCEEDED) {
            job.setCandidateCount(payload.path("candidateCount").asInt(0));
            job.setExpectedChunks(payload.path("chunkCount").asInt(0));
            job.setModelVersion(payload.path("modelVersion").asText(job.getModelVersion()));
            job.setPolicyVersion(payload.path("policyVersion").asText(job.getPolicyVersion()));
            job.setStage(RecommendationJobStage.PUBLISHING);
            job.setProgress(99);
            finishWhenComplete(job, now);
        }
        jobRepository.save(job);
        record(envelope);
    }

    @RabbitListener(queues = RabbitConfig.RECOMMENDATION_CANDIDATES_QUEUE)
    @Transactional
    public void onCandidates(Message message) throws Exception {
        JsonNode envelope = objectMapper.readTree(message.getBody());
        if (!accept(envelope, "RECOMMENDATION_CANDIDATES")) return;
        JsonNode payload = envelope.path("payload");
        RecommendationJob job = requireJob(payload);
        int chunkIndex = payload.path("chunkIndex").asInt(-1);
        RecommendationJobChunkId chunkId = new RecommendationJobChunkId(job.getId(), chunkIndex);
        if (chunkRepository.existsById(chunkId)) {
            record(envelope);
            return;
        }

        job.setModelVersion(payload.path("modelVersion").asText("unknown"));
        job.setPolicyVersion(payload.path("policyVersion").asText("unknown"));
        for (JsonNode candidate : payload.path("candidates")) {
            upsertCandidate(job, payload, candidate);
        }
        meterRegistry.counter("recommendation.candidates.published")
                .increment(payload.path("candidates").size());
        chunkRepository.save(RecommendationJobChunk.builder()
                .jobId(job.getId())
                .chunkIndex(chunkIndex)
                .receivedAt(Instant.now())
                .build());
        job.setReceivedChunks(job.getReceivedChunks() + 1);
        finishWhenComplete(job, Instant.now());
        jobRepository.save(job);
        record(envelope);
    }

    private void upsertCandidate(RecommendationJob job, JsonNode payload, JsonNode candidate) throws Exception {
        String pairKey = candidate.path("pair_key").asText();
        String leftFingerprint = candidate.path("left_fingerprint").asText();
        String rightFingerprint = candidate.path("right_fingerprint").asText();
        Optional<Recommendation> existing = recommendationRepository
                .findByWorkspaceIdAndPairKeyAndLeftFingerprintAndRightFingerprint(
                        job.getWorkspaceId(), pairKey, leftFingerprint, rightFingerprint);
        Recommendation recommendation = existing.orElseGet(() -> Recommendation.builder()
                .id(UUID.randomUUID().toString())
                .workspaceId(job.getWorkspaceId())
                .pairKey(pairKey)
                .leftStoryId(candidate.path("left_story_id").asText())
                .rightStoryId(candidate.path("right_story_id").asText())
                .leftFingerprint(leftFingerprint)
                .rightFingerprint(rightFingerprint)
                .status(RecommendationStatus.OPEN)
                .build());
        if (recommendation.getStatus() == RecommendationStatus.OPEN) {
            recommendation.setJobId(job.getId());
            recommendation.setDuplicateScore(candidate.path("redundancy_prob").asDouble());
            recommendation.setConfidenceBand(RecommendationConfidence.valueOf(
                    candidate.path("confidence_band").asText("MEDIUM")));
            JsonNode evidence = candidate.path("evidence");
            recommendation.setEvidenceJson(objectMapper.writeValueAsString(
                    evidence.isArray() && !evidence.isEmpty()
                            ? evidence
                            : candidate.path("reason_codes")));
            recommendation.setRepresentativeStoryId(
                    candidate.path("suggested_representative_story_id").asText());
            recommendation.setSourceRevision(payload.path("sourceRevision").asText(null));
            recommendation.setModelVersion(payload.path("modelVersion").asText("unknown"));
            recommendation.setPolicyVersion(payload.path("policyVersion").asText("unknown"));
            recommendation.setCalibrated(false);
            recommendation.setGeneratedAt(Instant.now());
            recommendationRepository.save(recommendation);
        }
    }

    private RecommendationJob requireJob(JsonNode payload) {
        String jobId = payload.path("jobId").asText();
        RecommendationJob job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown recommendation job " + jobId));
        if (!job.getWorkspaceId().equals(payload.path("workspaceId").asText())) {
            throw new IllegalArgumentException("Recommendation event workspace mismatch");
        }
        return job;
    }

    private void finishWhenComplete(RecommendationJob job, Instant now) {
        if (job.getExpectedChunks() == job.getReceivedChunks()) {
            int staleCount = recommendationRepository.markPreviousOpenStale(job.getWorkspaceId(), job.getId());
            meterRegistry.counter("recommendation.stale").increment(staleCount);
            job.setStatus(RecommendationJobStatus.SUCCEEDED);
            job.setProgress(100);
            job.setCompletedAt(now);
            job.setErrorCode(null);
            meterRegistry.counter("recommendation.jobs", "status", "succeeded").increment();
            if (job.getStartedAt() != null) {
                meterRegistry.timer("recommendation.job.duration")
                        .record(Duration.between(job.getStartedAt(), now));
            }
        }
    }

    private boolean accept(JsonNode envelope, String expectedType) {
        if (!"v2".equals(envelope.path("version").asText())) {
            log.warn("Ignoring unsupported recommendation event version: {}", envelope.path("version"));
            return false;
        }
        if (!expectedType.equals(envelope.path("type").asText())) return false;
        String eventId = envelope.path("eventId").asText();
        return !eventId.isBlank() && !receiptRepository.existsById(eventId);
    }

    private void record(JsonNode envelope) {
        String eventId = envelope.path("eventId").asText();
        if (!receiptRepository.existsById(eventId)) {
            receiptRepository.save(RecommendationEventReceipt.builder()
                    .eventId(eventId)
                    .eventType(envelope.path("type").asText())
                    .receivedAt(Instant.now())
                    .build());
        }
    }
}
