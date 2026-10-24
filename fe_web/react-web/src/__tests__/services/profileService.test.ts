import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileService } from '@/services/profileService';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const profile = {
  profileId: 'p1',
  userId: 'u1',
  email: 'jane@example.com',
  username: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1990-01-01',
};

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyProfile should GET /my-profile', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: profile } });

    const result = await profileService.getMyProfile();

    expect(api.get).toHaveBeenCalledWith('/my-profile');
    expect(result).toEqual(profile);
  });

  it('getMyProfile should throw when result is missing', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000 } });

    await expect(profileService.getMyProfile()).rejects.toThrow();
  });

  it('getAllProfiles should GET /profiles', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: [profile] } });

    const result = await profileService.getAllProfiles();

    expect(api.get).toHaveBeenCalledWith('/profiles');
    expect(result).toEqual([profile]);
  });

  it('getAllProfiles should reject on 403 so callers can hide the section', async () => {
    const { api } = await import('@/services/api');
    const forbidden = Object.assign(new Error('403'), { response: { status: 403, data: { code: 1014 } } });
    vi.mocked(api.get).mockRejectedValue(forbidden);

    await expect(profileService.getAllProfiles()).rejects.toBe(forbidden);
  });

  describe('updateMyProfile', () => {
    it('should PUT /my-profile with names and dob and return the updated profile', async () => {
      const { api } = await import('@/services/api');
      const updated = { ...profile, firstName: 'Janet' };
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, message: 'Profile updated successfully', result: updated } });

      const result = await profileService.updateMyProfile({ firstName: 'Janet', lastName: 'Doe', dob: '1990-01-01' });

      expect(api.put).toHaveBeenCalledWith('/my-profile', { firstName: 'Janet', lastName: 'Doe', dob: '1990-01-01' });
      expect(result).toEqual(updated);
    });

    it('should always send dob explicitly (null clears it)', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: { ...profile, dob: null } } });

      await profileService.updateMyProfile({ firstName: 'Jane', lastName: 'Doe', dob: null });

      expect(api.put).toHaveBeenCalledWith('/my-profile', { firstName: 'Jane', lastName: 'Doe', dob: null });
    });

    it.each([
      [400, 1043],
      [400, 1044],
      [400, 1045],
      [502, 1046],
    ])('should rethrow HTTP %i code %i so the form can map it', async (status, code) => {
      const { api } = await import('@/services/api');
      const failure = Object.assign(new Error(String(status)), { response: { status, data: { code } } });
      vi.mocked(api.put).mockRejectedValue(failure);

      await expect(profileService.updateMyProfile({ firstName: 'Jane', lastName: 'Doe', dob: null })).rejects.toBe(failure);
    });

    it('should throw when the result is missing', async () => {
      const { api } = await import('@/services/api');
      vi.mocked(api.put).mockResolvedValue({ data: { code: 1000 } });

      await expect(profileService.updateMyProfile({ firstName: 'Jane', lastName: 'Doe', dob: null })).rejects.toThrow();
    });
  });
});
