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

  describe('createUserStories', () => {
    it('should send all stories in one array request', async () => {
      const { api } = await import('@/services/api');
      const requests = [
        { storyText: 'As a user, I want search' },
        { storyText: 'As an admin, I want reports' },
      ];
      const created = requests.map((story, index) => ({ id: String(index + 1), ...story, status: 'ToDo' }));
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, result: created } });

      const result = await backlogService.createUserStories('workspace-1', requests);

      expect(api.post).toHaveBeenCalledWith('/user-stories/workspace/workspace-1', requests);
      expect(result).toEqual(created);
    });

    it('should reject a non-success response so the composer can retain input', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1400, message: 'Invalid story' } });

      await expect(
        backlogService.createUserStories('workspace-1', [{ storyText: 'Invalid' }])
      ).rejects.toThrow('Invalid story');
    });
  });

  describe('updateStoryStatus', () => {
    it('returns the updated story on success', async () => {
      const { api } = await import('@/services/api');
      const updated = { id: 'story-1', storyText: 'S', status: 'InProgress' };
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: updated } });

      const result = await backlogService.updateStoryStatus('story-1', 'InProgress');

      expect(result).toEqual(updated);
      expect(api.put).toHaveBeenCalledWith('/user-stories/story-1/status', {
        status: 'InProgress',
      });
    });

    it.each([1026, 1027, 1028, 1014])('rethrows the original axios error for code %i', async (code) => {
      const { api } = await import('@/services/api');
      const failure = Object.assign(new Error('400'), { response: { status: code === 1014 ? 403 : 400, data: { code } } });
      vi.mocked(api.put).mockRejectedValue(failure);

      await expect(backlogService.updateStoryStatus('story-1', 'Done')).rejects.toBe(failure);
    });

    it('throws when code is not 1000', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 500, message: 'Boom' } });

      await expect(backlogService.updateStoryStatus('story-1', 'ToDo')).rejects.toThrow('Boom');
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

    it('should unwrap ApiResponse<UserStoryResponse>', async () => {
      const { api } = await import('@/services/api');
      const mockStory = { id: '1', storyText: 'Test story', status: 'ToDo', version: 3, sprintId: null, backlogId: 'b-1' };
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: mockStory } });

      const result = await backlogService.getUserStory('story-1');

      expect(api.get).toHaveBeenCalledWith('/user-stories/story-1');
      expect(result).toEqual(mockStory);
    });

    it('should return null when body is empty', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: null });

      const result = await backlogService.getUserStory('story-1');

      expect(result).toBeNull();
    });

    it('should return null when the code is not 1000 or the result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: { code: 1019, message: 'Not found' } })
        .mockResolvedValueOnce({ data: { code: 1000 } });

      await expect(backlogService.getUserStory('story-1')).resolves.toBeNull();
      await expect(backlogService.getUserStory('story-1')).resolves.toBeNull();
    });
  });

  describe('updateUserStory', () => {
    it('should PUT storyText and version and return the updated story', async () => {
      const { api } = await import('@/services/api');
      const updated = { id: 'story-1', storyText: 'Edited', status: 'ToDo', version: 4 };
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: updated } });

      const result = await backlogService.updateUserStory('story-1', { storyText: 'Edited', version: 3 });

      expect(api.put).toHaveBeenCalledWith('/user-stories/story-1', { storyText: 'Edited', version: 3 });
      expect(result).toEqual(updated);
    });

    it('should rethrow 409 conflicts so the UI can detect them', async () => {
      const { api } = await import('@/services/api');
      const conflict = Object.assign(new Error('Request failed with status code 409'), {
        response: { status: 409, data: { code: 1039, message: 'User story was updated by another user' } },
      });
      vi.mocked(api.put).mockRejectedValue(conflict);

      await expect(
        backlogService.updateUserStory('story-1', { storyText: 'Edited', version: 1 })
      ).rejects.toBe(conflict);
    });

    it('should throw when the response code is not 1000', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1001, message: 'Invalid key' } });

      await expect(
        backlogService.updateUserStory('story-1', { storyText: '', version: 1 })
      ).rejects.toThrow('Invalid key');
    });
  });
});
