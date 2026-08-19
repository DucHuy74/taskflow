import { create } from 'zustand';
import { workspaceService } from '../api/workspaceService';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceService.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
  },

  createWorkspace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await workspaceService.createWorkspace(data);
      await get().fetchWorkspaces();
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateWorkspace: async (workspaceId, data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await workspaceService.updateWorkspace(workspaceId, data);
      await get().fetchWorkspaces();
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.deleteWorkspace(workspaceId);
      await get().fetchWorkspaces();
      if (get().currentWorkspace?.id === workspaceId) {
        set({ currentWorkspace: null });
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMembers: async (workspaceId) => {
    try {
      const members = await workspaceService.getMembers(workspaceId);
      set({ members });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  },

  inviteMember: async (workspaceId, email, role = 'MEMBER') => {
    try {
      await workspaceService.inviteMember(workspaceId, { email, role });
      return true;
    } catch (error) {
      console.error('Failed to invite member:', error);
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
