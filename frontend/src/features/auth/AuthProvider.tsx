import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import type { AuthState, AuthAction, User } from '../../types/auth';
import type { TokenResponse } from '../../types/auth';
import { login as loginApi, register as registerApi, logout as logoutApi } from '../../api/authApi';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

const initialState: AuthState = {
  user: null,
  token: null,
  loading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return { user: action.payload.user, token: action.payload.token.access_token, loading: false, error: null };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          const tokenResp: TokenResponse = { access_token: token, token_type: 'bearer' };
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: tokenResp } });
        } catch {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (data: { email: string; password: string }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await loginApi(data);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: result.user, token: result.token } });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message =
        status === 404
          ? 'No existe un usuario registrado con ese email'
          : status === 400
            ? 'Email o contraseña incorrectos'
            : 'Error al iniciar sesión';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    }
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const user = await registerApi(data);
      const tokenResp: TokenResponse = { access_token: '', token_type: 'bearer' };
      dispatch({ type: 'REGISTER_SUCCESS', payload: { user, token: tokenResp } });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message =
        status === 409
          ? 'Ya existe un usuario registrado con ese nombre o email'
          : 'Error al registrarse';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    }
  };

  const logout = async () => {
    await logoutApi();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
