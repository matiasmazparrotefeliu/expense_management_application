import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  mockNewAccount,
  routerMock,
  setupDefaultMocks,
} from '@/__tests__/utils/testUtils';
import NewAccountPage from '../../app/(protected)/accounts/new/page';
import { DataProvider } from '@/features/data/DataProvider';
import { createAccountSchema } from '@/features/auth/formSchemas';

// The mock factory is hoisted above the module body, so the api object lives
// in `vi.hoisted` (imports are not initialized yet when the factory runs).
const api = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getOperations: vi.fn(),
  createAccount: vi.fn(),
  getCategories: vi.fn(),
  createOperation: vi.fn(),
  extractOperationFromText: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/accounts/new',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock('@/api/operationsApi', () => api);

async function openAccountPage() {
  return render(
    <DataProvider>
      <NewAccountPage />
    </DataProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.push.mockReset();
  setupDefaultMocks(api);
});

describe('NewAccountPage', () => {
  it('creates the account, auto-selects it and redirects to the dashboard', async () => {
    const existing = [
      { id: 1, name: 'Cash USD', currency: 'USD', balance: 1200.5, bank: 'BBVA', is_active: true },
    ];
    api.getAccounts
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce([...existing, mockNewAccount])
      .mockResolvedValue([...existing, mockNewAccount]);
    api.getOperations.mockResolvedValue([]);
    api.createAccount.mockResolvedValue(mockNewAccount);

    await openAccountPage();

    await screen.findByRole('heading', { name: 'Crear cuenta' });
    fireEvent.change(screen.getByLabelText('Nombre de la cuenta'), {
      target: { value: 'Inversiones' },
    });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ARS' } });
    fireEvent.change(screen.getByLabelText('Balance inicial'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Entidad bancaria / plataforma'), {
      target: { value: 'Banco Galicia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(api.createAccount).toHaveBeenCalledWith({
        name: 'Inversiones',
        currency: 'ARS',
        balance: 500,
        bank: 'Banco Galicia',
      });
    });

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows a warning when creating an account with an existing name', async () => {
    api.getAccounts.mockResolvedValue([
      { id: 1, name: 'Cash USD', currency: 'USD', balance: 1200.5, bank: 'BBVA', is_active: true },
    ]);
    api.getOperations.mockResolvedValue([]);
    api.createAccount.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400 },
    });

    await openAccountPage();

    await screen.findByRole('heading', { name: 'Crear cuenta' });
    fireEvent.change(screen.getByLabelText('Nombre de la cuenta'), { target: { value: 'Cash USD' } });
    fireEvent.change(screen.getByLabelText('Balance inicial'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Entidad bancaria / plataforma'), {
      target: { value: 'BBVA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ya existe una cuenta con ese nombre')).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('rejects a non-positive starting balance via the schema', async () => {
    const { success, error } = createAccountSchema.safeParse({
      name: 'Foo',
      currency: 'USD',
      balance: '0',
      bank: 'BBVA',
    });
    expect(success).toBe(false);
    expect(error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['balance'], message: 'El balance inicial debe ser mayor a 0' }),
      ])
    );
  });
});
