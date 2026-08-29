import { api } from './api';
import type { User } from '@/types';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'nckh';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'nckh_app';
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || '';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  dob: string;
  username: string;
  email: string;
  password: string;
}

// Keycloak token response interface
interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  id_token?: string;
  profile?: {
    sub: string;
    email: string;
    preferred_username: string;
    given_name?: string;
    family_name?: string;
    name?: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

// Decode JWT to get user info
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

// Extract user info from Keycloak token
function extractUserFromToken(accessToken: string): User {
  const payload = decodeJwt(accessToken);
  return {
    id: payload.sub as string || '',
    email: payload.email as string || '',
    name: (payload.name as string) ||
          [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
          (payload.preferred_username as string) ||
          'User',
    avatar: undefined,
  };
}

const authService = {
  /**
   * Login with username and password via Keycloak
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // Use Keycloak's token endpoint
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: data.username,
      password: data.password,
    });

    const response = await fetch(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error_description ||
        errorData.error ||
        'Login failed. Please check your credentials.'
      );
    }

    const tokenData: KeycloakTokenResponse = await response.json();

    // Store tokens
    localStorage.setItem('accessToken', tokenData.access_token);
    localStorage.setItem('refreshToken', tokenData.refresh_token);

    // Extract user from token
    const user = extractUserFromToken(tokenData.access_token);

    return {
      user,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  },

  /**
   * Register a new user via Keycloak Admin API
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // First create user in Keycloak
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const response = await fetch(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenData: KeycloakTokenResponse = await response.json();

    localStorage.setItem('accessToken', tokenData.access_token);
    localStorage.setItem('refreshToken', tokenData.refresh_token);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  },

  /**
   * Logout - invalidate tokens
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        const params = new URLSearchParams({
          client_id: KEYCLOAK_CLIENT_ID,
          refresh_token: refreshToken,
        });

        await fetch(
          `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear local storage regardless of server response
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /**
   * Login with Google - redirect to Keycloak
   */
  loginWithGoogle(): void {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    window.location.href = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
      `client_id=${KEYCLOAK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email&` +
      `state=${state}&` +
      `kc_idp_hint=google`;
  },

  /**
   * Login with GitHub - redirect to Keycloak
   */
  loginWithGithub(): void {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    window.location.href = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
      `client_id=${KEYCLOAK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email&` +
      `state=${state}&` +
      `kc_idp_hint=github`;
  },

  /**
   * Handle OAuth callback (code exchange)
   */
  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    const response = await api.post<{ access_token: string; refresh_token: string }>(
      '/auth/callback',
      { code }
    );

    localStorage.setItem('accessToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);

    const user = extractUserFromToken(response.data.access_token);

    return {
      user,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  },
};

export default authService;
