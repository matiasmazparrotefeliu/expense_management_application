import { vi } from 'vitest';
import type { Account } from '@/types/auth';
import type { Category, Operation, ExtractedOperation } from '@/types/operation';

export const mockAccounts: Account[] = [
  { id: 1, name: 'Cash USD', currency: 'USD', balance: 1200.5, bank: 'BBVA', is_active: true },
  { id: 2, name: 'Efectivo ARS', currency: 'ARS', balance: 50000, bank: 'Mercado Pago', is_active: true },
];

export const mockNewAccount: Account = {
  id: 3,
  name: 'Inversiones',
  currency: 'ARS',
  balance: 0,
  bank: 'Banco Galicia',
  is_active: true,
};

export const mockOperations: Operation[] = [
  {
    id: 1,
    concept: 'Supermercado',
    amount: 250.5,
    type: 'Expense',
    currency: 'USD',
    date: '2026-09-01T10:00:00',
    account_id: 1,
    category_id: 1,
    category: { id: 1, name: 'Alimentos', type: 'Expense', description: null, is_active: true },
    name: 'Mercado',
  },
  {
    id: 2,
    concept: 'Sueldo',
    amount: 5000,
    type: 'Income',
    currency: 'USD',
    date: '2026-09-05T10:00:00',
    account_id: 1,
    category_id: 2,
    category: { id: 2, name: 'Salario', type: 'Income', description: null, is_active: true },
    name: 'Empresa',
  },
  {
    id: 3,
    concept:
      'Pago de la factura de internet y televisión por cable correspondiente al mes de octubre de la residencia',
    amount: 1500,
    type: 'Expense',
    currency: 'ARS',
    date: '2026-09-10T10:00:00',
    account_id: 1,
    category_id: 5,
    category: { id: 5, name: 'Compras', type: 'Expense', description: null, is_active: true },
    name: 'Personal Flow',
  },
];

export const mockCategories: Category[] = [
  { id: 5, name: 'Compras', type: 'Expense', description: null, is_active: true },
];

export const mockCreatedOperation: Operation = {
  id: 3,
  concept: 'Gimnasio',
  amount: 150,
  type: 'Expense',
  currency: 'USD',
  date: '2026-09-10T10:00:00',
  account_id: 1,
  category_id: 5,
  category: { id: 5, name: 'Compras', type: 'Expense', description: null, is_active: true },
  name: 'Gym Plus',
};

export const mockExtractedOperation: ExtractedOperation = {
  concept: 'Gimnasio',
  amount: 150,
  currency: 'USD',
  type: 'expense',
  category_id: 5,
  name: 'Gym Plus',
};

export function createMockApi() {
  return {
    getAccounts: vi.fn(),
    getOperations: vi.fn(),
    createAccount: vi.fn(),
    getCategories: vi.fn(),
    createOperation: vi.fn(),
    extractOperationFromText: vi.fn(),
  };
}

export function setupDefaultMocks(api = createMockApi()) {
  vi.mocked(api.getCategories).mockResolvedValue(mockCategories);
  vi.mocked(api.extractOperationFromText).mockResolvedValue(mockExtractedOperation);
  return api;
}

export function mockAuthProvider(overrides = {}) {
  return vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
      logout: vi.fn(),
      user: { id: 1, name: 'Test User', email: 'test@test.com', is_active: true, accounts: [] },
      token: 'mock-token',
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      ...overrides,
    }),
  }));
}