import { api } from './api';
import type { Sprint, CreateSprintRequest, UpdateSprintRequest } from '@/types/sprint';
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

// Create a new sprint (optional 'YYYY-MM-DD' start/end dates; empty strings are sent as null)
export async function createSprint(workspaceId: string, data: CreateSprintRequest): Promise<Sprint | null> {
  try {
    const response = await api.post<ApiResponse<Sprint>>(`/sprints/workspace/${workspaceId}`, {
      name: data.name,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    });
    if (response.data.code === 1000) {
      return response.data.result || null;
    }
    return null;
  } catch (error) {
    console.error('Error creating sprint:', error);
    return null;
  }
}

/**
 * Rename a sprint / set its dates (PUT /sprints/{id}). Missing dates clear them, so always
 * send the current values. Throws the original axios error so callers can map codes
 * 1041 (end before start), 1042 (blank name), 1014 (no permission), 1020 (not found).
 */
export async function updateSprint(sprintId: string, data: UpdateSprintRequest): Promise<Sprint> {
  const response = await api.put<ApiResponse<Sprint>>(`/sprints/${sprintId}`, {
    name: data.name,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
  });
  if (response.data.code !== 1000 || !response.data.result) {
    throw new Error(response.data.message || 'Unable to update sprint');
  }
  return response.data.result;
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

/**
 * Start a sprint (POST /sprints/{id}/start). Only a ToDo sprint can be started.
 * Throws the original axios error so callers can map codes
 * 1021 (not ToDo), 1022 (another sprint of the workspace is InProgress), 1014 (no permission).
 */
export async function startSprint(sprintId: string): Promise<Sprint | null> {
  const response = await api.post<ApiResponse<Sprint>>(`/sprints/${sprintId}/start`);
  if (response.data && typeof response.data.code === 'number' && response.data.code !== 1000) {
    throw new Error(response.data.message || 'Unable to start sprint');
  }
  return response.data?.result ?? null;
}

/**
 * Complete a sprint (POST /sprints/{id}/complete). Only an InProgress sprint can be completed;
 * unfinished stories return to the backlog as ToDo, Done stories stay in the sprint.
 * Throws the original axios error so callers can map codes 1021 (not InProgress), 1014.
 */
export async function completeSprint(sprintId: string): Promise<Sprint | null> {
  const response = await api.post<ApiResponse<Sprint>>(`/sprints/${sprintId}/complete`);
  if (response.data && typeof response.data.code === 'number' && response.data.code !== 1000) {
    throw new Error(response.data.message || 'Unable to complete sprint');
  }
  return response.data?.result ?? null;
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
  updateSprint,
  getSprintStories,
  addStoryToSprint,
  addStoriesToSprint,
  startSprint,
  completeSprint,
  removeStoryFromSprint,
};
