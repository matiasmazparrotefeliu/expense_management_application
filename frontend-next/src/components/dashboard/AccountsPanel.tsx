import { memo } from 'react';
import type { Account } from '@/types/auth';
import { AccountSelectField } from './AccountSelectField';
import { SavingsBalance } from './SavingsBalance';

interface AccountsPanelProps {
  selectedAccountId: number | null;
  onSelectAccount: (id: number) => void;
  accounts: Account[];
  loading: boolean;
  /** Account whose balance is summarized inside the card; null hides the block. */
  selectedAccount: Account | null;
}

export const AccountsPanel = memo(function AccountsPanel({
  selectedAccountId,
  onSelectAccount,
  accounts,
  loading,
  selectedAccount,
}: AccountsPanelProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-4">Cargando cuentas...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Cuentas</h2>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">
            Aún no tenés cuentas. Usá &quot;Nueva cuenta&quot; en el encabezado para crear tu primera cuenta.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <AccountSelectField
            id="account-select"
            accounts={accounts}
            value={selectedAccountId}
            onChange={onSelectAccount}
          />
          <SavingsBalance account={selectedAccount} />
        </div>
      )}
    </div>
  );
});
