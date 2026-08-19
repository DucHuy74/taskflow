import apiClient, { extractResult } from './apiClient';

export const workspaceService = {
  async getWorkspaces() {
    try {
      const response = await apiClient.get('/workspace');
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get workspaces error:', error);
      return [];
    }
  },

  async createWorkspace({ name, type, access }) {
    try {
      const response = await apiClient.post('/workspace', { name, type, access });
      return extractResult(response);
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  },

  async updateWorkspace(workspaceId, data) {
    try {
      const response = await apiClient.put(`/workspace/${workspaceId}`, data);
      return extractResult(response);
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  },

  async deleteWorkspace(workspaceId) {
    try {
      await apiClient.delete(`/workspace/${workspaceId}`);
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  },

  async getMembers(workspaceId) {
    try {
      const response = await apiClient.get(`/workspace/${workspaceId}/members`);
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get members error:', error);
      return [];
    }
  },

  async inviteMember(workspaceId, { email, role }) {
    try {
      await apiClient.post(`/workspace/${workspaceId}/invitations`, { email, role });
    } catch (error) {
      console.error('Invite member error:', error);
      throw error;
    }
  },

  async rebuildGraph(workspaceId) {
    try {
      await apiClient.post(`/workspace/${workspaceId}/rebuild-graph`);
    } catch (error) {
      console.error('Rebuild graph error:', error);
      throw error;
    }
  },
};
