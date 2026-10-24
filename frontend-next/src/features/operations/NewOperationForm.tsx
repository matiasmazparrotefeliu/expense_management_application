'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AIExtractionForm } from '@/components/dashboard/AIExtractionForm';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { useData } from '@/features/data/DataProvider';
import { formatCurrency } from '@/utils/formatters';
import { ROUTES } from '@/utils/constants';

/**
 * "Nueva operación" page with the IA / manual tabs. Receives the preselected
 * account from the dashboard via `?account=<id>` (or falls back to the shared
 * selectedAccountId). After confirming, navigates back to the dashboard with
 * the accounts+operations already reloaded by the DataProvider.
 */
export default function NewOperationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accounts, categories, loading, error, selectedAccountId, selectAccount, addOperation } =
    useData();

  const requestedAccountId = searchParams.get('account');

  useEffect(() => {
    const asked = requestedAccountId ? Number(requestedAccountId) : null;
    if (asked === null) return;
    if (accounts.some((account) => account.id === asked) && asked !== selectedAccountId) {
      selectAccount(asked);
    }
  }, [accounts, requestedAccountId, selectAccount, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const goBack = () => router.push(ROUTES.DASHBOARD);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert message={error} />
        </div>
      </div>
    );
  }

  // Mirror of the old dashboard rule: without accounts there is no operation
  // form to show.
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">
              Aún no tenés cuentas. Creá tu primera cuenta para registrar operaciones.
            </p>
            <Button type="button" variant="secondary" onClick={goBack} className="w-auto mt-4">
              Volver al panel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva operación</h1>
            {selectedAccount && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedAccount.name} — {selectedAccount.bank} ({selectedAccount.currency}) ·
                saldo {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </p>
            )}
          </div>
        </div>

        <AIExtractionForm
          accounts={accounts}
          categories={categories}
          selectedAccountId={selectedAccountId}
          onSelectAccount={selectAccount}
          onAddOperation={addOperation}
          onConfirm={goBack}
          onCancel={goBack}
        />
      </div>
    </div>
  );
}
