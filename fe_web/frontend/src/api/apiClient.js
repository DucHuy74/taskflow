import axios from 'axios';

// Use relative path for Vite proxy, or full URL for production
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api' : (import.meta.env.VITE_API_URL || '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Optional: Add API key header
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to extract result from API response
export const extractResult = (response) => {
  if (response.data?.code === 1000) {
    return response.data.result;
  }
  throw new Error(response.data?.message || 'API Error');
};

export default apiClient;
