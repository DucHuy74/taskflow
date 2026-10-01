import { api } from './api';
import type { Sprint, CreateSprintRequest } from '@/types/sprint';
import type { UserStory } from '@/types/userStory';

// API Response type
interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

// Get all sprints for a workspace
export async function getSprints(workspaceId: string): Promise<Sprint[]> {
  try {
    const response = await api.get<ApiResponse<Sprint[]>>(`/sprints/workspace/${workspaceId}`);
    if (response.data.code === 1000 && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    return [];
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return [];
  }
}

// Create a new sprint
export async function createSprint(workspaceId: string, data: CreateSprintRequest): Promise<Sprint | null> {
  try {
    const response = await api.post<ApiResponse<Sprint>>(`/sprints/workspace/${workspaceId}`, data);
    if (response.data.code === 1000) {
      return response.data.result || null;
    }
    return null;
  } catch (error) {
    console.error('Error creating sprint:', error);
    return null;
  }
}

// Get stories in a sprint
export async function getSprintStories(sprintId: string): Promise<UserStory[]> {
  try {
    const response = await api.get<ApiResponse<UserStory[]>>(`/sprints/${sprintId}/user-stories`);
    if (response.data.code === 1000 && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    return [];
  } catch (error) {
    console.error('Error fetching sprint stories:', error);
    return [];
  }
}

// Add story to sprint
export async function addStoryToSprint(sprintId: string, storyId: string): Promise<boolean> {
  try {
    await api.post(`/sprints/${sprintId}/user-stories/${storyId}`);
    return true;
  } catch (error) {
    console.error('Error adding story to sprint:', error);
    return false;
  }
}

// Add multiple stories to sprint
export async function addStoriesToSprint(sprintId: string, storyIds: string[]): Promise<boolean> {
  try {
    await api.post(`/sprints/${sprintId}/user-stories`, { userStoryIds: storyIds });
    return true;
  } catch (error) {
    console.error('Error adding stories to sprint:', error);
    return false;
  }
}

// Start a sprint
export async function startSprint(sprintId: string): Promise<boolean> {
  try {
    const response = await api.post(`/sprints/${sprintId}/start`);
    return response.status === 200;
  } catch (error) {
    console.error('Error starting sprint:', error);
    return false;
  }
}

// Complete a sprint
export async function completeSprint(sprintId: string): Promise<boolean> {
  try {
    const response = await api.post(`/sprints/${sprintId}/complete`);
    return response.status === 200;
  } catch (error) {
    console.error('Error completing sprint:', error);
    return false;
  }
}

// Remove story from sprint (move to backlog)
export async function removeStoryFromSprint(userStoryId: string): Promise<boolean> {
  try {
    await api.delete(`/sprints/user-stories/${userStoryId}`);
    return true;
  } catch (error) {
    console.error('Error removing story from sprint:', error);
    return false;
  }
}

// Export as service object for consistency
export const sprintService = {
  getSprints,
  createSprint,
  getSprintStories,
  addStoryToSprint,
  addStoriesToSprint,
  startSprint,
  completeSprint,
  removeStoryFromSprint,
};
