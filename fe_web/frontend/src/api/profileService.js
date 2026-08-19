import apiClient, { extractResult } from './apiClient';

export const profileService = {
  async getMyProfile() {
    try {
      const response = await apiClient.get('/my-profile');
      return extractResult(response);
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  async register({ username, email, password, firstName, lastName, dob }) {
    try {
      const response = await apiClient.post('/register', {
        username,
        email,
        password,
        firstName,
        lastName,
        dob,
      });
      return extractResult(response);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
};
