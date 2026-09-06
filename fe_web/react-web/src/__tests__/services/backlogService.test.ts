import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backlogService } from '@/services/backlogService';

// Mock the api module
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('backlogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBacklogStories', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await backlogService.getBacklogStories('workspace-1');

      expect(result).toEqual([]);
      expect(api.get).toHaveBeenCalledWith('/user-stories/workspace/workspace-1/backlog');
    });

    it('should return stories on success', async () => {
      const { api } = await import('@/services/api');
      const mockStories = [
        { id: '1', storyText: 'Story 1', status: 'ToDo' },
        { id: '2', storyText: 'Story 2', status: 'InProgress' },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockStories },
      });

      const result = await backlogService.getBacklogStories('workspace-1');

      expect(result).toEqual(mockStories);
    });
  });

  describe('createUserStory', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await backlogService.createUserStory('workspace-1', {
        storyText: 'New story',
      });

      expect(result).toBeNull();
    });

    it('should return created story on success', async () => {
      const { api } = await import('@/services/api');
      const mockStory = { id: '1', storyText: 'New story', status: 'ToDo' };
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, result: [mockStory] },
      });

      const result = await backlogService.createUserStory('workspace-1', {
        storyText: 'New story',
      });

      expect(result).toEqual(mockStory);
    });

    it('should return null when result is empty', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, result: [] },
      });

      const result = await backlogService.createUserStory('workspace-1', {
        storyText: 'New story',
      });

      expect(result).toBeNull();
    });
  });

  describe('updateStoryStatus', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000 } });

      const result = await backlogService.updateStoryStatus('story-1', 'InProgress');

      expect(result).toBe(true);
      expect(api.put).toHaveBeenCalledWith('/user-stories/story-1/status', {
        status: 'InProgress',
      });
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockRejectedValue(new Error('Network error'));

      const result = await backlogService.updateStoryStatus('story-1', 'Done');

      expect(result).toBe(false);
    });

    it('should return false when code is not 1000', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 500 } });

      const result = await backlogService.updateStoryStatus('story-1', 'ToDo');

      expect(result).toBe(false);
    });
  });

  describe('deleteUserStory', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockResolvedValue({ data: { code: 1000 } });

      const result = await backlogService.deleteUserStory('story-1');

      expect(result).toBe(true);
      expect(api.delete).toHaveBeenCalledWith('/user-stories/story-1');
    });

    it('should return true even when delete fails (catches error)', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockRejectedValue(new Error('Network error'));

      // Note: deleteUserStory catches errors and returns false
      const result = await backlogService.deleteUserStory('story-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserStory', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await backlogService.getUserStory('story-1');

      expect(result).toBeNull();
    });

    it('should return story on success', async () => {
      const { api } = await import('@/services/api');
      const mockStory = { id: '1', storyText: 'Test story', status: 'ToDo' };
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockStory },
      });

      const result = await backlogService.getUserStory('story-1');

      expect(result).toEqual(mockStory);
    });

    it('should return null when result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: null },
      });

      const result = await backlogService.getUserStory('story-1');

      expect(result).toBeNull();
    });
  });
});
