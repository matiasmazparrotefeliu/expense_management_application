import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewAccountPage from '../../app/(protected)/accounts/new/page';
import { DataProvider } from '@/features/data/DataProvider';
import {
  mockNewAccount,
  routerMock,
  setupDefaultMocks,
} from '@/__tests__/utils/testUtils';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/accounts/new',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const api = setupDefaultMocks();

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

    await screen.findByText('Crear cuenta');
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

    await screen.findByText('Crear cuenta');
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
    api.getAccounts.mockResolvedValue([]);
    api.getOperations.mockResolvedValue([]);

    await openAccountPage();

    await screen.findByText('Crear cuenta');
    fireEvent.change(screen.getByLabelText('Nombre de la cuenta'), { target: { value: 'Foo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('El balance inicial debe ser mayor a 0')
    ).toBeInTheDocument();
    expect(api.createAccount).not.toHaveBeenCalled();
  });
});
