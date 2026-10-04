export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  accounts: Account[];
}

export interface Account {
  id: number;
  name: string;
  currency: string;
  balance: number;
  bank: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginResponse extends TokenResponse {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface CreateAccountPayload {
  name: string;
  currency: string;
  balance: number;
  bank: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: TokenResponse } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: TokenResponse } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
