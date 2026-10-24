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

    it('should send name and dates and return the created sprint', async () => {
      const { api } = await import('@/services/api');
      const mockSprint = { id: '1', name: 'New Sprint', status: 'ToDo', startDate: '2024-01-01', endDate: '2024-01-14', createdAt: '2024-01-01T00:00:00Z' };
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, result: mockSprint },
      });

      const result = await sprintService.createSprint('workspace-1', {
        name: 'New Sprint',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });

      expect(api.post).toHaveBeenCalledWith('/sprints/workspace/workspace-1', {
        name: 'New Sprint',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });
      expect(result).toEqual(mockSprint);
    });

    it('should send missing or empty dates as null', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, result: { id: '1', name: 'S', status: 'ToDo', startDate: null, endDate: null } } });

      await sprintService.createSprint('workspace-1', { name: 'S', startDate: '' });

      expect(api.post).toHaveBeenCalledWith('/sprints/workspace/workspace-1', { name: 'S', startDate: null, endDate: null });
    });

    it('should return null on validation errors (1041/1042)', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400, data: { code: 1041 } } }));

      await expect(sprintService.createSprint('workspace-1', { name: 'S', startDate: '2024-01-14', endDate: '2024-01-01' })).resolves.toBeNull();
    });
  });

  describe('updateSprint', () => {
    it('should PUT /sprints/{id} with name and current dates', async () => {
      const { api } = await import('@/services/api');
      const updated = { id: 's1', name: 'Renamed', status: 'ToDo', startDate: '2024-02-01', endDate: '2024-02-01', createdAt: '2024-01-01T00:00:00Z' };
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: updated } });

      const result = await sprintService.updateSprint('s1', { name: 'Renamed', startDate: '2024-02-01', endDate: '2024-02-01' });

      expect(api.put).toHaveBeenCalledWith('/sprints/s1', { name: 'Renamed', startDate: '2024-02-01', endDate: '2024-02-01' });
      expect(result).toEqual(updated);
    });

    it('should send cleared dates as explicit nulls', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: { id: 's1', name: 'S', status: 'ToDo', startDate: null, endDate: null } } });

      await sprintService.updateSprint('s1', { name: 'S', startDate: '', endDate: null });

      expect(api.put).toHaveBeenCalledWith('/sprints/s1', { name: 'S', startDate: null, endDate: null });
    });

    it.each([
      [400, 1041],
      [400, 1042],
      [403, 1014],
      [404, 1020],
    ])('should rethrow HTTP %i code %i', async (status, code) => {
      const { api } = await import('@/services/api');
      const failure = Object.assign(new Error(String(status)), { response: { status, data: { code } } });
      vi.mocked(api.put).mockRejectedValue(failure);

      await expect(sprintService.updateSprint('s1', { name: 'S', startDate: null, endDate: null })).rejects.toBe(failure);
    });

    it('should throw when the result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000 } });

      await expect(sprintService.updateSprint('s1', { name: 'S', startDate: null, endDate: null })).rejects.toThrow();
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
