import apiClient, { extractResult } from './apiClient';

export const userStoryService = {
  async createUserStory(workspaceId, storyData) {
    try {
      const payload = {
        workspaceId,
        title: storyData.title,
        subject: storyData.subject,
        verb: storyData.verb,
        object: storyData.object,
        storyPoint: storyData.storyPoint,
        priority: storyData.priority,
        description: storyData.description,
        status: 'TODO',
      };
      const response = await apiClient.post(`/user-stories/workspace/${workspaceId}`, payload);
      return extractResult(response);
    } catch (error) {
      console.error('Create user story error:', error);
      throw error;
    }
  },

  async createUserStories(workspaceId, stories) {
    try {
      // Backend expects array of { workspaceId, storyText, status }
      const payload = stories.map(story => ({
        workspaceId,
        storyText: story.storyText || story,
        status: story.status || 'TODO',
      }));
      const response = await apiClient.post(`/user-stories/workspace/${workspaceId}`, payload);
      return extractResult(response) || [];
    } catch (error) {
      console.error('Create user stories error:', error);
      throw error;
    }
  },

  async getBacklog(workspaceId) {
    try {
      const response = await apiClient.get(`/user-stories/workspace/${workspaceId}/backlog`);
      return extractResult(response) || [];
    } catch (error) {
      console.error('Get backlog error:', error);
      return [];
    }
  },

  async getUserStory(id) {
    try {
      const response = await apiClient.get(`/user-stories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get user story error:', error);
      throw error;
    }
  },

  async updateStatus(userStoryId, status) {
    try {
      const response = await apiClient.put(`/user-stories/${userStoryId}/status`, { status });
      return extractResult(response);
    } catch (error) {
      console.error('Update status error:', error);
      throw error;
    }
  },

  async deleteUserStory(userStoryId) {
    try {
      await apiClient.delete(`/user-stories/${userStoryId}`);
    } catch (error) {
      console.error('Delete user story error:', error);
      throw error;
    }
  },
};
