-- Optimistic-locking column for UserStory (@Version us_version).
-- Idempotent: environments running with JPA_DDL_AUTO=update may already have the column.
SET @us_version_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_story'
      AND COLUMN_NAME = 'us_version'
);

SET @us_version_ddl := IF(
    @us_version_exists = 0,
    'ALTER TABLE user_story ADD COLUMN us_version BIGINT NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE us_version_stmt FROM @us_version_ddl;
EXECUTE us_version_stmt;
DEALLOCATE PREPARE us_version_stmt;
