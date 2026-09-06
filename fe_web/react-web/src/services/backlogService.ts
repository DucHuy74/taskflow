import { api } from './api';
import type { UserStory, CreateUserStoryRequest } from '@/types/userStory';

// API Response type
interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

// Get backlog stories for a workspace
export async function getBacklogStories(workspaceId: string): Promise<UserStory[]> {
  try {
    const response = await api.get<ApiResponse<UserStory[]>>(`/user-stories/workspace/${workspaceId}/backlog`);
    if (response.data.code === 1000 && response.data.result) {
      return response.data.result;
    }
    return [];
  } catch (error) {
    console.error('Error fetching backlog stories:', error);
    return [];
  }
}

// Create a new user story
export async function createUserStory(
  workspaceId: string,
  data: CreateUserStoryRequest
): Promise<UserStory | null> {
  try {
    // Backend expects an array of requests
    const response = await api.post<ApiResponse<UserStory[]>>(`/user-stories/workspace/${workspaceId}`, [data]);
    if (response.data.code === 1000 && response.data.result && response.data.result.length > 0) {
      return response.data.result[0];
    }
    return null;
  } catch (error) {
    console.error('Error creating user story:', error);
    return null;
  }
}

// Update user story status
export async function updateStoryStatus(storyId: string, status: string): Promise<boolean> {
  try {
    const response = await api.put(`/user-stories/${storyId}/status`, { status });
    if (response.data.code === 1000) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating story status:', error);
    return false;
  }
}

// Delete user story
export async function deleteUserStory(storyId: string): Promise<boolean> {
  try {
    await api.delete(`/user-stories/${storyId}`);
    return true;
  } catch (error) {
    console.error('Error deleting user story:', error);
    return false;
  }
}

// Get user story by ID
export async function getUserStory(storyId: string): Promise<UserStory | null> {
  try {
    const response = await api.get<ApiResponse<UserStory>>(`/user-stories/${storyId}`);
    if (response.data.code === 1000 && response.data.result) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user story:', error);
    return null;
  }
}

// Export as service object
export const backlogService = {
  getBacklogStories,
  createUserStory,
  updateStoryStatus,
  deleteUserStory,
  getUserStory,
};
