import { api } from './api';
import type { Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest } from '@/types/workspace';
import type { WorkspaceMemberResponse } from '@/types';

// Backend API response wrapper
interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

/** Result of POST /workspace/{id}/rebuild-graph. */
export interface RebuildGraphResponse {
  jobId: string;
  status: 'QUEUED';
}

export const workspaceService = {
  /**
   * Get all workspaces for current user
   */
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const response = await api.get<ApiResponse<Workspace[]>>('/workspace');
      if (response.data.code === 1000 && response.data.result) {
        return response.data.result;
      }
      return [];
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }
  },

  /**
   * Create a new workspace
   */
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace | null> {
    try {
      const response = await api.post<ApiResponse<Workspace>>('/workspace', {
        name: data.name,
        type: data.type,
        access: data.access,
      });
      if (response.data.code === 1000) {
        return response.data.result || null;
      }
      return null;
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null;
    }
  },

  /**
   * Get workspace by ID (GET /workspace/{id}).
   * Returns null on failure (404 code 1012 not found, 403 code 1014 not a member).
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    try {
      const response = await api.get<ApiResponse<Workspace>>(`/workspace/${id}`);
      if (response.data.code === 1000 && response.data.result) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }
  },

  /**
   * Update workspace. Backend requires the full { name, type, access } body.
   */
  async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace | null> {
    try {
      const response = await api.put<ApiResponse<Workspace>>(`/workspace/${id}`, {
        name: data.name,
        type: data.type,
        access: data.access,
      });
      if (response.data.code === 1000 && response.data.result) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      console.error('Error updating workspace:', error);
      return null;
    }
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(id: string): Promise<boolean> {
    try {
      const response = await api.delete<ApiResponse<void>>(`/workspace/${id}`);
      return response.data?.code === undefined || response.data.code === 1000;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }
  },

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberResponse[]> {
    try {
      const response = await api.get<ApiResponse<WorkspaceMemberResponse[]>>(`/workspace/${workspaceId}/members`);
      if (response.data.code === 1000 && response.data.result) {
        return response.data.result;
      }
      return [];
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  },

  /**
   * Trigger an async rebuild of the workspace graph.
   * Returns the queued recommendation job id (poll recommendationService.latestJob), or null on failure.
   */
  async rebuildGraph(workspaceId: string): Promise<string | null> {
    try {
      const response = await api.post<ApiResponse<RebuildGraphResponse>>(`/workspace/${workspaceId}/rebuild-graph`);
      if (response.data?.code === 1000 && response.data.result?.jobId) {
        return response.data.result.jobId;
      }
      return null;
    } catch (error) {
      console.error('Error rebuilding graph:', error);
      return null;
    }
  },
};
