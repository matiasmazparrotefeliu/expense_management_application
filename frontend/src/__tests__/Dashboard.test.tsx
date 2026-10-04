import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from '@/features/auth/Dashboard';
import { mockAccounts, mockOperations, mockCreatedOperation, mockNewAccount, createMockApi, setupDefaultMocks, mockAuthProvider } from '@/__tests__/utils/testUtils';

const api = createMockApi();
setupDefaultMocks(api);

mockAuthProvider();

vi.mock('@/api/operationsApi', () => api);

const accounts = mockAccounts;
const operations = mockOperations;
const createdOperation = mockCreatedOperation;
const newAccount = mockNewAccount;

async function openAiTab(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mensaje con IA' }));
}

async function extractNarration(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Mensaje de la operación'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Extraer datos' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks(api);
});

describe('Dashboard', () => {
  it('renders the accounts in the selector and the savings balance', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    render(<Dashboard />);

    expect(await screen.findByText('Cash USD — BBVA (USD)')).toBeInTheDocument();
    expect(screen.getByText('Efectivo ARS — Mercado Pago (ARS)')).toBeInTheDocument();
    expect(screen.getByText('Balance total de ahorros')).toBeInTheDocument();
  });

  it('shows the operations of the selected account', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    render(<Dashboard />);

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

    render(<Dashboard />);

    expect(await screen.findByText(/Aún no tenés cuentas/)).toBeInTheDocument();
  });

  it('creates a new account and selects it in the panel', async () => {
    api.getAccounts.mockResolvedValue([]);
    api.getOperations.mockResolvedValue([]);
    api.createAccount.mockResolvedValue(newAccount);

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
      expect(api.createAccount).toHaveBeenCalledWith({
        name: 'Inversiones',
        currency: 'ARS',
        balance: 500,
        bank: 'Banco Galicia',
      });
    });
    expect(await screen.findByText('Inversiones — Banco Galicia (ARS)')).toBeInTheDocument();
  });

  it('shows a warning when creating an account with an existing name', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createAccount.mockRejectedValue({
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
    api.getAccounts
      .mockResolvedValueOnce(accounts)
      .mockResolvedValue(updatedAccounts);
    api.getOperations
      .mockResolvedValueOnce(operations)
      .mockResolvedValue(updatedOperations);
    api.createOperation.mockResolvedValue(createdOperation);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
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
        name: 'Gym Plus',
      });
    });

    expect(await screen.findByText('Gimnasio')).toBeInTheDocument();
    const expectedBalance = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(1050.5);
    expect(screen.getByText(expectedBalance)).toBeInTheDocument();
  });

  it('shows a warning when the operation fails due to insufficient balance', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockRejectedValue({
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

  it('switches between the IA and the manual form', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));

    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mensaje con IA' }));

    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Formulario manual' }));

    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();
  });

  it('extracts a narration, shows an editable preview and confirms via createOperation', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    await openAiTab();
    await extractNarration('gaste 9800 pesos en Carrefour');

    await waitFor(() => {
      expect(api.extractOperationFromText).toHaveBeenCalledWith('gaste 9800 pesos en Carrefour', 1);
    });
    expect(await screen.findByLabelText('Concepto')).toHaveValue('Gimnasio');
    expect(screen.getByLabelText('Monto')).toHaveValue(150);
    expect(screen.getByLabelText('Moneda')).toHaveValue('USD');
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

    expect(await screen.findByText('Operación registrada correctamente')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
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

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    await openAiTab();
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
        status: 400,
        data: { detail: 'Insufficient balance: the balance must stay strictly greater than the debited amount' },
      },
    });

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    await openAiTab();
    await extractNarration('gaste 99999 pesos');

    await screen.findByLabelText('Concepto');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    expect(await screen.findByText(/Insufficient balance/)).toBeInTheDocument();
  });

  it('returns to the narration form when starting a new narration', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');
    await openAiTab();
    await extractNarration('gaste 9800 pesos en Carrefour');

    await screen.findByLabelText('Concepto');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo relato' }));

    expect(screen.getByLabelText('Mensaje de la operación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();
  });

  it('permite elegir la cuenta de la operación en el formulario', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);
    api.createOperation.mockResolvedValue(createdOperation);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
    fireEvent.change(screen.getByLabelText('Cuenta', { selector: '#operation-account' }), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Kiosco' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar operación' }));

    await waitFor(() => {
      expect(api.createOperation).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 2 }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
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

  it('los formularios de operacion y cuenta son mutuamente excluyentes', async () => {
    api.getAccounts.mockResolvedValue(accounts);
    api.getOperations.mockResolvedValue(operations);

    render(<Dashboard />);

    await screen.findByText('Cash USD — BBVA (USD)');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));
    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));

    expect(screen.getByLabelText('Nombre de la cuenta')).toBeInTheDocument();
    expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva operación' }));

    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre de la cuenta')).not.toBeInTheDocument();
  });
});