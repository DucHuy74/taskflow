import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from '@/services/workspaceService';

// Mock the api module
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('workspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspaces', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.getWorkspaces();

      expect(result).toEqual([]);
      expect(api.get).toHaveBeenCalledWith('/workspace');
    });

    it('should return workspaces on success', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspaces = [
        { id: '1', name: 'Workspace 1' },
        { id: '2', name: 'Workspace 2' },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockWorkspaces },
      });

      const result = await workspaceService.getWorkspaces();

      expect(result).toEqual(mockWorkspaces);
    });

    it('should return empty array when code is not 1000', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 500, result: null },
      });

      const result = await workspaceService.getWorkspaces();

      expect(result).toEqual([]);
    });
  });

  describe('createWorkspace', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.createWorkspace({ name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return created workspace on success', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspace = { id: '1', name: 'New Workspace' };
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, result: mockWorkspace },
      });

      const result = await workspaceService.createWorkspace({ name: 'New Workspace' });

      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('getWorkspace', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.getWorkspace('1');

      expect(result).toBeNull();
    });

    it('should return workspace on success', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspace = { id: '1', name: 'Test Workspace' };
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockWorkspace },
      });

      const result = await workspaceService.getWorkspace('1');

      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('deleteWorkspace', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockResolvedValue({ data: { code: 1000 } });

      const result = await workspaceService.deleteWorkspace('1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.deleteWorkspace('1');

      expect(result).toBe(false);
    });
  });

  describe('getWorkspaceMembers', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.getWorkspaceMembers('1');

      expect(result).toEqual([]);
    });

    it('should return members on success', async () => {
      const { api } = await import('@/services/api');
      const mockMembers = [
        { userId: '1', role: 'OWNER' },
        { userId: '2', role: 'MEMBER' },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockMembers },
      });

      const result = await workspaceService.getWorkspaceMembers('1');

      expect(result).toEqual(mockMembers);
    });
  });

  describe('updateWorkspace', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.updateWorkspace('1', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should return updated workspace on success', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspace = { id: '1', name: 'Updated Workspace' };
      vi.mocked(api.put).mockResolvedValue({
        data: { code: 1000, result: mockWorkspace },
      });

      const result = await workspaceService.updateWorkspace('1', { name: 'Updated Workspace' });

      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('rebuildGraph', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      const result = await workspaceService.rebuildGraph('1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.rebuildGraph('1');

      expect(result).toBe(false);
    });
  });
});
