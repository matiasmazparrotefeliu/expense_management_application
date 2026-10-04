import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useOperations } from '@/hooks/useOperations';
import { useCategories } from '@/hooks/useCategories';
import { createAccountSchema, type CreateAccountFormData } from '@/features/auth/formSchemas';
import { Button } from '@/components/common/Button/Button';
import { AccountsPanel } from '@/components/dashboard/AccountsPanel';
import { OperationsTable } from '@/components/dashboard/OperationsTable';
import { AIExtractionForm } from '@/components/dashboard/AIExtractionForm';
import { SavingsBalance } from '@/components/dashboard/SavingsBalance';
import { Input } from '@/components/common/Input/Input';
import { Alert } from '@/components/common/Alert/Alert';
import { CURRENCIES } from '@/utils/constants';
import type { Account } from '@/types/auth';

export function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading, fetchAccounts, addAccount } = useAccounts();
  const { operations, loading: opsLoading, fetchOperations } = useOperations();
  const { loading: catsLoading } = useCategories();

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showOperationForm, setShowOperationForm] = useState(false);
  const [error] = useState<string | null>(null);

  const loading = accountsLoading || opsLoading || catsLoading;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  // Account form state
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { name: '', currency: CURRENCIES[0], balance: 0, bank: '' },
  });

  useEffect(() => {
    if (!accountsLoading && accounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, accountsLoading, selectedAccountId]);

  const handleSelectAccount = useCallback((id: number) => {
    setSelectedAccountId(id);
  }, []);

  const handleCreateAccount = useCallback(async (account: Account) => {
    setSelectedAccountId(account.id);
    await Promise.all([fetchAccounts(), fetchOperations()]);
  }, [fetchAccounts, fetchOperations]);

  const handleCreateOperation = useCallback(async () => {
    await Promise.all([fetchAccounts(), fetchOperations()]);
  }, [fetchAccounts, fetchOperations]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleToggleOperationForm = useCallback(() => {
    setShowOperationForm((prev) => !prev);
    setShowAccountForm(false);
  }, []);

  const handleToggleAccountForm = useCallback(() => {
    setShowAccountForm((prev) => !prev);
    setShowOperationForm(false);
  }, []);

  const onAccountSubmit = useCallback(
    async (data: CreateAccountFormData) => {
      setCreatingAccount(true);
      setAccountError(null);
      try {
        const created = await addAccount(data);
        reset();
        handleCreateAccount(created);
        setShowAccountForm(false);
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        setAccountError(
          status === 400 ? 'Ya existe una cuenta con ese nombre' : 'No se pudo crear la cuenta'
        );
      } finally {
        setCreatingAccount(false);
      }
    },
    [addAccount, handleCreateAccount, reset]
  );

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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Operaciones</h1>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="success"
              onClick={handleToggleOperationForm}
              disabled={accounts.length === 0}
              className="w-auto"
            >
              Nueva operación
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleToggleAccountForm}
              className="w-auto"
            >
              Nueva cuenta
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleLogout}
              className="w-auto"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>

        <AccountsPanel
          selectedAccountId={selectedAccountId}
          onSelectAccount={handleSelectAccount}
          accounts={accounts}
          loading={accountsLoading}
        />

        {showAccountForm && (
          <div className="bg-white rounded-lg shadow p-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear cuenta</h2>
            {accountError && <Alert message={accountError} />}
            <form onSubmit={handleSubmit(onAccountSubmit)} className="space-y-4">
              <div className="space-y-4">
                <Input
                  label="Nombre de la cuenta"
                  type="text"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="Ej: Efectivo"
                  autoComplete="off"
                />
                <div>
                  <label htmlFor="account-currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda
                  </label>
                  <select
                    id="account-currency"
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Balance inicial"
                  type="number"
                  {...register('balance')}
                  error={errors.balance?.message}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                />
                <Input
                  label="Entidad bancaria / plataforma"
                  type="text"
                  {...register('bank')}
                  error={errors.bank?.message}
                  placeholder="Ej: Banco Nación, Mercado Pago"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    reset();
                    setShowAccountForm(false);
                    setAccountError(null);
                  }}
                  className="w-auto"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingAccount || isSubmitting} className="w-auto">
                  {creatingAccount ? 'Creando...' : 'Crear cuenta'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showOperationForm && (
          <AIExtractionForm
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={handleSelectAccount}
            onCreateOperation={handleCreateOperation}
            onClose={handleToggleOperationForm}
            show={true}
          />
        )}

        {!showOperationForm && !showAccountForm && (
          <>
            {accounts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">
                  Aún no tenés cuentas. Usá "Nueva cuenta" para crear tu primera cuenta y empezar a
                  registrar operaciones.
                </p>
              </div>
            ) : (
              <>
                <SavingsBalance account={selectedAccount} />
                <OperationsTable
                  operations={operations}
                  selectedAccountId={selectedAccountId}
                />
              </>
            )}
          </>)}
      </div>
    </div>
  );
}