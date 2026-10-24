import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationService, toInvitation } from '@/services/invitationService';

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
    const backendItem = {
      id: 'inv-1',
      workspaceId: 'ws-1',
      workspaceName: 'Platform Engineering',
      role: 'MEMBER',
      email: 'huy@example.com',
      inviterId: 'u2',
      inviterEmail: 'linh@example.com',
      expiredAt: '2026-10-31T00:00:00Z',
    };

    it('should return empty array on error', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await invitationService.getPendingInvitations();

      expect(result).toEqual([]);
    });

    it('should unwrap ApiResponse<InvitationResponse[]>', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: [backendItem] } });

      const result = await invitationService.getPendingInvitations();

      expect(api.get).toHaveBeenCalledWith('/invitations/pending');
      expect(result).toEqual([backendItem]);
    });

    it('should keep null workspaceName / inviterEmail and drop items without an id', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({
        data: { code: 1000, result: [{ ...backendItem, workspaceName: null, inviterEmail: null }, { workspaceId: 'x' }, null] },
      });

      const result = await invitationService.getPendingInvitations();

      expect(result).toEqual([{ ...backendItem, workspaceName: null, inviterEmail: null }]);
    });

    it('should return empty array for the old raw-array shape or non-1000 codes', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: [backendItem] })
        .mockResolvedValueOnce({ data: { code: 1006, message: 'Unauthenticated' } });

      await expect(invitationService.getPendingInvitations()).resolves.toEqual([]);
      await expect(invitationService.getPendingInvitations()).resolves.toEqual([]);
    });
  });

  describe('toInvitation', () => {
    it('should normalize role casing and default unknown roles to MEMBER', () => {
      expect(toInvitation({ id: 'a', role: 'viewer' })?.role).toBe('VIEWER');
      expect(toInvitation({ id: 'a', role: 'OWNER' })?.role).toBe('MEMBER');
    });

    it('should treat blank names as null', () => {
      expect(toInvitation({ id: 'a', workspaceName: '  ', inviterEmail: '' })).toMatchObject({ workspaceName: null, inviterEmail: null });
    });

    it('should return null for invalid input', () => {
      expect(toInvitation(undefined)).toBeNull();
      expect(toInvitation({ id: '' })).toBeNull();
    });
  });

  describe('acceptInvitation', () => {
    it('should return true on success', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, message: 'Invitation accepted' } });

      const result = await invitationService.acceptInvitation('invitation-1');

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/invitations/invitation-1/accept');
    });

    it('should return false when the response code is not 1000', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1030, message: 'Invitation expired' } });

      await expect(invitationService.acceptInvitation('invitation-1')).resolves.toBe(false);
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
      vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, message: 'Invitation denied' } });

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
