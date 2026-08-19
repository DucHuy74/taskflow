import apiClient, { extractResult } from './apiClient';

export const notificationService = {
  async getUnread() {
    try {
      const response = await apiClient.get('/notifications/unread');
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  },

  async markAsRead(id) {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  },

  async markAllAsRead() {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  },
};

export const invitationService = {
  async accept(invitationId) {
    try {
      await apiClient.post(`/invitations/${invitationId}/accept`);
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  },

  async deny(invitationId) {
    try {
      await apiClient.post(`/invitations/${invitationId}/deny`);
    } catch (error) {
      console.error('Deny invitation error:', error);
      throw error;
    }
  },

  async getPending() {
    try {
      const response = await apiClient.get('/invitations/pending');
      return response.data || [];
    } catch (error) {
      console.error('Get pending invitations error:', error);
      return [];
    }
  },
};

export const profileService = {
  async getMyProfile() {
    try {
      const response = await apiClient.get('/my-profile');
      return extractResult(response);
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  async register({ email, password, name }) {
    try {
      const response = await apiClient.post('/register', { email, password, name });
      return extractResult(response);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
};
