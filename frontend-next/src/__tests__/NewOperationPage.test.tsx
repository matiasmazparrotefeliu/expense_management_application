import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  mockAccounts,
  mockOperations,
  mockCreatedOperation,
  routerMock,
  setupDefaultMocks,
  setTestUrl,
} from '@/__tests__/utils/testUtils';
import NewOperationForm from '@/features/operations/NewOperationForm';
import { DataProvider } from '@/features/data/DataProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/operations/new',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

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

vi.mock('@/api/operationsApi', () => api);

const accounts = mockAccounts;
const operations = mockOperations;
const createdOperation = mockCreatedOperation;

async function gotoAiTab(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Mensaje con IA' }));
}

async function extractNarration(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Mensaje de la operación'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Extraer datos' }));
}

async function openOperationPage() {
  return render(
    <DataProvider>
      <NewOperationForm />
    </DataProvider>
  );
}

/**
 * Waits until the DataProvider's asynchronous account-selection effect has
 * applied an account (`selectedAccountId`): the submit button stays disabled
 * while it is null, so an enabled button guarantees submits/extractions go out
 * with the preselected `account_id` even under suite timing.
 */
async function waitForAccountSelected(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Registrar operación' })).toBeEnabled();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.push.mockReset();
  window.history.replaceState({}, '', '/operations/new');
  setupDefaultMocks(api);
});

describe('NewOperationPage (tabs IA / manual)', () => {
  it('shows the manual form by default and allows switching to the IA tab', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    expect(await screen.findByLabelText('Concepto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mensaje con IA' }));
    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Formulario manual' }));
    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();
  });

  it('creates a manual operation, redirects to the dashboard and updates the balance chip', async () => {
    const updatedAccounts = [{ ...accounts[0], balance: 1050.5 }, accounts[1]];
    const updatedOperations = [createdOperation, ...operations];
    api.getAccounts.mockResolvedValueOnce(accounts).mockResolvedValue(updatedAccounts);
    api.getOperations.mockResolvedValueOnce(operations).mockResolvedValue(updatedOperations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Gimnasio' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Nombre (opcional)'), { target: { value: 'Gym Plus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(api.createOperation).toHaveBeenCalledWith({
        concept: 'Gimnasio',
        amount: 150,
        type: 'egreso',
        account_id: 1,
        category_id: 5,
        currency: 'USD',
        name: 'Gym Plus',
      });
    });

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
    expect(await screen.findByText(/saldo US\$ 1\.050,50/)).toBeInTheDocument();
  });

  it('shows a warning when the manual operation fails due to insufficient balance', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    // The form surfaces the backend's `detail` verbatim, so fake a 400 with one.
    api.createOperation.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Insufficient balance' } },
    });

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Compra grande' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    expect(await screen.findByText('Insufficient balance')).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('extracts a narration, shows an editable preview and confirms via createOperation, redirecting to the dashboard', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    await extractNarration('gaste 9800 pesos en Carrefour');

    await waitFor(() => {
      expect(api.extractOperationFromText).toHaveBeenCalledWith('gaste 9800 pesos en Carrefour', 1);
    });
    expect(await screen.findByLabelText('Concepto')).toHaveValue('Gimnasio');
    expect(screen.getByLabelText('Monto')).toHaveValue(150);
    expect(screen.queryByLabelText('Moneda')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toHaveValue('egreso');
    expect(screen.getByLabelText('Categoría')).toHaveValue('5');
    expect(screen.getByLabelText('Nombre (opcional)')).toHaveValue('Gym Plus');

    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Natación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(api.createOperation).toHaveBeenCalledWith({
        concept: 'Natación',
        amount: 150,
        type: 'egreso',
        account_id: 1,
        category_id: 5,
        name: 'Gym Plus',
        currency: 'USD',
      });
    });

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  it('confirms the extracted operation against the account chosen in the preview, with that account currency', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    await extractNarration('gaste 9800 pesos en Carrefour');

    await screen.findByLabelText('Concepto');
    fireEvent.change(screen.getByLabelText('Cuenta', { selector: '#ai-preview-account' }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(api.createOperation).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 2, currency: 'ARS' })
      );
    });
  });

  it('shows the backend detail when the extraction fails', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.extractOperationFromText.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Currency mismatch: the operation is in ARS but the account operates in USD',
        },
      },
    });

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    await extractNarration('pague 10800 pesos');

    expect(await screen.findByText(/Currency mismatch/)).toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
  });

  it('shows the backend detail when confirming the extracted operation fails', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          detail:
            'Insufficient balance: the balance must stay strictly greater than the debited amount',
        },
      },
    });

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    await extractNarration('gaste 99999 pesos');

    await screen.findByLabelText('Concepto');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    expect(await screen.findByText(/Insufficient balance/)).toBeInTheDocument();
  });

  it('returns to the narration form when starting a new narration', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    await extractNarration('gaste 9800 pesos en Carrefour');

    await screen.findByLabelText('Concepto');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo relato' }));

    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('allows choosing the account in the manual and AI forms', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();

    fireEvent.change(screen.getByLabelText('Cuenta', { selector: '#operation-account' }), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Kiosco' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(api.createOperation).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 2 })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mensaje con IA' }));
    fireEvent.change(screen.getByLabelText('Cuenta', { selector: '#ai-account' }), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Mensaje de la operación'), {
      target: { value: 'gaste 9800 pesos en Carrefour' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Extraer datos' }));

    await waitFor(() => {
      expect(api.extractOperationFromText).toHaveBeenCalledWith('gaste 9800 pesos en Carrefour', 2);
    });
  });

  it('preselects the account from the ?account= query param', async () => {
    setTestUrl('/operations/new?account=2');
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    await openOperationPage();

    await screen.findByText('Cash USD — BBVA (USD)');
    await waitForAccountSelected();
    await gotoAiTab();
    const aiAccount = await screen.findByLabelText('Cuenta', { selector: '#ai-account' });
    await waitFor(() => {
      expect((aiAccount as unknown as HTMLSelectElement).value).toBe('2');
    });
    fireEvent.change(screen.getByLabelText('Mensaje de la operación'), {
      target: { value: 'gaste 9800 pesos en Carrefour' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Extraer datos' }));

    await waitFor(() => {
      expect(api.extractOperationFromText).toHaveBeenCalledWith(
        'gaste 9800 pesos en Carrefour',
        2
      );
    });
  });

  it('shows the empty state when the user has no accounts', async () => {
    api.getAccounts.mockResolvedValue([]);
    api.getOperations.mockResolvedValue([]);

    await openOperationPage();

    expect(await screen.findByText(/Aún no tenés cuentas/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();
  });
});
