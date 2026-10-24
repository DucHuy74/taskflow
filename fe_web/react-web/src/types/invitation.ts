export type InvitationRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

/** Mirrors backend InvitationResponse (GET /invitations/pending). */
export interface Invitation {
  id: string;
  workspaceId: string;
  /** Null when the workspace could not be resolved. */
  workspaceName: string | null;
  role: InvitationRole;
  email: string;
  inviterId: string;
  /** Null when the inviter's profile could not be resolved. */
  inviterEmail: string | null;
  expiredAt: string;
}

export interface SendInvitationRequest {
  email: string;
  role: InvitationRole;
}
