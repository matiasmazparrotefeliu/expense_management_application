import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  mockAccounts,
  mockOperations,
  routerMock,
  mockAuthProvider,
  setupDefaultMocks,
} from '@/__tests__/utils/testUtils';
import DashboardPage from '../../app/(protected)/page';
import { DataProvider } from '@/features/data/DataProvider';

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

mockAuthProvider();

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

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
    expect(await screen.findByText('Balance total de ahorros')).toBeInTheDocument();
  });

  it('shows the operations of the selected account', async () => {
    api.getAccounts.mockResolvedValue(mockAccounts);
    api.getOperations.mockResolvedValue(mockOperations);

    await renderDashboard();

    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    // Two table rows are expenses (Supermercado + the cable bill), so several
    // cells legitimately share the "Egreso" label.
    expect(screen.getAllByText('Egreso').length).toBeGreaterThan(0);
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

    // Wait for the asynchronous selection effect (`selectedAccountId`): the
    // savings balance block only renders once an account is selected, so its
    // appearance guarantees the "Nueva operación" button carries `?account=1`
    // (the <select> alone would misleadingly show its first option).
    await screen.findByText('Balance total de ahorros');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
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
