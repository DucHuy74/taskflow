export interface Invitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DENIED';
  createdAt: string;
  expiredAt?: string;
}

export interface SendInvitationRequest {
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}
