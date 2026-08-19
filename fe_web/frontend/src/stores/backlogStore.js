import { create } from 'zustand';
import { userStoryService } from '../api/userStoryService';
import { sprintService } from '../api/sprintService';

export const useBacklogStore = create((set, get) => ({
  backlogStories: [],
  sprints: [],
  currentSprint: null,
  sprintStories: [],
  isLoading: false,
  error: null,

  // Backlog actions
  fetchBacklog: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const stories = await userStoryService.getBacklog(workspaceId);
      set({ backlogStories: stories, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createStories: async (workspaceId, stories) => {
    set({ isLoading: true, error: null });
    try {
      await userStoryService.createUserStories(workspaceId, stories);
      await get().fetchBacklog(workspaceId);
      return true;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateStoryStatus: async (storyId, status) => {
    try {
      await userStoryService.updateStatus(storyId, status);
      // Update local state optimistically
      set((state) => ({
        backlogStories: state.backlogStories.map((s) =>
          s.id === storyId ? { ...s, status } : s
        ),
      }));
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

  deleteStory: async (storyId, workspaceId) => {
    try {
      await userStoryService.deleteUserStory(storyId);
      await get().fetchBacklog(workspaceId);
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

  // Sprint actions
  fetchSprints: async (workspaceId) => {
    try {
      const sprints = await sprintService.getSprints(workspaceId);
      const activeSprint = sprints.find((s) => s.status === 'IN_PROGRESS');
      set({ sprints, currentSprint: activeSprint || null });
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  },

  createSprint: async (workspaceId, sprintData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await sprintService.createSprint(workspaceId, sprintData);
      await get().fetchSprints(workspaceId);
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startSprint: async (sprintId, workspaceId) => {
    try {
      await sprintService.startSprint(sprintId);
      await get().fetchSprints(workspaceId);
      return true;
    } catch (error) {
      console.error('Failed to start sprint:', error);
      return false;
    }
  },

  completeSprint: async (sprintId, workspaceId) => {
    try {
      await sprintService.completeSprint(sprintId);
      await get().fetchSprints(workspaceId);
      return true;
    } catch (error) {
      console.error('Failed to complete sprint:', error);
      return false;
    }
  },

  addStoryToSprint: async (sprintId, userStoryId, workspaceId) => {
    try {
      await sprintService.addStoryToSprint(sprintId, userStoryId);
      await get().fetchBacklog(workspaceId);
      await get().fetchSprints(workspaceId);
      return true;
    } catch (error) {
      console.error('Failed to add story to sprint:', error);
      return false;
    }
  },

  removeStoryFromSprint: async (userStoryId, workspaceId) => {
    try {
      await sprintService.removeStoryFromSprint(userStoryId);
      await get().fetchBacklog(workspaceId);
      return true;
    } catch (error) {
      console.error('Failed to remove story from sprint:', error);
      return false;
    }
  },

  fetchSprintStories: async (sprintId) => {
    try {
      const stories = await sprintService.getSprintStories(sprintId);
      set({ sprintStories: stories });
    } catch (error) {
      console.error('Failed to fetch sprint stories:', error);
    }
  },

  createStory: async ({ workspaceId, sprintId, ...storyData }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await userStoryService.createUserStory(workspaceId, storyData);
      if (sprintId) {
        await get().fetchSprintStories(sprintId);
      } else {
        await get().fetchBacklog(workspaceId);
      }
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
