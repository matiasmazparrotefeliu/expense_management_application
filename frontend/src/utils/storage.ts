const TOKEN_KEY = 'access_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredUser = (): unknown => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

export const setStoredUser = (user: unknown): void => {
  localStorage.setItem('user', JSON.stringify(user));
};
