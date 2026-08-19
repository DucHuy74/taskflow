import apiClient, { extractResult } from './apiClient';

export const sprintService = {
  async getSprints(workspaceId) {
    try {
      const response = await apiClient.get(`/sprints/workspace/${workspaceId}`);
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get sprints error:', error);
      return [];
    }
  },

  async createSprint(workspaceId, { name, startDate, endDate }) {
    try {
      const response = await apiClient.post(`/sprints/workspace/${workspaceId}`, {
        name,
        startDate,
        endDate,
      });
      return extractResult(response);
    } catch (error) {
      console.error('Create sprint error:', error);
      throw error;
    }
  },

  async startSprint(sprintId) {
    try {
      await apiClient.post(`/sprints/${sprintId}/start`);
    } catch (error) {
      console.error('Start sprint error:', error);
      throw error;
    }
  },

  async completeSprint(sprintId) {
    try {
      await apiClient.post(`/sprints/${sprintId}/complete`);
    } catch (error) {
      console.error('Complete sprint error:', error);
      throw error;
    }
  },

  async addStoryToSprint(sprintId, userStoryId) {
    try {
      await apiClient.post(`/sprints/${sprintId}/user-stories/${userStoryId}`);
    } catch (error) {
      console.error('Add story to sprint error:', error);
      throw error;
    }
  },

  async addStoriesToSprint(sprintId, userStoryIds) {
    try {
      await apiClient.post(`/sprints/${sprintId}/user-stories`, { userStoryIds });
    } catch (error) {
      console.error('Add stories to sprint error:', error);
      throw error;
    }
  },

  async removeStoryFromSprint(userStoryId) {
    try {
      await apiClient.delete(`/sprints/user-stories/${userStoryId}`);
    } catch (error) {
      console.error('Remove story from sprint error:', error);
      throw error;
    }
  },

  async getSprintStories(sprintId) {
    try {
      const response = await apiClient.get(`/sprints/${sprintId}/user-stories`);
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get sprint stories error:', error);
      return [];
    }
  },
};
