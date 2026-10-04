import { memo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import type { Account } from '@/types/auth';

interface SavingsBalanceProps {
  account: Account | null;
}

export const SavingsBalance = memo(function SavingsBalance({ account }: SavingsBalanceProps) {
  if (!account) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <p className="text-sm text-gray-500">Balance total de ahorros</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {formatCurrency(account.balance, account.currency)}
      </p>
    </div>
  );
});