import { memo, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOperationSchema, type CreateOperationFormData } from '@/features/auth/formSchemas';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { AccountSelectField } from './AccountSelectField';
import { OPERATION_TYPES, OperationTypeMapper } from '@/utils/constants';
import type {
  CreateOperationPayload,
  Operation,
  OperationTypeInput,
  Category,
} from '@/types/operation';
import type { Account } from '@/types/auth';

interface OperationFormProps {
  accounts: Account[];
  categories: Category[];
  selectedAccountId: number | null;
  onSelectAccount: (id: number) => void;
  onAddOperation: (data: CreateOperationPayload) => Promise<Operation>;
  onCreateOperation: () => void;
  onClose: () => void;
  show: boolean;
}

export const OperationForm = memo(function OperationForm({
  accounts,
  categories,
  selectedAccountId,
  onSelectAccount,
  onAddOperation,
  onCreateOperation,
  onClose,
  show,
}: OperationFormProps) {
  const [operationType, setOperationType] = useState<OperationTypeInput>('egreso');
  const [creatingOperation, setCreatingOperation] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const operationCategoryType = OperationTypeMapper.getCategoryType(OperationTypeMapper.fromInput(operationType));
  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category: Category) => category.type === operationCategoryType && category.is_active
      ),
    [categories, operationCategoryType]
  );

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<CreateOperationFormData>({
    resolver: zodResolver(createOperationSchema),
    defaultValues: {
      concept: '',
      amount: 0,
      type: 'egreso' as OperationTypeInput,
      account_id: selectedAccountId ?? 0,
      category_id: 0,
      name: '',
    },
  });

  useEffect(() => {
    if (selectedAccountId) {
      setValue('account_id', selectedAccountId, { shouldValidate: true });
    }
  }, [selectedAccountId, setValue]);

  useEffect(() => {
    const current = Number(watch('category_id'));
    const stillValid = filteredCategories.some((cat) => cat.id === current);
    if (!stillValid && filteredCategories.length > 0) {
      setValue('category_id', filteredCategories[0].id, { shouldValidate: true });
    }
  }, [filteredCategories, watch, setValue]);

  const typeRegister = register('type');

  const onSubmit = async (data: CreateOperationFormData) => {
    if (!selectedAccountId || !selectedAccount) return;
    setCreatingOperation(true);
    setOperationError(null);
    try {
      await onAddOperation({
        concept: data.concept.trim(),
        amount: data.amount,
        type: data.type as OperationTypeInput,
        account_id: selectedAccountId,
        category_id: data.category_id,
        currency: selectedAccount.currency,
        ...(data.name?.trim() ? { name: data.name.trim() } : {}),
      });
      reset({ concept: '', amount: 0, name: '' });
      onCreateOperation();
      onClose();
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setOperationError(
        status === 400 ? 'Saldo insuficiente o datos inválidos' : 'No se pudo crear la operación'
      );
    } finally {
      setCreatingOperation(false);
    }
  };

  if (!show) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Nueva operación</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-auto"
        >
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {operationError && <Alert message={operationError} />}

        <AccountSelectField
          id="operation-account"
          accounts={accounts}
          value={selectedAccountId}
          onChange={onSelectAccount}
        />

        <Input
          label="Concepto"
          type="text"
          {...register('concept')}
          error={errors.concept?.message}
          placeholder="Ej: Supermercado"
          autoComplete="off"
        />

        <Input
          label="Monto"
          type="number"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="0.00"
          step="0.01"
          min="0.01"
        />

        <div>
          <label htmlFor="operation-type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="operation-type"
            {...typeRegister}
            onChange={(e) => {
              typeRegister.onChange(e);
              setOperationType(e.target.value as OperationTypeInput);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {OPERATION_TYPES.map((option: { value: string; label: string }) => (
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
            <p className="text-sm text-gray-500">No hay categorías para este tipo de operación.</p>
          ) : (
            <>
              <select
                id="operation-category"
                {...register('category_id', { valueAsNumber: true })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.category_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {filteredCategories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.category_id.message}
                </p>
              )}
            </>
          )}
        </div>

        <Input
          label="Nombre (opcional)"
          type="text"
          {...register('name')}
          placeholder="Comercio, servicio o persona"
          autoComplete="off"
        />

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={creatingOperation || isSubmitting || !selectedAccountId}
            className="w-auto"
          >
            {creatingOperation ? 'Registrando...' : 'Registrar operación'}
          </Button>
        </div>
      </form>
    </div>
  );
});