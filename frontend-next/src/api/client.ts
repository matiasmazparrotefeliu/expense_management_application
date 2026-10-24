import axios from 'axios';

import { API_BASE_URL } from '@/utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Request logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data ?? '');
  }
  return config;
});

// Custom event for unauthorized access - allows App Router navigation
const UNAUTHORIZED_EVENT = 'auth:unauthorized';

apiClient.interceptors.response.use(
  (response) => {
    // Response logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', response.status, response.config.url, response.data);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', error.response?.status, error.config?.url, error.response?.data);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export { UNAUTHORIZED_EVENT };
export default apiClient;
