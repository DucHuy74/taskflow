-- Add parse metadata columns for flexible parsing pipeline
-- MySQL: run each statement separately; skip if column already exists.

ALTER TABLE analyze_story_results
    ADD COLUMN asr_parse_method VARCHAR(30) NULL;

ALTER TABLE analyze_story_results
    ADD COLUMN asr_confidence DOUBLE NULL;
