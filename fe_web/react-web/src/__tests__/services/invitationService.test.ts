import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationService } from '@/services/invitationService';

// Mock the api module
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('invitationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendInvitation', () => {
    it('should return true when all invitations succeed', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ status: 200 });

      const result = await invitationService.sendInvitation('workspace-1', [
        { email: 'test1@example.com', role: 'MEMBER' },
        { email: 'test2@example.com', role: 'VIEWER' },
      ]);

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledTimes(2);
    });

    it('should return false when any invitation fails', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post)
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await invitationService.sendInvitation('workspace-1', [
        { email: 'test1@example.com', role: 'MEMBER' },
        { email: 'test2@example.com', role: 'VIEWER' },
      ]);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await invitationService.sendInvitation('workspace-1', [
        { email: 'test@example.com', role: 'MEMBER' },
      ]);

      expect(result).toBe(false);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await invitationService.getPendingInvitations();

      expect(result).toEqual([]);
    });

    it('should return invitations on success', async () => {
      const { api } = await import('@/services/api');
      const mockInvitations = [
        { id: '1', email: 'test@example.com', status: 'PENDING' },
        { id: '2', email: 'test2@example.com', status: 'PENDING' },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: mockInvitations });

      const result = await invitationService.getPendingInvitations();

      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when data is not an array', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: 'not an array' });

      const result = await invitationService.getPendingInvitations();

      expect(result).toEqual([]);
    });
  });

  describe('acceptInvitation', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      const result = await invitationService.acceptInvitation('invitation-1');

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/invitations/invitation-1/accept');
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await invitationService.acceptInvitation('invitation-1');

      expect(result).toBe(false);
    });
  });

  describe('denyInvitation', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000 } });

      const result = await invitationService.denyInvitation('invitation-1');

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/invitations/invitation-1/deny');
    });

    it('should return false on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const result = await invitationService.denyInvitation('invitation-1');

      expect(result).toBe(false);
    });
  });
});
