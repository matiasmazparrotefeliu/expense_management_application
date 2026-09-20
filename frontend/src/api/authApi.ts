import apiClient from './client';
import type { RegisterPayload, LoginPayload, TokenResponse, User } from '../types/auth';

export const register = async (data: RegisterPayload): Promise<User> => {
  const response = await apiClient.post<User>('/users/new', data);
  return response.data;
};

export const login = async (data: LoginPayload): Promise<{ user: User; token: TokenResponse }> => {
  const response = await apiClient.post<TokenResponse>('/users/login', data);
  const { access_token, token_type } = response.data;
  localStorage.setItem('access_token', access_token);
  const userResponse = await apiClient.get<User>('/users/');
  return { user: userResponse.data, token: { access_token, token_type } };
};

export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};
