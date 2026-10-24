import { api } from './api';
import type { Invitation, InvitationRole, SendInvitationRequest } from '@/types/invitation';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

const ROLES: readonly InvitationRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];

/** Normalize one backend InvitationResponse; returns null for items without an id. */
export function toInvitation(raw: unknown): Invitation | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<Record<keyof Invitation, unknown>>;
  if (typeof item.id !== 'string' || !item.id) return null;
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
  const role = typeof item.role === 'string' ? item.role.toUpperCase() : '';
  return {
    id: item.id,
    workspaceId: text(item.workspaceId) ?? '',
    workspaceName: text(item.workspaceName),
    role: (ROLES as readonly string[]).includes(role) ? (role as InvitationRole) : 'MEMBER',
    email: text(item.email) ?? '',
    inviterId: text(item.inviterId) ?? '',
    inviterEmail: text(item.inviterEmail),
    expiredAt: text(item.expiredAt) ?? '',
  };
}

/** accept/deny return ApiResponse<void>; tolerate an empty body. */
function isSuccess(data: ApiResponse<void> | undefined | null): boolean {
  return !data || data.code === undefined || data.code === 1000;
}

export const invitationService = {
  /**
   * Send invitation to join workspace
   */
  async sendInvitation(
    workspaceId: string,
    invitations: SendInvitationRequest[]
  ): Promise<boolean> {
    try {
      const results = await Promise.all(
        invitations.map((inv) =>
          api.post(`/workspace/${workspaceId}/invitations`, inv)
        )
      );

      return results.every(
        (res) => res.status === 200 || res.status === 201
      );
    } catch (error) {
      console.error('Error sending invitations:', error);
      return false;
    }
  },

  /**
   * GET /invitations/pending → ApiResponse<InvitationResponse[]>
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/invitations/pending');
      if (response.data?.code === 1000 && Array.isArray(response.data.result)) {
        return response.data.result
          .map(toInvitation)
          .filter((invitation): invitation is Invitation => invitation !== null);
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  },

  /**
   * POST /invitations/{id}/accept → ApiResponse<void> ("Invitation accepted")
   */
  async acceptInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<void>>(`/invitations/${invitationId}/accept`);
      return isSuccess(response.data);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  },

  /**
   * POST /invitations/{id}/deny → ApiResponse<void> ("Invitation denied")
   */
  async denyInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<void>>(`/invitations/${invitationId}/deny`);
      return isSuccess(response.data);
    } catch (error) {
      console.error('Error denying invitation:', error);
      return false;
    }
  },
};
