import { memo, useCallback } from 'react';
import type { Account } from '@/types/auth';

interface AccountSelectFieldProps {
  id: string;
  accounts: Account[];
  value: number | null;
  onChange?: (accountId: number) => void;
  disabled?: boolean;
}

export const AccountSelectField = memo(function AccountSelectField({
  id,
  accounts,
  value,
  onChange,
  disabled = false,
}: AccountSelectFieldProps) {
  const isDisabled = disabled || !onChange;
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(Number(event.target.value));
    },
    [onChange]
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        Cuenta
      </label>
      <select
        id={id}
        value={value ?? ''}
        disabled={isDisabled}
        onChange={handleChange}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
          isDisabled
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
});