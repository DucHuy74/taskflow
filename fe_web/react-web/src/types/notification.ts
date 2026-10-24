export type NotificationType = 'INVITATION_ACCEPTED' | 'INVITATION_DENIED' | 'WORKSPACE_INVITE';

/** Mirrors backend NotificationResponse. */
export interface NotificationResponse {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  /** For WORKSPACE_INVITE this is the invitation (or workspace) id the notification refers to. */
  referenceId: string;
  createdAt: string;
  read: boolean;
}
