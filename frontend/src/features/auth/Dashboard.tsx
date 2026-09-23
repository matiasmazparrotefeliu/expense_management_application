import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getAccounts,
  getOperations,
  createAccount,
  getCategories,
  createOperation,
} from '@/api/operationsApi';
import type { Account } from '@/types/auth';
import type { Category, CreateOperationPayload, Operation, OperationTypeInput } from '@/types/operation';

const TYPE_LABELS: Record<Operation['type'], string> = {
  Income: 'Ingreso',
  Expense: 'Egreso',
  Transfer: 'Transferencia',
};

const OPERATION_TYPES: { value: OperationTypeInput; label: string }[] = [
  { value: 'egreso', label: 'Egreso' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'transferencia', label: 'Transferencia' },
];

const CURRENCIES = ['USD', 'ARS'];

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

function parseAmount(raw: string): number {
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
}

export function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState(CURRENCIES[0]);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [showOperationForm, setShowOperationForm] = useState(false);
  const [newOperationConcept, setNewOperationConcept] = useState('');
  const [newOperationAmount, setNewOperationAmount] = useState('');
  const [newOperationType, setNewOperationType] = useState<OperationTypeInput>('egreso');
  const [newOperationCategoryId, setNewOperationCategoryId] = useState('');
  const [newOperationName, setNewOperationName] = useState('');
  const [creatingOperation, setCreatingOperation] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((cats) => {
        if (!active) return;
        setCategories(cats);
        setNewOperationCategoryId((prev) => (prev === '' && cats.length > 0 ? String(cats[0].id) : prev));
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    Promise.all([getAccounts(), getOperations()])
      .then(([accts, ops]) => {
        if (!active) return;
        setAccounts(accts);
        setOperations(ops);
        if (accts.length > 0) {
          setSelectedAccountId((prev) => (prev === null ? accts[0].id : prev));
        }
      })
      .catch(() => {
        if (active) setError('No se pudieron cargar los datos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const accountOperations = useMemo(
    () =>
      operations
        .filter((operation) => operation.account_id === selectedAccountId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operations, selectedAccountId]
  );

  const operationAmount = parseAmount(newOperationAmount);
  const canSubmitOperation =
    !!selectedAccountId &&
    !!newOperationConcept.trim() &&
    operationAmount > 0 &&
    !!newOperationCategoryId;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingAccount(true);
    setAccountError(null);
    try {
      const created = await createAccount({ name: newAccountName.trim(), currency: newAccountCurrency });
      setAccounts((prev) => [...prev, created]);
      setSelectedAccountId(created.id);
      setNewAccountName('');
      setShowAccountForm(false);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setAccountError(
        status === 400 ? 'Ya existe una cuenta con ese nombre' : 'No se pudo crear la cuenta'
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleCreateOperation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId) return;
    setCreatingOperation(true);
    setOperationError(null);
    const payload: CreateOperationPayload = {
      concept: newOperationConcept.trim(),
      amount: operationAmount,
      type: newOperationType,
      account_id: selectedAccountId,
      category_id: Number(newOperationCategoryId),
      ...(newOperationName.trim() ? { name: newOperationName.trim() } : {}),
    };
    try {
      await createOperation(payload);
      const [accts, ops] = await Promise.all([getAccounts(), getOperations()]);
      setAccounts(accts);
      setOperations(ops);
      setSelectedAccountId(payload.account_id);
      setNewOperationConcept('');
      setNewOperationAmount('');
      setNewOperationName('');
      setShowOperationForm(false);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setOperationError(
        status === 400 ? 'Saldo insuficiente o datos inválidos' : 'No se pudo crear la operación'
      );
    } finally {
      setCreatingOperation(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Operaciones</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowOperationForm((prev) => !prev);
                setOperationError(null);
              }}
              disabled={accounts.length === 0}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Nueva operación
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAccountForm((prev) => !prev);
                setAccountError(null);
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Nueva cuenta
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {showOperationForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar operación</h2>
            <form onSubmit={handleCreateOperation}>
              {operationError && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <p className="text-sm text-red-700">{operationError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="operation-account" className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta
                  </label>
                  <select
                    id="operation-account"
                    value={selectedAccountId ?? ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                  >
                    {selectedAccount && (
                      <option value={selectedAccount.id}>
                        {selectedAccount.name} ({selectedAccount.currency})
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="operation-concept" className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto
                  </label>
                  <input
                    id="operation-concept"
                    type="text"
                    value={newOperationConcept}
                    onChange={(event) => setNewOperationConcept(event.target.value)}
                    placeholder="Ej: Supermercado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="operation-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Monto
                  </label>
                  <input
                    id="operation-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newOperationAmount}
                    onChange={(event) => setNewOperationAmount(event.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="operation-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="operation-type"
                    value={newOperationType}
                    onChange={(event) => setNewOperationType(event.target.value as OperationTypeInput)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {OPERATION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="operation-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay categorías disponibles.</p>
                  ) : (
                    <select
                      id="operation-category"
                      value={newOperationCategoryId}
                      onChange={(event) => setNewOperationCategoryId(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="operation-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre (opcional)
                  </label>
                  <input
                    id="operation-name"
                    type="text"
                    value={newOperationName}
                    onChange={(event) => setNewOperationName(event.target.value)}
                    placeholder="Comercio, servicio o persona"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOperationForm(false);
                      setOperationError(null);
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOperation || !canSubmitOperation}
                    className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {creatingOperation ? 'Registrando...' : 'Registrar operación'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {showAccountForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear cuenta</h2>
            <form onSubmit={handleCreateAccount}>
              {accountError && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <p className="text-sm text-red-700">{accountError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la cuenta
                  </label>
                  <input
                    id="account-name"
                    type="text"
                    value={newAccountName}
                    onChange={(event) => setNewAccountName(event.target.value)}
                    placeholder="Ej: Efectivo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="account-currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda
                  </label>
                  <select
                    id="account-currency"
                    value={newAccountCurrency}
                    onChange={(event) => setNewAccountCurrency(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountForm(false);
                      setAccountError(null);
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAccount || !newAccountName.trim()}
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {creatingAccount ? 'Creando...' : 'Crear cuenta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">
              Aún no tenés cuentas. Usá “Nueva cuenta” para crear tu primera cuenta y empezar a
              registrar operaciones.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-2">
                Cuenta
              </label>
              <select
                id="account-select"
                value={selectedAccountId ?? ''}
                onChange={(event) => setSelectedAccountId(Number(event.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <p className="text-sm text-gray-500">Balance total de ahorros</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {accountOperations.length === 0 ? (
                <div className="p-6">
                  <p className="text-gray-600">Sin operaciones para esta cuenta.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accountOperations.map((operation) => {
                      const isIncome = operation.type === 'Income';
                      return (
                        <tr key={operation.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(operation.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {operation.concept}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {operation.category?.name ?? '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {TYPE_LABELS[operation.type]}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                              isIncome ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(operation.amount, operation.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}