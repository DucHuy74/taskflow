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

      const result = await workspaceService.createWorkspace({ name: 'New Workspace', type: 'TEAM_MANAGED', access: 'PRIVATE' });

      expect(result).toEqual(mockWorkspace);
      expect(api.post).toHaveBeenCalledWith('/workspace', {
        name: 'New Workspace',
        type: 'TEAM_MANAGED',
        access: 'PRIVATE',
      });
    });
  });

  describe('getWorkspace', () => {
    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.getWorkspace('1');

      expect(result).toBeNull();
    });

    it('should GET /workspace/{id} and unwrap the result', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspace = { id: '2', name: 'Other', roles: ['ADMIN'], ownerId: 'u1', totalSprints: 3 };
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: mockWorkspace },
      });

      const result = await workspaceService.getWorkspace('2');

      expect(api.get).toHaveBeenCalledWith('/workspace/2');
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null on 404 (code 1012) or 403 (code 1014)', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get)
        .mockRejectedValueOnce(Object.assign(new Error('404'), { response: { status: 404, data: { code: 1012 } } }))
        .mockRejectedValueOnce(Object.assign(new Error('403'), { response: { status: 403, data: { code: 1014 } } }));

      await expect(workspaceService.getWorkspace('missing')).resolves.toBeNull();
      await expect(workspaceService.getWorkspace('forbidden')).resolves.toBeNull();
    });

    it('should return null when the result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000 } });

      await expect(workspaceService.getWorkspace('1')).resolves.toBeNull();
    });
  });

  describe('deleteWorkspace', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.delete).mockResolvedValue({ data: { code: 1000 } });

      const result = await workspaceService.deleteWorkspace('1');

      expect(result).toBe(true);
      expect(api.delete).toHaveBeenCalledWith('/workspace/1');
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
        { userId: '1', email: 'a@example.com', role: 'ADMIN' },
        { userId: '2', email: 'b@example.com', role: 'MEMBER' },
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

      const result = await workspaceService.updateWorkspace('1', { name: 'Updated', type: 'TEAM_MANAGED', access: 'PRIVATE' });

      expect(result).toBeNull();
    });

    it('should return updated workspace on success', async () => {
      const { api } = await import('@/services/api');
      const mockWorkspace = { id: '1', name: 'Updated Workspace' };
      vi.mocked(api.put).mockResolvedValue({
        data: { code: 1000, result: mockWorkspace },
      });

      const result = await workspaceService.updateWorkspace('1', { name: 'Updated Workspace', type: 'COMPANY_MANAGED', access: 'OPEN' });

      expect(result).toEqual(mockWorkspace);
      expect(api.put).toHaveBeenCalledWith('/workspace/1', {
        name: 'Updated Workspace',
        type: 'COMPANY_MANAGED',
        access: 'OPEN',
      });
    });
  });

  describe('rebuildGraph', () => {
    it('should return the queued job id on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({
        data: { code: 1000, message: 'Rebuild triggered', result: { jobId: 'job-2', status: 'QUEUED' } },
      });

      const result = await workspaceService.rebuildGraph('1');

      expect(api.post).toHaveBeenCalledWith('/workspace/1/rebuild-graph');
      expect(result).toBe('job-2');
    });

    it('should return null when no job id is returned', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      await expect(workspaceService.rebuildGraph('1')).resolves.toBeNull();
    });

    it('should return null on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await workspaceService.rebuildGraph('1');

      expect(result).toBeNull();
    });
  });
});
