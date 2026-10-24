import apiClient from './client';
import type { RegisterPayload, LoginPayload, LoginResponse, TokenResponse, User } from '../types/auth';
import { API_ENDPOINTS } from '../utils/constants';

export const register = async (data: RegisterPayload): Promise<User> => {
  const response = await apiClient.post<User>(API_ENDPOINTS.USERS_NEW, data);
  return response.data;
};

export const login = async (data: LoginPayload): Promise<{ user: User; token: TokenResponse }> => {
  const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.USERS_LOGIN, data);
  const { access_token, token_type, user } = response.data;
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('user', JSON.stringify(user));
  return { user, token: { access_token, token_type } };
};

export const logout = async (): Promise<void> => {
  // Attempt to call backend logout endpoint if it exists
  try {
    await apiClient.post(API_ENDPOINTS.USERS_NEW.replace('/new', '/logout'));
  } catch {
    // Ignore errors - backend may not have logout endpoint
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};
