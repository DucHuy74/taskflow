import { api } from './api';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';
import type { WorkspaceMemberResponse } from '@/types';

// Backend API response wrapper
interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
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
      const response = await api.post<ApiResponse<Workspace>>('/workspace', data);
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
   * Get workspace by ID
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
   * Update workspace
   */
  async updateWorkspace(id: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace | null> {
    try {
      const response = await api.put<ApiResponse<Workspace>>(`/workspace/${id}`, data);
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
      await api.delete(`/workspace/${id}`);
      return true;
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
   * Rebuild workspace graph in Neo4j
   */
  async rebuildGraph(workspaceId: string): Promise<boolean> {
    try {
      await api.post(`/workspace/${workspaceId}/rebuild-graph`);
      return true;
    } catch (error) {
      console.error('Error rebuilding graph:', error);
      return false;
    }
  },
};
