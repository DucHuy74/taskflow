import type { WorkspaceRole } from './index';

export const PERMISSIONS = [
  'WORKSPACE_BROWSE',
  'WORKSPACE_ADMINISTER',
  'WORKSPACE_DELETE',
  'RECOMMENDATION_VIEW',
  'RECOMMENDATION_REVIEW',
  'RECOMMENDATION_ACCEPT',
  'MEMBER_VIEW',
  'MEMBER_INVITE',
  'MEMBER_MANAGE',
  'SPRINT_VIEW',
  'SPRINT_CREATE',
  'SPRINT_EDIT',
  'SPRINT_MANAGE',
  'ISSUE_VIEW',
  'ISSUE_CREATE',
  'ISSUE_EDIT',
  'ISSUE_DELETE',
  'ISSUE_TRANSITION',
  'ISSUE_ASSIGN',
  'ISSUE_LINK',
  'ISSUE_MOVE',
  'ISSUE_REPORTER_EDIT',
  'ISSUE_DUE_DATE_EDIT',
  'COMMENT_ADD',
  'COMMENT_EDIT',
  'COMMENT_DELETE',
  'ATTACHMENT_ADD',
  'ATTACHMENT_DELETE',
  'WORKLOG_ADD',
  'WORKLOG_EDIT',
  'WORKLOG_DELETE',
  'WATCHER_MANAGE',
  'DEVELOPMENT_TOOLS_VIEW',
  'ACL_READ',
  'ACL_WRITE',
  'ACL_FULL_CONTROL',
] as const;

/** Backend enum com.xxxx.dddd.domain.model.enums.Permission. */
export type Permission = typeof PERMISSIONS[number];

export const PERMISSION_CATEGORIES: { label: string; permissions: Permission[] }[] = [
  { label: 'Workspace', permissions: ['WORKSPACE_BROWSE', 'WORKSPACE_ADMINISTER', 'WORKSPACE_DELETE'] },
  { label: 'Recommendations', permissions: ['RECOMMENDATION_VIEW', 'RECOMMENDATION_REVIEW', 'RECOMMENDATION_ACCEPT'] },
  { label: 'Members', permissions: ['MEMBER_VIEW', 'MEMBER_INVITE', 'MEMBER_MANAGE'] },
  { label: 'Sprints', permissions: ['SPRINT_VIEW', 'SPRINT_CREATE', 'SPRINT_EDIT', 'SPRINT_MANAGE'] },
  {
    label: 'Issues',
    permissions: ['ISSUE_VIEW', 'ISSUE_CREATE', 'ISSUE_EDIT', 'ISSUE_DELETE', 'ISSUE_TRANSITION', 'ISSUE_ASSIGN', 'ISSUE_LINK', 'ISSUE_MOVE', 'ISSUE_REPORTER_EDIT', 'ISSUE_DUE_DATE_EDIT'],
  },
  { label: 'Comments', permissions: ['COMMENT_ADD', 'COMMENT_EDIT', 'COMMENT_DELETE'] },
  { label: 'Attachments', permissions: ['ATTACHMENT_ADD', 'ATTACHMENT_DELETE'] },
  { label: 'Work logs', permissions: ['WORKLOG_ADD', 'WORKLOG_EDIT', 'WORKLOG_DELETE'] },
  { label: 'Other', permissions: ['WATCHER_MANAGE', 'DEVELOPMENT_TOOLS_VIEW'] },
  { label: 'Access control', permissions: ['ACL_READ', 'ACL_WRITE', 'ACL_FULL_CONTROL'] },
];

/** Human-readable label, e.g. ISSUE_DUE_DATE_EDIT -> "Issue due date edit". */
export function formatPermission(permission: string): string {
  const text = permission.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type ResourceType = 'WORKSPACE' | 'SPRINT' | 'USER_STORY';
export type PrincipalType = 'USER' | 'ROLE';
export type PermissionEffect = 'ALLOW' | 'DENY';

export interface RolePermissionMatrixResponse {
  role: WorkspaceRole;
  permissions: Permission[];
}

export interface ResourceGrantResponse {
  id: string;
  workspaceId: string;
  resourceType: ResourceType;
  resourceId: string;
  principalType: PrincipalType;
  principalId: string;
  permission: Permission;
  effect: PermissionEffect;
}

export interface ResourceGrantRequest {
  resourceType: ResourceType;
  resourceId: string;
  principalType: PrincipalType;
  principalId: string;
  permission: Permission;
  effect: PermissionEffect;
}

/** GET /workspace/{id}/my-access */
export interface MyWorkspaceAccessResponse {
  role: WorkspaceRole;
  permissions: Permission[];
  grants: ResourceGrantResponse[];
}
