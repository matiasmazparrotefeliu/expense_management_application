import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAccountSchema, type CreateAccountFormData } from '@/features/auth/formSchemas';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Alert } from '@/components/common/Alert/Alert';
import { CURRENCIES } from '@/utils/constants';
import type { Account, CreateAccountPayload } from '@/types/auth';

interface NewAccountFormProps {
  /** Context mutation; refreshes the lists internally. */
  onAddAccount: (data: CreateAccountPayload) => Promise<Account>;
  /** Called after the account is created; the page navigates to the dashboard. */
  onConfirm: () => void;
  /** Called on cancel; the page navigates back to the dashboard. */
  onCancel: () => void;
}

export function NewAccountForm({ onAddAccount, onConfirm, onCancel }: NewAccountFormProps) {
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

  const onAccountSubmit = useCallback(
    async (data: CreateAccountFormData) => {
      setCreatingAccount(true);
      setAccountError(null);
      try {
        await onAddAccount(data);
        reset();
        onConfirm();
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        setAccountError(
          status === 400 ? 'Ya existe una cuenta con ese nombre' : 'No se pudo crear la cuenta'
        );
      } finally {
        setCreatingAccount(false);
      }
    },
    [onAddAccount, onConfirm, reset]
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Crear cuenta</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="w-auto"
        >
          Cancelar
        </Button>
      </div>
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
            onClick={onCancel}
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
  );
}
