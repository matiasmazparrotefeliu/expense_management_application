import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from '@/features/auth/Dashboard';
import { getAccounts, getOperations, createAccount, getCategories, createOperation } from '@/api/operationsApi';
import type { Account } from '@/types/auth';
import type { Category, Operation } from '@/types/operation';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('@/api/operationsApi', () => ({
  getAccounts: vi.fn(),
  getOperations: vi.fn(),
  createAccount: vi.fn(),
  getCategories: vi.fn(),
  createOperation: vi.fn(),
}));

const accounts: Account[] = [
  { id: 1, name: 'Cash USD', currency: 'USD', balance: 1200.5, bank: 'BBVA', is_active: true },
  { id: 2, name: 'Efectivo ARS', currency: 'ARS', balance: 50000, bank: 'Mercado Pago', is_active: true },
];

const newAccount: Account = {
  id: 3,
  name: 'Inversiones',
  currency: 'ARS',
  balance: 0,
  bank: 'Banco Galicia',
  is_active: true,
};

const operations: Operation[] = [
  {
    id: 1,
    concept: 'Supermercado',
    amount: 250.5,
    type: 'Expense',
    currency: 'USD',
    date: '2026-09-01T10:00:00',
    account_id: 1,
    category_id: 1,
    category: { id: 1, name: 'Alimentos', description: null, is_active: true },
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
    category: { id: 2, name: 'Salario', description: null, is_active: true },
    name: 'Empresa',
  },
];

const categories: Category[] = [{ id: 5, name: 'Compras', description: null, is_active: true }];

const createdOperation: Operation = {
  id: 3,
  concept: 'Gimnasio',
  amount: 150,
  type: 'Expense',
  currency: 'USD',
  date: '2026-09-10T10:00:00',
  account_id: 1,
  category_id: 5,
  category: { id: 5, name: 'Compras', description: null, is_active: true },
  name: 'Gym Plus',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCategories).mockResolvedValue(categories);
});

describe('Dashboard', () => {
  it('renders the accounts in the selector and the savings balance', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts);
    vi.mocked(getOperations).mockResolvedValue(operations);

    render(<Dashboard />);

    expect(await screen.findByText('Cash USD — BBVA (USD)')).toBeInTheDocument();
    expect(screen.getByText('Efectivo ARS — Mercado Pago (ARS)')).toBeInTheDocument();
    expect(screen.getByText('Balance total de ahorros')).toBeInTheDocument();
  });

  it('shows the operations of the selected account', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts);
    vi.mocked(getOperations).mockResolvedValue(operations);

    render(<Dashboard />);

    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Egreso')).toBeInTheDocument();
    expect(screen.getByText('Ingreso')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
  });

  it('shows an empty state when the user has no accounts', async () => {
    vi.mocked(getAccounts).mockResolvedValue([]);
    vi.mocked(getOperations).mockResolvedValue([]);

    render(<Dashboard />);

    expect(await screen.findByText(/Aún no tenés cuentas/)).toBeInTheDocument();
  });

  it('creates a new account and selects it in the panel', async () => {
    vi.mocked(getAccounts).mockResolvedValue([]);
    vi.mocked(getOperations).mockResolvedValue([]);
    vi.mocked(createAccount).mockResolvedValue(newAccount);

    render(<Dashboard />);

    await screen.findByText(/Aún no tenés cuentas/);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
    fireEvent.change(screen.getByLabelText('Nombre de la cuenta'), { target: { value: 'Inversiones' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ARS' } });
    fireEvent.change(screen.getByLabelText('Balance inicial'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Entidad bancaria / plataforma'), {
      target: { value: 'Banco Galicia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(createAccount).toHaveBeenCalledWith({
        name: 'Inversiones',
        currency: 'ARS',
        balance: 500,
        bank: 'Banco Galicia',
      });
    });
    expect(await screen.findByText('Inversiones — Banco Galicia (ARS)')).toBeInTheDocument();
  });

  it('shows a warning when creating an account with an existing name', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts);
    vi.mocked(getOperations).mockResolvedValue(operations);
    vi.mocked(createAccount).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400 },
    });

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
    fireEvent.change(screen.getByLabelText('Nombre de la cuenta'), { target: { value: 'Cash USD' } });
    fireEvent.change(screen.getByLabelText('Balance inicial'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Entidad bancaria / plataforma'), {
      target: { value: 'BBVA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ya existe una cuenta con ese nombre')).toBeInTheDocument();
  });

  it('creates an operation that appears in the list and updates the balance', async () => {
    const updatedAccounts = [{ ...accounts[0], balance: 1050.5 }, accounts[1]];
    const updatedOperations = [createdOperation, ...operations];
    vi.mocked(getAccounts)
      .mockResolvedValueOnce(accounts)
      .mockResolvedValue(updatedAccounts);
    vi.mocked(getOperations)
      .mockResolvedValueOnce(operations)
      .mockResolvedValue(updatedOperations);
    vi.mocked(createOperation).mockResolvedValue(createdOperation);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Gimnasio' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Nombre (opcional)'), { target: { value: 'Gym Plus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(createOperation).toHaveBeenCalledWith({
        concept: 'Gimnasio',
        amount: 150,
        type: 'egreso',
        account_id: 1,
        category_id: 5,
        name: 'Gym Plus',
      });
    });

    expect(await screen.findByText('Gimnasio')).toBeInTheDocument();
    const expectedBalance = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(1050.5);
    expect(screen.getByText(expectedBalance)).toBeInTheDocument();
  });

  it('shows a warning when the operation fails due to insufficient balance', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts);
    vi.mocked(getOperations).mockResolvedValue(operations);
    vi.mocked(createOperation).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400 },
    });

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Compra grande' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    expect(await screen.findByText('Saldo insuficiente o datos inválidos')).toBeInTheDocument();
  });
});