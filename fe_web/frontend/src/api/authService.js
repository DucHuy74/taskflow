// KeyCloak/OAuth2 configuration
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180/realms/nckh';
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'nckh_app';
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || '';

export const authService = {
  async login(username, password) {
    try {
      const response = await fetch(`${KEYCLOAK_URL}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          username,
          password,
          scope: 'openid',
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.saveTokens(data);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  saveTokens(data) {
    const expiresIn = data.expires_in || 300;
    const safeExpiresIn = expiresIn > 30 ? expiresIn - 30 : expiresIn;
    const expiresAt = Date.now() + safeExpiresIn * 1000;

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('id_token', data.id_token);
    localStorage.setItem('expires_at', expiresAt.toString());
  },

  async logout() {
    const idToken = localStorage.getItem('id_token');
    localStorage.clear();

    // KeyCloak logout URL
    if (idToken) {
      const logoutUrl = `${KEYCLOAK_URL}/protocol/openid-connect/logout?id_token_hint=${idToken}`;
      window.location.href = logoutUrl;
    } else {
      window.location.href = '/login';
    }
  },

  isAuthenticated() {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) return false;
    return Date.now() < parseInt(expiresAt);
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${KEYCLOAK_URL}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        localStorage.clear();
        window.location.href = '/login';
        return false;
      }

      const data = await response.json();
      this.saveTokens(data);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },
};
