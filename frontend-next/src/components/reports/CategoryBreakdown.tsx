import { memo, useState } from 'react';
import type { CategoryExpenseItem } from '@/types/budget';
import { formatNumber, parseAmount } from '@/utils/formatters';
import { backendDetail } from '@/utils/apiErrors';
import { BudgetProgressBar } from './BudgetProgressBar';

interface CategoryBreakdownProps {
  categories: CategoryExpenseItem[];
  onSaveCategoryLimit: (categoryId: number, amount: number) => Promise<void>;
  onRemoveCategoryLimit: (categoryId: number) => Promise<void>;
}

interface CategoryLimitCellProps {
  category: CategoryExpenseItem;
  onSaveCategoryLimit: (categoryId: number, amount: number) => Promise<void>;
  onRemoveCategoryLimit: (categoryId: number) => Promise<void>;
}

/** Limit editor of one row: when the category has a configured cap it shows the
 * consumption progress bar plus a "Quitar" action; otherwise an optional inline
 * input to set one. Limits are user-optional — categories without a cap only
 * report their spend. */
const CategoryLimitCell = memo(function CategoryLimitCell({
  category,
  onSaveCategoryLimit,
  onRemoveCategoryLimit,
}: CategoryLimitCellProps) {
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amount = parseAmount(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá un monto mayor a cero');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSaveCategoryLimit(category.category_id, amount);
      setAmountInput('');
    } catch (err) {
      setError(backendDetail(err, 'No se pudieron guardar los cambios'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onRemoveCategoryLimit(category.category_id);
      setAmountInput('');
    } catch (err) {
      setError(backendDetail(err, 'No se pudieron guardar los cambios'));
    } finally {
      setSubmitting(false);
    }
  };

  if (category.limit) {
    return (
      <div className="min-w-[220px]">
        <BudgetProgressBar
          percentage={category.limit.percentage}
          label={`${formatNumber(category.limit.used)} / ${formatNumber(category.limit.amount)}`}
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={submitting}
          className="mt-1 text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
        >
          Quitar límite
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1">
      <div>
        <label htmlFor={`category-limit-${category.category_id}`} className="sr-only">
          Límite de {category.category_name} (opcional)
        </label>
        <input
          id={`category-limit-${category.category_id}`}
          type="number"
          min="0"
          step="0.01"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="Límite (opcional)"
          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || amountInput.trim() === ''}
          className="ml-1 text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Asignar
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
});

/** Per-category monthly spend table (RF-04): category, total amount, operation
 * count, share of the month's spend and the optional cap with its own progress
 * bar (semáforo). Rows arrive ordered by amount desc from the backend. */
export const CategoryBreakdown = memo(function CategoryBreakdown({
  categories,
  onSaveCategoryLimit,
  onRemoveCategoryLimit,
}: CategoryBreakdownProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold text-gray-900">Gastos por categoría</h2>
        <p className="text-sm text-gray-500">
          Los límites son opcionales: solo las categorías con tope configurado muestran barra de consumo.
        </p>
      </div>
      <table className="w-full text-left text-sm mt-4">
        <thead>
          <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
            <th className="px-6 py-3">Categoría</th>
            <th className="px-6 py-3">Gasto</th>
            <th className="px-6 py-3">Operaciones</th>
            <th className="px-6 py-3">% del gasto</th>
            <th className="px-6 py-3">Límite</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.category_id} className="border-b border-gray-100" data-testid="category-row">
              <td className="px-6 py-3 font-medium text-gray-900">{category.category_name}</td>
              <td className="px-6 py-3 text-red-600">{formatNumber(category.amount)}</td>
              <td className="px-6 py-3">{category.count}</td>
              <td className="px-6 py-3">{category.percentage}%</td>
              <td className="px-6 py-3">
                <CategoryLimitCell
                  category={category}
                  onSaveCategoryLimit={onSaveCategoryLimit}
                  onRemoveCategoryLimit={onRemoveCategoryLimit}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
