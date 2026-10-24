import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '@/services/notificationService';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUnread', () => {
    it('should GET /notifications/unread and return the result', async () => {
      const { api } = await import('@/services/api');
      const notifications = [
        { id: 'n1', title: 'Workspace Invitation', content: 'You were invited', type: 'WORKSPACE_INVITE', referenceId: 'inv-1', createdAt: '2026-10-01T00:00:00Z', read: false },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: notifications } });

      const result = await notificationService.getUnread();

      expect(api.get).toHaveBeenCalledWith('/notifications/unread');
      expect(result).toEqual(notifications);
    });

    it('should return an empty list when result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: { code: 1000 } });

      await expect(notificationService.getUnread()).resolves.toEqual([]);
    });

    it('should throw on a non-success code', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockResolvedValue({ data: { code: 9999, message: 'Boom' } });

      await expect(notificationService.getUnread()).rejects.toThrow('Boom');
    });

    it('should propagate network errors (react-query handles retries)', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await expect(notificationService.getUnread()).rejects.toThrow('Network error');
    });
  });

  describe('markAsRead', () => {
    it('should PATCH /notifications/{id}/read', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.patch).mockResolvedValue({ data: { code: 1000, message: 'Marked as read' } });

      await notificationService.markAsRead('n1');

      expect(api.patch).toHaveBeenCalledWith('/notifications/n1/read');
    });

    it('should throw when the backend rejects', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.patch).mockRejectedValue(new Error('Forbidden'));

      await expect(notificationService.markAsRead('n1')).rejects.toThrow('Forbidden');
    });
  });

  describe('markAllAsRead', () => {
    it('should PATCH /notifications/read-all', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.patch).mockResolvedValue({ data: { code: 1000 } });

      await notificationService.markAllAsRead();

      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    });
  });
});
