import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { routerMock } from '@/__tests__/utils/testUtils';
import { DataProvider } from '@/features/data/DataProvider';
import MonthlyReportView from '@/features/reports/MonthlyReportView';
import type { MonthlySummary } from '@/types/budget';
import type { ActivePeriod } from '@/types/operation';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

// The mock factories are hoisted above the module body, so these api objects
// live in `vi.hoisted` (imports are not initialized yet when the factory runs).
const api = vi.hoisted(() => ({
  getMonthlySummary: vi.fn(),
  saveBudgetLimit: vi.fn(),
  deleteBudgetLimit: vi.fn(),
}));

vi.mock('@/api/budgetApi', () => api);

// The view renders inside the DataProvider, so the whole operations api (the
// provider's data sources plus the periods endpoint) is mocked here.
const operationsApi = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getCategories: vi.fn(),
  getOperations: vi.fn(),
  createAccount: vi.fn(),
  createOperation: vi.fn(),
  updateOperation: vi.fn(),
  deleteOperation: vi.fn(),
  getActivePeriods: vi.fn(),
}));

vi.mock('@/api/operationsApi', () => operationsApi);

const CURRENT = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
// Same-year previous month: in January wrap to December so the fixture always
// has a second selectable month within the current year (no flaky month).
const previousMonth = CURRENT.month > 1 ? CURRENT.month - 1 : 12;

// Current month first (the view's default), then one recent month of the same
// year and one December two years back.
const periods: ActivePeriod[] = [
  { ...CURRENT },
  { year: CURRENT.year, month: previousMonth },
  { year: CURRENT.year - 2, month: 12 },
];

const accounts = [
  { id: 1, name: 'Home', currency: 'USD', balance: 999, bank: 'Test Bank', is_active: true },
  { id: 2, name: 'Ahorro ARS', currency: 'ARS', balance: 5000, bank: 'Otra Bank', is_active: true },
];

const summary: MonthlySummary = {
  account_id: 1,
  currency: 'USD',
  ...CURRENT,
  total_salary: 1000,
  total_income: 1050,
  total_expenses: 400,
  net_available: 600,
  consumption_percentage: 40,
  global_limit: { id: 2, amount: 500, used: 400, percentage: 80 },
  categories: [
    {
      category_id: 7,
      category_name: 'Supermercado',
      type: 'Expense',
      amount: 250,
      count: 2,
      percentage: 62.5,
      limit: { id: 3, amount: 200, used: 250, percentage: 125 },
    },
    {
      category_id: 8,
      category_name: 'Viajes',
      type: 'Expense',
      amount: 150,
      count: 1,
      percentage: 37.5,
      limit: null,
    },
  ],
};

const openReport = () =>
  render(
    <DataProvider>
      <MonthlyReportView />
    </DataProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.getMonthlySummary.mockResolvedValue(summary);
  operationsApi.getAccounts.mockResolvedValue(accounts);
  operationsApi.getCategories.mockResolvedValue([]);
  operationsApi.getOperations.mockResolvedValue([]);
  operationsApi.getActivePeriods.mockResolvedValue(periods);
});

