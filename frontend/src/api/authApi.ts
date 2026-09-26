import apiClient from './client';
import type { RegisterPayload, LoginPayload, LoginResponse, TokenResponse, User } from '../types/auth';

export const register = async (data: RegisterPayload): Promise<User> => {
  const response = await apiClient.post<User>('/users/new', data);
  return response.data;
};

export const login = async (data: LoginPayload): Promise<{ user: User; token: TokenResponse }> => {
  const response = await apiClient.post<LoginResponse>('/users/login', data);
  const { access_token, token_type, user } = response.data;
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('user', JSON.stringify(user));
  return { user, token: { access_token, token_type } };
};

export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};
