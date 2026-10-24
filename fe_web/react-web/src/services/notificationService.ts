import { api } from './api';
import type { NotificationResponse } from '@/types/notification';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

function assertSuccess<T>(response: { data: ApiResponse<T> }, fallback: string): ApiResponse<T> {
  if (response.data.code !== 1000) {
    throw new Error(response.data.message || fallback);
  }
  return response.data;
}

export const notificationService = {
  /** GET /notifications/unread */
  async getUnread(): Promise<NotificationResponse[]> {
    const data = assertSuccess(
      await api.get<ApiResponse<NotificationResponse[]>>('/notifications/unread'),
      'Unable to load notifications',
    );
    return Array.isArray(data.result) ? data.result : [];
  },

  /** PATCH /notifications/{id}/read */
  async markAsRead(notificationId: string): Promise<void> {
    assertSuccess(
      await api.patch<ApiResponse<void>>(`/notifications/${notificationId}/read`),
      'Unable to mark notification as read',
    );
  },

  /** PATCH /notifications/read-all */
  async markAllAsRead(): Promise<void> {
    assertSuccess(
      await api.patch<ApiResponse<void>>('/notifications/read-all'),
      'Unable to mark notifications as read',
    );
  },
};

export default notificationService;
