import { api } from './api';
import type { Invitation, SendInvitationRequest } from '@/types/invitation';

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
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    try {
      // Backend returns ResponseEntity<List<InvitationResponse>> directly
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
      await api.post(`/invitations/${invitationId}/accept`);
      return true;
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
      await api.post(`/invitations/${invitationId}/deny`);
      return true;
    } catch (error) {
      console.error('Error denying invitation:', error);
      return false;
    }
  },
};
