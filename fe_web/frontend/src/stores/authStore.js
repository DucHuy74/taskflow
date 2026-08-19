import { create } from 'zustand';
import { authService } from '../api/authService';
import { profileService } from '../api/profileService';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const success = await authService.login(username, password);
      if (success) {
        set({ isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ error: 'Invalid credentials', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!authService.isAuthenticated()) {
      set({ isAuthenticated: false });
      return false;
    }
    try {
      const profile = await profileService.getMyProfile();
      set({ user: profile, isAuthenticated: true });
      return true;
    } catch {
      set({ isAuthenticated: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
