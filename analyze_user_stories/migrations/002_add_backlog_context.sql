ALTER TABLE analyze_story_results
    ADD COLUMN asr_backlog_id VARCHAR(36) NULL AFTER asr_sprint_id;
