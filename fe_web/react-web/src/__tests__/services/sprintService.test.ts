import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sprintService } from '@/services/sprintService';

// Mock the api module
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('sprintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSprints', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.getSprints('workspace-1');

      expect(result).toEqual([]);
      expect(api.get).toHaveBeenCalledWith('/sprints/workspace/workspace-1');
    });

    it('should return sprints on success', async () => {
      const { api } = await import('@/services/api');
      const mockSprints = [
        { id: '1', name: 'Sprint 1', status: 'ToDo' },
        { id: '2', name: 'Sprint 2', status: 'InProgress' },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockSprints },
      });

      const result = await sprintService.getSprints('workspace-1');

      expect(result).toEqual(mockSprints);
    });
  });

  describe('createSprint', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.createSprint('workspace-1', {
        name: 'Sprint 1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });

      expect(result).toBeNull();
    });

    it('should return created sprint on success', async () => {
      const { api } = await import('@/services/api');
      const mockSprint = { id: '1', name: 'New Sprint', status: 'ToDo' };
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, result: mockSprint },
      });

      const result = await sprintService.createSprint('workspace-1', {
        name: 'New Sprint',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });

      expect(result).toEqual(mockSprint);
    });
  });

  describe('getSprintStories', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.getSprintStories('sprint-1');

      expect(result).toEqual([]);
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

      const result = await sprintService.getSprintStories('sprint-1');

      expect(result).toEqual(mockStories);
    });

    it('should reject a non-array result instead of poisoning the story cache', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: { unexpected: [] } } });

      await expect(sprintService.getSprintStories('sprint-1')).resolves.toEqual([]);
    });
  });

  describe('addStoryToSprint', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      const result = await sprintService.addStoryToSprint('sprint-1', 'story-1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.addStoryToSprint('sprint-1', 'story-1');

      expect(result).toBe(false);
    });
  });

  describe('addStoriesToSprint', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      const result = await sprintService.addStoriesToSprint('sprint-1', ['story-1', 'story-2']);

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.addStoriesToSprint('sprint-1', ['story-1']);

      expect(result).toBe(false);
    });
  });

  describe('startSprint', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ status: 200 });

      const result = await sprintService.startSprint('sprint-1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.startSprint('sprint-1');

      expect(result).toBe(false);
    });
  });

  describe('completeSprint', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ status: 200 });

      const result = await sprintService.completeSprint('sprint-1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.completeSprint('sprint-1');

      expect(result).toBe(false);
    });
  });

  describe('removeStoryFromSprint', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockResolvedValue({ data: { code: 1000 } });

      const result = await sprintService.removeStoryFromSprint('story-1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockRejectedValue(new Error('Network error'));

      const result = await sprintService.removeStoryFromSprint('story-1');

      expect(result).toBe(false);
    });
  });
});
