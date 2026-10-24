/** Shared react-query keys used across components. */
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'unread'] as const;
export const MY_PROFILE_QUERY_KEY = ['my-profile'] as const;
export const PENDING_INVITATIONS_QUERY_KEY = ['pending-invitations'] as const;
export const membersQueryKey = (workspaceId: string) => ['workspace-members', workspaceId] as const;
/** Latest recommendation job (GET /workspaces/{id}/recommendation-jobs/latest). */
export const recommendationJobQueryKey = (workspaceId: string) => ['recommendation-job', workspaceId] as const;
export const workspaceAccessQueryKey = (workspaceId: string) => ['workspace-access', workspaceId] as const;

/** "5 minutes ago"-style label for an ISO timestamp. */
export function formatRelativeTime(value: string, now: number = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const seconds = Math.round((time - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(seconds / 86400), 'day');
  return new Date(value).toLocaleDateString();
}
