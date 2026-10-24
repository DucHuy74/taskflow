import { api } from './api';
import type { ProfileResponse, UpdateProfileRequest } from '@/types/profile';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

export const profileService = {
  /** GET /my-profile — the signed-in user's profile. */
  async getMyProfile(): Promise<ProfileResponse> {
    const response = await api.get<ApiResponse<ProfileResponse>>('/my-profile');
    if (response.data.code !== 1000 || !response.data.result) {
      throw new Error(response.data.message || 'Unable to load profile');
    }
    return response.data.result;
  },

  /**
   * PUT /my-profile — update the signed-in user's names and date of birth.
   * `dob` null/missing CLEARS it on the backend, so always send the current value.
   * Throws the original axios error so callers can map codes
   * 1043/1044/1045 (validation) and 1046 (identity sync failed, nothing saved).
   */
  async updateMyProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    const response = await api.put<ApiResponse<ProfileResponse>>('/my-profile', {
      firstName: data.firstName,
      lastName: data.lastName,
      dob: data.dob || null,
    });
    if (response.data.code !== 1000 || !response.data.result) {
      throw new Error(response.data.message || 'Unable to update profile');
    }
    return response.data.result;
  },

  /**
   * GET /profiles — every user profile. Restricted to realm ADMIN;
   * other users get 403, which callers should treat as "not available".
   */
  async getAllProfiles(): Promise<ProfileResponse[]> {
    const response = await api.get<ApiResponse<ProfileResponse[]>>('/profiles');
    if (response.data.code !== 1000) {
      throw new Error(response.data.message || 'Unable to load profiles');
    }
    return Array.isArray(response.data.result) ? response.data.result : [];
  },
};

export default profileService;
