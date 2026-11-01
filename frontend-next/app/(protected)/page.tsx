'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button/Button';
import { AccountsPanel } from '@/components/dashboard/AccountsPanel';
import { OperationsTable } from '@/components/dashboard/OperationsTable';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/features/data/DataProvider';
import { ROUTES } from '@/utils/constants';

/**
 * Operations panel. The "Nueva operación" and "Nueva cuenta" forms no longer
 * live here — they are separate pages (`/operations/new`, `/accounts/new`),
 * so this screen always shows the account selector, the balance and the
 * operations table (no focus mode).
 */
export default function DashboardPage() {
  const { logout } = useAuth();
  const { accounts, loading, operations, selectedAccountId, selectAccount } = useData();
  const router = useRouter();

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const handleLogout = async () => {
    await logout();
    router.push(ROUTES.LOGIN);
  };

  const newOperationHref =
    selectedAccountId !== null
      ? `${ROUTES.OPERATIONS_NEW}?account=${selectedAccountId}`
      : ROUTES.OPERATIONS_NEW;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Panel de Operaciones</h1>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="success"
              onClick={() => router.push(newOperationHref)}
              disabled={accounts.length === 0}
              className="w-auto"
            >
              Nueva operación
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push(ROUTES.ACCOUNTS_NEW)}
              className="w-auto"
            >
              Nueva cuenta
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(ROUTES.REPORTS_MONTHLY)}
              className="w-auto"
            >
              Resumen mensual
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-auto"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>

        <AccountsPanel
          selectedAccountId={selectedAccountId}
          onSelectAccount={selectAccount}
          accounts={accounts}
          loading={loading}
          selectedAccount={selectedAccount}
        />

        {accounts.length > 0 && (
          <OperationsTable
            operations={operations}
            selectedAccountId={selectedAccountId}
          />
        )}
      </div>
    </div>
  );
}
