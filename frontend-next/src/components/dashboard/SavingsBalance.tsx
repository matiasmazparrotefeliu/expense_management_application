import { memo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import type { Account } from '@/types/auth';

interface SavingsBalanceProps {
  account: Account | null;
}

/** Balance block of the selected account. It renders without its own card:
 * `AccountsPanel` embeds it inside the account-selector card, so the
 * selection and its balance always live in the same visual block. */
export const SavingsBalance = memo(function SavingsBalance({ account }: SavingsBalanceProps) {
  if (!account) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-500">Balance total de ahorros</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">
        {formatCurrency(account.balance, account.currency)}
      </p>
    </div>
  );
});
