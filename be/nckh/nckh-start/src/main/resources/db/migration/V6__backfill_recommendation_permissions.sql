-- V3 only widened the permission ENUM; roles seeded before the recommendation workflow
-- still lack RECOMMENDATION_* and their stored permission set overrides DefaultPermissionMatrix.
-- Backfill each role with the recommendation permissions its default matrix grants.
-- Roles with no stored permissions are skipped: they already fall back to the default matrix,
-- and inserting rows would shrink them to only these permissions.
-- Idempotent: existing rows are not inserted again.
INSERT INTO workspace_role_permission (wsp_role_id, permission)
SELECT r.wsp_role_id, d.permission
FROM workspace_role r
JOIN (
    SELECT 'ADMIN' AS role_name, 'RECOMMENDATION_VIEW' AS permission
    UNION ALL SELECT 'ADMIN', 'RECOMMENDATION_REVIEW'
    UNION ALL SELECT 'ADMIN', 'RECOMMENDATION_ACCEPT'
    UNION ALL SELECT 'MEMBER', 'RECOMMENDATION_VIEW'
    UNION ALL SELECT 'MEMBER', 'RECOMMENDATION_REVIEW'
    UNION ALL SELECT 'VIEWER', 'RECOMMENDATION_VIEW'
) d ON d.role_name = r.wsp_role_name
WHERE EXISTS (
    SELECT 1 FROM workspace_role_permission e
    WHERE e.wsp_role_id = r.wsp_role_id
)
AND NOT EXISTS (
    SELECT 1 FROM workspace_role_permission x
    WHERE x.wsp_role_id = r.wsp_role_id
      AND x.permission = d.permission
);
