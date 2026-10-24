import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../../app/(protected)/page';
import { DataProvider } from '@/features/data/DataProvider';
import {
  mockAccounts,
  mockOperations,
  routerMock,
  mockAuthProvider,
  setupDefaultMocks,
} from '@/__tests__/utils/testUtils';

mockAuthProvider();

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const api = setupDefaultMocks();

vi.mock('@/api/operationsApi', () => api);

async function renderDashboard() {
  return render(
    <DataProvider>
      <DashboardPage />
    </DataProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.push.mockReset();
  setupDefaultMocks(api);
});

describe('Dashboard (operations panel)', () => {
  it('renders the accounts in the selector and the savings balance', async () => {
    api.getAccounts.mockResolvedValue(mockAccounts);
    api.getOperations.mockResolvedValue(mockOperations);

    await renderDashboard();

    expect(await screen.findByText('Cash USD — BBVA (USD)')).toBeInTheDocument();
    expect(screen.getByText('Efectivo ARS — Mercado Pago (ARS)')).toBeInTheDocument();
    expect(screen.getByText('Balance total de ahorros')).toBeInTheDocument();
  });

  it('shows the operations of the selected account', async () => {
    api.getAccounts.mockResolvedValue(mockAccounts);
    api.getOperations.mockResolvedValue(mockOperations);

    await renderDashboard();

    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Egreso')).toBeInTheDocument();
    expect(screen.getByText('Ingreso')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
  });

  it('shows an empty state when the user has no accounts', async () => {
    api.getAccounts.mockResolvedValue([]);
    api.getOperations.mockResolvedValue([]);

    await renderDashboard();

    expect(await screen.findByText(/Aún no tenés cuentas/)).toBeInTheDocument();
  });

  it('navigates to the separate form pages from the header buttons', async () => {
    api.getAccounts.mockResolvedValue(mockAccounts);
    api.getOperations.mockResolvedValue(mockOperations);

    await renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva operación' }));
    expect(routerMock.push).toHaveBeenCalledWith('/operations/new?account=1');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
    expect(routerMock.push).toHaveBeenCalledWith('/accounts/new');
  });

  it('logs out and navigates to the login page', async () => {
    api.getAccounts.mockResolvedValue(mockAccounts);
    api.getOperations.mockResolvedValue(mockOperations);

    await renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await vi.waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/login');
    });
  });
});
