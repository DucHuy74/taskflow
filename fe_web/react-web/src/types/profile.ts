/** Mirrors backend ProfileResponse (GET /my-profile, GET /profiles). */
export interface ProfileResponse {
  profileId: string;
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  dob: string | null;
}

/** Body for PUT /my-profile. `dob` is 'YYYY-MM-DD' in the past; null clears it. */
export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  dob: string | null;
}
