'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OperationForm } from '@/components/dashboard/OperationForm';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { useData } from '@/features/data/DataProvider';
import { formatCurrency } from '@/utils/formatters';
import { ROUTES } from '@/utils/constants';
import { getOperationById } from '@/api/operationsApi';
import type { Operation } from '@/types/operation';

/**
 * "Editar operación" client component. Reads the target operation from
 * `?id=<operation id>` (plus `?account=<id>`, same preselection contract as the
 * new-operation form), loads its current values via `GET /operations/{id}` and
 * hand them to `OperationForm` as `initialData` so every field starts prefilled.
 * The same form submits through `editOperation` (PUT) instead of `create`.
 */
export function EditOperationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accounts, categories, loading, error, selectedAccountId, selectAccount, editOperation } =
    useData();

  const operationId = searchParams.get('id');
  const requestedAccountId = searchParams.get('account');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [loadingOperation, setLoadingOperation] = useState(true);

  useEffect(() => {
    const asked = requestedAccountId ? Number(requestedAccountId) : null;
    if (asked === null) return;
    if (accounts.some((account) => account.id === asked) && asked !== selectedAccountId) {
      selectAccount(asked);
    }
  }, [accounts, requestedAccountId, selectAccount, selectedAccountId]);

  useEffect(() => {
    async function loadOperation() {
      if (!operationId) {
        setLoadingOperation(false);
        return;
      }
      try {
        const loaded = await getOperationById(Number(operationId));
        setOperation(loaded);
        selectAccount(loaded.account_id);
      } catch (err) {
        console.error('Error loading operation:', err);
      } finally {
        setLoadingOperation(false);
      }
    }
    loadOperation();
  }, [operationId, selectAccount]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const goBack = () => router.push(ROUTES.DASHBOARD);

  if (loading || loadingOperation) {
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

  if (!operation || !operationId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert message="No se pudo cargar la operación a editar" />
          <Button type="button" variant="secondary" onClick={goBack} className="w-full mt-4">
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar operación</h1>
            {selectedAccount && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedAccount.name} — {selectedAccount.bank} ({selectedAccount.currency}) ·
                saldo {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </p>
            )}
          </div>
        </div>

        <OperationForm
          accounts={accounts}
          categories={categories}
          selectedAccountId={selectedAccountId}
          onSelectAccount={selectAccount}
          onAddOperation={async (data) => {
            await editOperation(operation.id, data);
            goBack();
          }}
          initialData={operation}
          onConfirm={goBack}
          onCancel={goBack}
        />
      </div>
    </div>
  );
}
