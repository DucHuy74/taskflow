CREATE TABLE IF NOT EXISTS recommendation_jobs (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    source_revision VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    stage VARCHAR(20),
    progress INT NOT NULL DEFAULT 0,
    candidate_count INT NOT NULL DEFAULT 0,
    expected_chunks INT NOT NULL DEFAULT 0,
    received_chunks INT NOT NULL DEFAULT 0,
    model_version VARCHAR(100),
    policy_version VARCHAR(100),
    error_code VARCHAR(100),
    created_at TIMESTAMP(6) NOT NULL,
    started_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    version BIGINT NOT NULL DEFAULT 0,
    INDEX idx_recommendation_job_workspace_created (workspace_id, created_at)
);

CREATE TABLE IF NOT EXISTS recommendations (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL,
    pair_key VARCHAR(100) NOT NULL,
    left_story_id VARCHAR(36) NOT NULL,
    right_story_id VARCHAR(36) NOT NULL,
    left_fingerprint VARCHAR(64) NOT NULL,
    right_fingerprint VARCHAR(64) NOT NULL,
    duplicate_score DOUBLE NOT NULL,
    confidence_band VARCHAR(10) NOT NULL,
    evidence_json LONGTEXT NOT NULL,
    representative_story_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    source_revision VARCHAR(64),
    model_version VARCHAR(100) NOT NULL,
    policy_version VARCHAR(100) NOT NULL,
    calibrated BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMP(6) NOT NULL,
    reviewed_at TIMESTAMP(6),
    reviewed_by VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_recommendation_revision UNIQUE (
        workspace_id, pair_key, left_fingerprint, right_fingerprint
    ),
    INDEX idx_recommendation_queue (workspace_id, status, confidence_band, generated_at),
    INDEX idx_recommendation_job (job_id)
);

CREATE TABLE IF NOT EXISTS recommendation_decisions (
    id VARCHAR(36) PRIMARY KEY,
    recommendation_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    note VARCHAR(1000),
    reviewed_by VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uq_recommendation_idempotency UNIQUE (idempotency_key),
    INDEX idx_recommendation_decision_recommendation (recommendation_id),
    CONSTRAINT fk_recommendation_decision_recommendation
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS recommendation_event_receipts (
    event_id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(60) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_job_chunks (
    job_id VARCHAR(36) NOT NULL,
    chunk_index INT NOT NULL,
    received_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (job_id, chunk_index)
);
