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

function isOverLimit(category: CategoryExpenseItem): boolean {
  return !!category.limit && category.limit.percentage >= 100;
}

/** Mobile-only label for a stacked card cell (column headers are hidden below
 * `sm`, so every field names itself before its value). */
const CellLabel = memo(function CellLabel({ text }: { text: string }) {
  return (
    <span className="text-xs uppercase tracking-wide text-gray-400 whitespace-nowrap sm:hidden">
      {text}
    </span>
  );
});

interface CategoryLimitCellProps {
  category: CategoryExpenseItem;
  onSaveCategoryLimit: (categoryId: number, amount: number) => Promise<void>;
  onRemoveCategoryLimit: (categoryId: number) => Promise<void>;
}

/** Limit editor of one row: when the category has a configured cap it shows the
 * consumption progress bar, the "Sobre el límite" alert (at or past 100%) plus
 * a "Quitar" action; otherwise a full-width inline input to set one. Limits
 * are user-optional — categories without a cap only report their spend. */
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
      <div className="w-full sm:w-64">
        <BudgetProgressBar
          percentage={category.limit.percentage}
          label={`${formatNumber(category.limit.used)} / ${formatNumber(category.limit.amount)}`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {isOverLimit(category) ? (
            <span className="text-xs font-medium text-red-600">Sobre el límite</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={submitting}
            className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            Quitar límite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-64">
      <div className="flex gap-2">
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
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || amountInput.trim() === ''}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Asignar
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

/** Per-category monthly spend table (RF-04): category, total amount, operation
 * count, share of the month's spend and the optional cap with its own progress
 * bar (semáforo). Rows arrive ordered by amount desc from the backend.
 * Desktop (`sm+`) keeps the table; below `sm` each row stacks into a card —
 * one DOM, the columns transform instead of rendering two lists. */
export const CategoryBreakdown = memo(function CategoryBreakdown({
  categories,
  onSaveCategoryLimit,
  onRemoveCategoryLimit,
}: CategoryBreakdownProps) {
  const statCell =
    'flex items-center justify-between gap-3 sm:table-cell sm:px-6 sm:py-3';

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <div className="p-4 sm:p-6 pb-0">
        <h2 className="text-lg font-semibold text-gray-900">Gastos por categoría</h2>
        <p className="text-sm text-gray-500">
          Los límites son opcionales: solo las categorías con tope configurado muestran barra de consumo.
        </p>
      </div>
      <table className="w-full text-left text-sm mt-4">
        <thead className="hidden sm:table-header-group">
          <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
            <th className="px-6 py-3">Categoría</th>
            <th className="px-6 py-3">Gasto</th>
            <th className="px-6 py-3">Operaciones</th>
            <th className="px-6 py-3">% del gasto</th>
            <th className="px-6 py-3">Límite</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const overLimit = isOverLimit(category);
            return (
              <tr
                key={category.category_id}
                className={`flex flex-col gap-1.5 px-4 py-3 sm:table-row sm:px-0 sm:py-0 border-b border-gray-100 transition-colors ${
                  overLimit ? 'bg-red-50' : ''
                }`}
                data-testid="category-row"
              >
                <td className="sm:px-6 sm:py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {category.category_name}
                  </span>
                </td>
                <td className={statCell}>
                  <CellLabel text="Gasto" />
                  <span className="text-red-600">{formatNumber(category.amount)}</span>
                </td>
                <td className={statCell}>
                  <CellLabel text="Operaciones" />
                  <span>{category.count}</span>
                </td>
                <td className={statCell}>
                  <CellLabel text="% del gasto" />
                  <span>{category.percentage}%</span>
                </td>
                <td className="flex flex-col gap-1.5 sm:table-cell sm:px-6 sm:py-3">
                  <CellLabel text="Límite" />
                  <CategoryLimitCell
                    category={category}
                    onSaveCategoryLimit={onSaveCategoryLimit}
                    onRemoveCategoryLimit={onRemoveCategoryLimit}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