describe('MonthlyReportView (resumen mensual)', () => {
  it('renders the KPI cards, the global limit progress and the category table from the most recent active period', async () => {
    openReport();

    expect(await screen.findByTestId('total-salary')).toHaveTextContent(/1\.000,00/);
    expect(screen.getByTestId('total-expenses')).toHaveTextContent(/400,00/);
    expect(screen.getByTestId('net-available')).toHaveTextContent(/600,00/);
    // Non-salary income is informational only.
    expect(screen.getByText(/Otros ingresos/)).toBeInTheDocument();

    // Global limit configured: usage + exact inputs count.
    expect(screen.getByText(/400,00 gastados de 500,00/)).toBeInTheDocument();

    const rows = screen.getAllByTestId('category-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    // The capped category shows its progress; the uncapped one an optional input.
    expect(screen.getByLabelText('Límite de Viajes (opcional)')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getMonthlySummary).toHaveBeenLastCalledWith(CURRENT.year, CURRENT.month, 1);
    });
    expect(operationsApi.getActivePeriods).toHaveBeenCalledWith(1);
  });

  it('shows the empty state when the user has no accounts yet', async () => {
    operationsApi.getAccounts.mockResolvedValue([]);

    openReport();

    expect(
      await screen.findByText(/Aún no tenés cuentas/)
    ).toBeInTheDocument();
    expect(api.getMonthlySummary).not.toHaveBeenCalled();
  });

  it('switches the account and refetches summary + periods scoped to it', async () => {
    openReport();
    await screen.findByTestId('total-salary');

    fireEvent.change(screen.getByLabelText('Cuenta'), { target: { value: '2' } });

    await waitFor(() => {
      expect(api.getMonthlySummary).toHaveBeenLastCalledWith(CURRENT.year, CURRENT.month, 2);
    });
    expect(operationsApi.getActivePeriods).toHaveBeenLastCalledWith(2);
  });

  it('only offers months with operations and refetches when the period changes', async () => {
    openReport();
    await screen.findByTestId('total-salary');

    // The previous year only has a December period in the fixture: switching to
    // it collapses the month list and refetches with (year, 12).
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: String(CURRENT.year - 2) } });

    await waitFor(() => {
      expect(api.getMonthlySummary).toHaveBeenLastCalledWith(CURRENT.year - 2, 12, 1);
    });

    const monthSelect = screen.getByLabelText('Mes');
    expect(within(monthSelect).getByRole('option', { name: 'Diciembre' })).toBeInTheDocument();
    expect(within(monthSelect).queryByRole('option', { name: 'Febrero' })).not.toBeInTheDocument();
  });

  it('refetches when switching between two active months of the same year', async () => {
    openReport();
    await screen.findByTestId('total-salary');

    fireEvent.change(screen.getByLabelText('Mes'), {
      target: { value: String(previousMonth) },
    });

    await waitFor(() => {
      expect(api.getMonthlySummary).toHaveBeenLastCalledWith(CURRENT.year, previousMonth, 1);
    });
  });

  it('falls back to the most recent active period when the current month has no operations', async () => {
    operationsApi.getActivePeriods.mockResolvedValue([{ year: CURRENT.year - 2, month: 12 }]);

    openReport();

    await screen.findByTestId('total-salary');
    await waitFor(() => {
      expect(api.getMonthlySummary).toHaveBeenLastCalledWith(CURRENT.year - 2, 12, 1);
    });
  });

  it('saves the global limit, refetches, then removes it', async () => {
    openReport();
    await screen.findByTestId('total-salary');

    fireEvent.change(screen.getByLabelText('Monto del límite'), { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar límite' }));

    await waitFor(() => {
      expect(api.saveBudgetLimit).toHaveBeenCalledWith({
        account_id: 1,
        category_id: null,
        amount: 600,
        month: expect.any(Number),
        year: expect.any(Number),
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar límite' }));
    await waitFor(() => {
      expect(api.deleteBudgetLimit).toHaveBeenCalledWith(2);
    });
  });

  it('saves a category limit from the optional row input and refetches', async () => {
    openReport();
    await screen.findByTestId('total-salary');

    fireEvent.change(screen.getByLabelText('Límite de Viajes (opcional)'), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Asignar' }));

    await waitFor(() => {
      expect(api.saveBudgetLimit).toHaveBeenCalledWith({
        account_id: 1,
        category_id: 8,
        amount: 300,
        month: expect.any(Number),
        year: expect.any(Number),
      });
    });
  });

  it('surfaces the backend detail when saving a limit fails', async () => {
    api.saveBudgetLimit.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Income categories cannot have a spending limit.' } },
    });

    openReport();
    await screen.findByTestId('total-salary');

    fireEvent.change(screen.getByLabelText('Límite de Viajes (opcional)'), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(await screen.findByText('Income categories cannot have a spending limit.')).toBeInTheDocument();
  });

  it('shows the deficit warning when spending exceeded the salary', async () => {
    api.getMonthlySummary.mockResolvedValue({
      ...summary,
      net_available: -50,
      consumption_percentage: 105,
    });

    openReport();

    expect(await screen.findByTestId('deficit-warning')).toHaveTextContent(
      /gastando más de lo que ingresas/
    );
  });
});
