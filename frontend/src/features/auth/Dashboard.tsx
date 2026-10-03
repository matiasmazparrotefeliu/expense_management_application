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
  extractOperationFromText,
} from '@/api/operationsApi';
import type { Account } from '@/types/auth';
import type {
  Category,
  CreateOperationPayload,
  ExtractedOperation,
  Operation,
  OperationTypeInput,
} from '@/types/operation';

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

const OPERATION_TYPE_TO_CATEGORY: Record<OperationTypeInput, Category['type']> = {
  ingreso: 'Income',
  egreso: 'Expense',
  transferencia: 'Transfer',
};

const EXTRACTED_TYPE_TO_INPUT: Record<ExtractedOperation['type'], OperationTypeInput> = {
  income: 'ingreso',
  expense: 'egreso',
  transfer: 'transferencia',
};

const CURRENCIES = ['USD', 'ARS'];

function backendDetail(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail) return detail;
  }
  return null;
}

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

function AccountSelectField({
  id,
  accounts,
  value,
  onChange,
}: {
  id: string;
  accounts: Account[];
  value: number | null;
  onChange?: (accountId: number) => void;
}) {
  const disabled = !onChange || accounts.length < 2;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        Cuenta
      </label>
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
          disabled
            ? 'bg-gray-100'
            : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'
        }`}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} — {account.bank} ({account.currency})
          </option>
        ))}
      </select>
    </div>
  );
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
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountBank, setNewAccountBank] = useState('');
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

  const [operationMode, setOperationMode] = useState<'manual' | 'ai'>('manual');
  const [narrationText, setNarrationText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedOperation, setExtractedOperation] = useState<ExtractedOperation | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const [previewConcept, setPreviewConcept] = useState('');
  const [previewAmount, setPreviewAmount] = useState('');
  const [previewCurrency, setPreviewCurrency] = useState(CURRENCIES[0]);
  const [previewType, setPreviewType] = useState<OperationTypeInput>('egreso');
  const [previewCategoryId, setPreviewCategoryId] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [confirmingOperation, setConfirmingOperation] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [conceptModal, setConceptModal] = useState<string | null>(null);

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

  useEffect(() => {
    if (!conceptModal) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConceptModal(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [conceptModal]);

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

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === OPERATION_TYPE_TO_CATEGORY[newOperationType]
      ),
    [categories, newOperationType]
  );

  useEffect(() => {
    setNewOperationCategoryId((prev) => {
      const current = Number(prev);
      const stillValid = filteredCategories.some((category) => category.id === current);
      if (stillValid) return prev;
      return filteredCategories.length > 0 ? String(filteredCategories[0].id) : '';
    });
  }, [filteredCategories, newOperationType]);

  const previewFilteredCategories = useMemo(
    () =>
      categories.filter((category) => category.type === OPERATION_TYPE_TO_CATEGORY[previewType]),
    [categories, previewType]
  );

  useEffect(() => {
    setPreviewCategoryId((prev) => {
      const current = Number(prev);
      const stillValid = previewFilteredCategories.some((category) => category.id === current);
      if (stillValid) return prev;
      return previewFilteredCategories.length > 0 ? String(previewFilteredCategories[0].id) : '';
    });
  }, [previewFilteredCategories, previewType]);

  const previewAmountValue = parseAmount(previewAmount);
  const canConfirmOperation =
    !!selectedAccountId &&
    !!previewConcept.trim() &&
    previewAmountValue > 0 &&
    !!previewCategoryId;

  const operationAmount = parseAmount(newOperationAmount);
  const canSubmitOperation =
    !!selectedAccountId &&
    !!newOperationConcept.trim() &&
    operationAmount > 0 &&
    !!newOperationCategoryId;

  const accountBalance = parseAmount(newAccountBalance);
  const canSubmitAccount = !!newAccountName.trim() && accountBalance > 0 && !!newAccountBank.trim();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingAccount(true);
    setAccountError(null);
    try {
      const created = await createAccount({
        name: newAccountName.trim(),
        currency: newAccountCurrency,
        balance: accountBalance,
        bank: newAccountBank.trim(),
      });
      setAccounts((prev) => [...prev, created]);
      setSelectedAccountId(created.id);
      setNewAccountName('');
      setNewAccountBalance('');
      setNewAccountBank('');
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

  const handleToggleOperationForm = () => {
    setShowOperationForm((prev) => !prev);
    setShowAccountForm(false);
    setOperationError(null);
    setExtractError(null);
    setAiSuccess(null);
    setConfirmError(null);
  };

  const handleChangeOperationMode = (mode: 'manual' | 'ai') => {
    setOperationMode(mode);
    setOperationError(null);
    setExtractError(null);
    setAiSuccess(null);
    setConfirmError(null);
  };

  const handleExtractOperation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId) return;
    setExtracting(true);
    setExtractError(null);
    setAiSuccess(null);
    try {
      const extracted = await extractOperationFromText(narrationText.trim(), selectedAccountId);
      setExtractedOperation(extracted);
      setPreviewConcept(extracted.concept);
      setPreviewAmount(String(extracted.amount));
      setPreviewCurrency(extracted.currency ?? selectedAccount?.currency ?? CURRENCIES[0]);
      setPreviewType(EXTRACTED_TYPE_TO_INPUT[extracted.type]);
      setPreviewCategoryId(String(extracted.category_id));
      setPreviewName(extracted.name ?? '');
      setConfirmError(null);
    } catch (err) {
      setExtractError(backendDetail(err) ?? 'No se pudieron extraer los datos de la operación');
    } finally {
      setExtracting(false);
    }
  };

  const handleResetNarration = () => {
    setExtractedOperation(null);
    setExtractError(null);
    setConfirmError(null);
    setAiSuccess(null);
  };

  const handleCreateOperationFromAi = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId || !extractedOperation) return;
    setConfirmingOperation(true);
    setConfirmError(null);
    const payload: CreateOperationPayload = {
      concept: previewConcept.trim(),
      amount: parseAmount(previewAmount),
      type: previewType,
      account_id: selectedAccountId,
      category_id: Number(previewCategoryId),
      currency: previewCurrency,
      ...(previewName.trim() ? { name: previewName.trim() } : {}),
    };
    try {
      await createOperation(payload);
      const [accts, ops] = await Promise.all([getAccounts(), getOperations()]);
      setAccounts(accts);
      setOperations(ops);
      setSelectedAccountId(payload.account_id);
      setExtractedOperation(null);
      setNarrationText('');
      setAiSuccess('Operación registrada correctamente');
    } catch (err) {
      setConfirmError(backendDetail(err) ?? 'No se pudo registrar la operación');
    } finally {
      setConfirmingOperation(false);
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
              onClick={handleToggleOperationForm}
              disabled={accounts.length === 0}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Nueva operación
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAccountForm((prev) => !prev);
                setShowOperationForm(false);
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva operación</h2>
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleChangeOperationMode('ai')}
                className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none ${
                  operationMode === 'ai'
                    ? 'text-white bg-teal-600'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Mensaje con IA
              </button>
              <button
                type="button"
                onClick={() => handleChangeOperationMode('manual')}
                className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none ${
                  operationMode === 'manual'
                    ? 'text-white bg-teal-600'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Formulario manual
              </button>
            </div>
            {operationMode === 'ai' ? (
              <div className="space-y-4">
                {aiSuccess && (
                  <div className="rounded-md bg-green-50 p-4">
                    <p className="text-sm text-green-700">{aiSuccess}</p>
                  </div>
                )}
                {!extractedOperation ? (
                  <form onSubmit={handleExtractOperation}>
                    {extractError && (
                      <div className="rounded-md bg-red-50 p-4 mb-4">
                        <p className="text-sm text-red-700">{extractError}</p>
                      </div>
                    )}
                      <div className="space-y-4">
                        <AccountSelectField
                          id="ai-account"
                          accounts={accounts}
                          value={selectedAccountId}
                          onChange={setSelectedAccountId}
                        />
                        <div>
                          <label htmlFor="ai-narration" className="block text-sm font-medium text-gray-700 mb-1">
                            Mensaje de la operación
                          </label>
                        <textarea
                          id="ai-narration"
                          value={narrationText}
                          onChange={(event) => setNarrationText(event.target.value)}
                          rows={3}
                          placeholder="Por ejemplo: gasté 9800 pesos en Carrefour"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Describí la operación con tus palabras; la IA extrae los datos.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowOperationForm(false);
                          setOperationError(null);
                          setExtractError(null);
                          setAiSuccess(null);
                          setConfirmError(null);
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={extracting || !selectedAccountId || !narrationText.trim()}
                        className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        {extracting ? 'Extrayendo datos…' : 'Extraer datos'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCreateOperationFromAi}>
                    {confirmError && (
                      <div className="rounded-md bg-red-50 p-4 mb-4">
                        <p className="text-sm text-red-700">{confirmError}</p>
                      </div>
                    )}
                    <div className="space-y-4">
                      <AccountSelectField
                        id="ai-preview-account"
                        accounts={accounts}
                        value={selectedAccountId}
                        onChange={setSelectedAccountId}
                      />
                      <div>
                        <label htmlFor="ai-preview-concept" className="block text-sm font-medium text-gray-700 mb-1">
                          Concepto
                        </label>
                        <input
                          id="ai-preview-concept"
                          type="text"
                          value={previewConcept}
                          onChange={(event) => setPreviewConcept(event.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="ai-preview-amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Monto
                        </label>
                        <input
                          id="ai-preview-amount"
                          type="number"
                          step="0.01"
                          value={previewAmount}
                          onChange={(event) => setPreviewAmount(event.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="ai-preview-currency" className="block text-sm font-medium text-gray-700 mb-1">
                          Moneda
                        </label>
                        <select
                          id="ai-preview-currency"
                          value={previewCurrency}
                          onChange={(event) => setPreviewCurrency(event.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="ai-preview-type" className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          id="ai-preview-type"
                          value={previewType}
                          onChange={(event) => setPreviewType(event.target.value as OperationTypeInput)}
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
                        <label htmlFor="ai-preview-category" className="block text-sm font-medium text-gray-700 mb-1">
                          Categoría
                        </label>
                        {previewFilteredCategories.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No hay categorías para este tipo de operación.
                          </p>
                        ) : (
                          <select
                            id="ai-preview-category"
                            value={previewCategoryId}
                            onChange={(event) => setPreviewCategoryId(event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            {previewFilteredCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label htmlFor="ai-preview-name" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre (opcional)
                        </label>
                        <input
                          id="ai-preview-name"
                          type="text"
                          value={previewName}
                          onChange={(event) => setPreviewName(event.target.value)}
                          placeholder="Comercio, servicio o persona"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleResetNarration}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                      >
                        Nuevo relato
                      </button>
                      <button
                        type="submit"
                        disabled={confirmingOperation || !canConfirmOperation}
                        className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        {confirmingOperation ? 'Registrando...' : 'Registrar operación'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateOperation}>
              {operationError && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <p className="text-sm text-red-700">{operationError}</p>
                </div>
              )}
              <div className="space-y-4">
                <AccountSelectField
                  id="operation-account"
                  accounts={accounts}
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                />
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
                  {filteredCategories.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay categorías para este tipo de operación.
                    </p>
                  ) : (
                    <select
                      id="operation-category"
                      value={newOperationCategoryId}
                      onChange={(event) => setNewOperationCategoryId(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {filteredCategories.map((category) => (
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
            )}
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
                <div>
                  <label htmlFor="account-balance" className="block text-sm font-medium text-gray-700 mb-1">
                    Balance inicial
                  </label>
                  <input
                    id="account-balance"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(event) => setNewAccountBalance(event.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="account-bank" className="block text-sm font-medium text-gray-700 mb-1">
                    Entidad bancaria / plataforma
                  </label>
                  <input
                    id="account-bank"
                    type="text"
                    value={newAccountBank}
                    onChange={(event) => setNewAccountBank(event.target.value)}
                    placeholder="Ej: Banco Nación, Mercado Pago"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
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
                    disabled={creatingAccount || !canSubmitAccount}
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {creatingAccount ? 'Creando...' : 'Crear cuenta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {!showOperationForm && !showAccountForm &&
          (accounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">
                Aún no tenés cuentas. Usá “Nueva cuenta” para crear tu primera cuenta y empezar a
                registrar operaciones.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <AccountSelectField
                  id="account-select"
                  accounts={accounts}
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                />
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
                  <table className="w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Concepto
                        </th>
                        <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="w-24 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {accountOperations.map((operation) => {
                        const isIncome = operation.type === 'Income';
                        return (
                          <tr key={operation.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(operation.date)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <span
                                className="block truncate"
                                onMouseEnter={() => {
                                  if (operation.concept.length > 50) {
                                    setConceptModal(operation.concept);
                                  }
                                }}
                              >
                                {operation.concept}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {operation.name ?? '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {operation.category?.name ?? '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {TYPE_LABELS[operation.type]}
                            </td>
                            <td
                              className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
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
          ))}
        {conceptModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Concepto completo"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setConceptModal(null)}
          >
            <div
              className="relative max-w-lg rounded-lg bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setConceptModal(null)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                ✕
              </button>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Concepto
              </h3>
              <p className="text-sm text-gray-700">{conceptModal}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}