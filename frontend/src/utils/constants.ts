export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
} as const;
