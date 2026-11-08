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
 * One DOM, two layouts: on `sm+` the classic table; below `sm` each `<tr>` is a
 * transaction card (2-column grid — category + % on the top line, amount +
 * operation count on the second — with the limit editor growing the full width)
 * mirroring the OperationsTable cards; no repeated labels, the grid placement
 * classes fix the visual order and the `<td>` order matches the `<thead>`. */
export const CategoryBreakdown = memo(function CategoryBreakdown({
  categories,
  onSaveCategoryLimit,
  onRemoveCategoryLimit,
}: CategoryBreakdownProps) {
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
                className={`grid grid-cols-[1fr_auto] gap-y-1 gap-x-3 px-4 py-3 sm:table-row sm:gap-0 sm:px-0 sm:py-0 border-b border-gray-100 transition-colors ${
                  overLimit ? 'bg-red-50' : ''
                }`}
                data-testid="category-row"
              >
                {/* Top line: category (title, breathing the width) + its share
                    of the month's spend on the right. The `<td>` DOM order
                    matches the `<thead>` (Categoría, Gasto, Operaciones,
                    % del gasto, Límite); the grid classes fix the mobile cards. */}
                <td className="col-start-1 row-start-1 min-w-0 sm:table-cell sm:px-6 sm:py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {category.category_name}
                  </span>
                </td>

                {/* Second line: highlighted spend + operation count. The "ops"
                    suffix is mobile-only; the desktop column shows the plain
                    number under its header. */}
                <td className="col-start-1 row-start-2 whitespace-nowrap text-sm font-semibold text-red-600 sm:table-cell sm:px-6 sm:py-3 sm:font-normal">
                  {formatNumber(category.amount)}
                </td>
                <td className="col-start-2 row-start-2 justify-self-end whitespace-nowrap text-xs text-gray-500 sm:table-cell sm:justify-self-auto sm:text-sm sm:px-6 sm:py-3">
                  {category.count}
                  <span className="sm:hidden"> ops</span>
                </td>

                {/* Top-right of the card: share of the spend (small gray). */}
                <td className="col-start-2 row-start-1 justify-self-end text-sm text-gray-500 sm:table-cell sm:justify-self-auto sm:px-6 sm:py-3">
                  {category.percentage}%
                </td>

                {/* Limit editor grows the full card width below `sm`. */}
                <td className="col-span-2 col-start-1 row-start-3 sm:table-cell sm:col-span-auto sm:row-start-auto sm:px-6 sm:py-3">
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
