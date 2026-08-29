import { api } from './api';
import type { Invitation, SendInvitationRequest } from '@/types/invitation';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
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
        (res) => res.data?.code === 1000 || res.status === 200 || res.status === 201
      );
    } catch (error) {
      console.error('Error sending invitations:', error);
      return false;
    }
  },

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    try {
      const response = await api.get<Invitation[]>('/invitations/pending');
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await api.post(`/invitations/${invitationId}/accept`);
      return response.status === 200 || response.data?.code === 1000;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  },

  /**
   * Deny invitation
   */
  async denyInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await api.post(`/invitations/${invitationId}/deny`);
      return response.status === 200 || response.data?.code === 1000;
    } catch (error) {
      console.error('Error denying invitation:', error);
      return false;
    }
  },
};
