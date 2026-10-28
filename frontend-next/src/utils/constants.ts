import { OperationTypeMapper, OPERATION_TYPE_OPTIONS } from '@/types/operation';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
  OPERATIONS_NEW: '/operations/new',
  OPERATIONS_EDIT: '/operations/edit',
  ACCOUNTS_NEW: '/accounts/new',
} as const;

export const CURRENCIES = ['USD', 'ARS'] as const;

export const OPERATION_TYPES = OPERATION_TYPE_OPTIONS;

export const TYPE_LABELS = {
  Income: 'Ingreso',
  Expense: 'Egreso',
  Transfer: 'Transferencia',
} as const;

export { OperationTypeMapper };

export const API_ENDPOINTS = {
  ACCOUNTS: '/accounts/',
  ACCOUNTS_NEW: '/accounts/new',
  OPERATIONS: '/operations/',
  OPERATIONS_NEW: '/operations/new',
  OPERATIONS_FROM_TEXT: '/operations/from-text',
  OPERATIONS_BY_ID: '/operations',
  CATEGORIES: '/categories/',
  USERS_NEW: '/users/new',
  USERS_LOGIN: '/users/login',
} as const;
