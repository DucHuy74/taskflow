import { create } from 'zustand';
import { notificationService, invitationService } from '../api/notificationService';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pendingInvitations: [],
  isLoading: false,

  fetchUnread: async () => {
    set({ isLoading: true });
    try {
      const notifications = await notificationService.getUnread();
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  fetchPendingInvitations: async () => {
    try {
      const invitations = await invitationService.getPending();
      set({ pendingInvitations: invitations });
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  },

  acceptInvitation: async (invitationId) => {
    try {
      await invitationService.accept(invitationId);
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter((i) => i.id !== invitationId),
      }));
      return true;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      return false;
    }
  },

  denyInvitation: async (invitationId) => {
    try {
      await invitationService.deny(invitationId);
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter((i) => i.id !== invitationId),
      }));
      return true;
    } catch (error) {
      console.error('Failed to deny invitation:', error);
      return false;
    }
  },
}));
