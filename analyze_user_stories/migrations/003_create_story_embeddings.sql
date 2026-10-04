CREATE TABLE story_embeddings (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    content_fingerprint VARCHAR(64) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    vector LONGBLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_embedding_revision
        UNIQUE (workspace_id, story_id, content_fingerprint, model_version),
    INDEX idx_story_embedding_workspace (workspace_id),
    INDEX idx_story_embedding_story (story_id)
);
