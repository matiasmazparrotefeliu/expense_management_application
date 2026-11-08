import { memo, useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Category, Operation } from '@/types/operation';
import { TYPE_LABELS, ROUTES } from '@/utils/constants';
import { useData } from '@/features/data/DataProvider';
import { useRouter } from 'next/navigation';

interface OperationsTableProps {
  operations: Operation[];
  selectedAccountId: number | null;
}

/** Client-side quick filter chips shown above the operations list. Selecting a
 * type also resets the category filter (a category only exists under one
 * type). */
const TYPE_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'Expense', label: 'Egresos' },
  { key: 'Income', label: 'Ingresos' },
  { key: 'Transfer', label: 'Transferencias' },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]['key'];

type CategoryFilter = number | 'all';

/** Soft tinted badge for the category pill, queued by operation type so the rubro
 * and its sign can be identified at a glance. */
const BADGE_TONES: Record<string, string> = {
  Income: 'border-green-200 bg-green-50 text-green-700',
  Expense: 'border-gray-200 bg-gray-100 text-gray-600',
  Transfer: 'border-blue-200 bg-blue-50 text-blue-700',
};

export const OperationsTable = memo(function OperationsTable({
  operations,
  selectedAccountId,
}: OperationsTableProps) {
  const { removeOperation, categories } = useData();
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  /** Id of the operation whose inline action panel (⋮) is expanded on mobile. */
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const router = useRouter();

  // Switching accounts invalidates the picked category: start from the full
  // list so the new account's operations are visible right away.
  useEffect(() => {
    setCategoryFilter('all');
  }, [selectedAccountId]);

  /** Active catalog categories matching the selected type chip; the picker is
   * catalog-driven (never derived from the rows, so texts never collide). */
  const categoryOptions = useMemo(() => {
    const relevant = categories.filter(
      (category: Category) =>
        category.is_active && (filter === 'all' || category.type === filter)
    );
    return [...relevant].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, filter]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta operación?')) {
      try {
        await removeOperation(id);
      } catch {
        alert('Hubo un error al eliminar la operación');
      }
    }
  };

  const handleEdit = (operation: Operation) => {
    router.push(`${ROUTES.OPERATIONS_EDIT}?id=${operation.id}&account=${operation.account_id}`);
  };

  const toggleMenu = (id: number) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const accountOperations = operations
    .filter((operation) => operation.account_id === selectedAccountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (accountOperations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">Sin operaciones para esta cuenta.</p>
      </div>
    );
  }

  const filteredOperations = accountOperations
    .filter((operation) => filter === 'all' || operation.type === filter)
    .filter(
      (operation) => categoryFilter === 'all' || operation.category_id === categoryFilter
    );

  const handleTypeFilterChange = (next: TypeFilter) => {
    setFilter(next);
    setCategoryFilter('all');
  };

  const handleCategoryFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCategoryFilter(value === 'all' ? 'all' : Number(value));
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3 sm:p-4">
        {TYPE_FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => handleTypeFilterChange(option.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === option.key
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {option.label}
          </button>
        ))}
        {/* Category picker flows right after the type chips (no ml-auto: with
            a wrapped chip row the pushed-right select looked detached). */}
        <label htmlFor="operations-category-filter" className="sr-only">
          Filtrar por categoría
        </label>
        <select
          id="operations-category-filter"
          value={categoryFilter}
          onChange={handleCategoryFilterChange}
          className="max-w-[12rem] rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto divide-y divide-gray-200">
          <thead className="hidden sm:table-header-group bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                Fecha
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Concepto
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Categoría
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Monto
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOperations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-600">
                  No hay operaciones de este tipo y categoría.
                </td>
              </tr>
            ) : (
              filteredOperations.map((operation) => {
                const isIncome = operation.type === 'Income';
                const isMenuOpen = openMenuId === operation.id;
                const badgeTone = BADGE_TONES[operation.type] ?? BADGE_TONES.Expense;
                return (
                  /* One DOM, two layouts: on `sm+` a classic table row; below
                     `sm` a 2-column grid (title/date + category/amount) that
                     reads as a transaction card — no repeated labels. */
                  <tr
                    key={operation.id}
                    className="grid grid-cols-[1fr_auto] gap-y-1 gap-x-3 px-4 py-3 sm:table-row sm:gap-0 sm:px-0 sm:py-0 hover:bg-gray-50"
                  >
                    {/* Mobile top-right / desktop first column: date (soft and
                        small on mobile) + the ⋮ trigger for the action panel. */}
                    <td className="col-start-2 row-start-1 flex items-center justify-end gap-2 text-xs text-gray-400 sm:table-cell sm:px-4 sm:py-5 sm:text-sm sm:text-gray-500 sm:whitespace-nowrap">
                      {formatDate(operation.date)}
                      <button
                        type="button"
                        onClick={() => toggleMenu(operation.id)}
                        aria-label={`Acciones de ${operation.concept}`}
                        aria-expanded={isMenuOpen}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors sm:hidden"
                        title="Acciones"
                      >
                        ⋮
                      </button>
                    </td>

                    {/* Mobile title / desktop second column: concept breathing
                        the full width, with the action panel mounted under it
                        when expanded. */}
                    <td className="col-start-1 row-start-1 min-w-0 sm:table-cell sm:px-4 sm:py-5 sm:truncate sm:text-sm text-gray-900">
                      <span className="text-[15px] leading-snug font-semibold sm:font-normal sm:leading-5">
                        {operation.concept}
                      </span>
                      {isMenuOpen && (
                        <>
                          {/* Full-screen invisible catcher: any tap outside the
                              card closes the panel. */}
                          <button
                            type="button"
                            aria-label="Cerrar acciones"
                            tabIndex={-1}
                            onClick={() => setOpenMenuId(null)}
                            className="fixed inset-0 z-10 cursor-default focus:outline-none"
                          />
                          <div className="relative z-20 mt-2 flex justify-end gap-2 sm:hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleEdit(operation);
                              }}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDelete(operation.id);
                              }}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </td>

                    {/* Mobile secondary line / desktop third column: the
                        associated name (merchant/person), growing the full card
                        width; visually hidden when absent. */}
                    <td className="col-span-2 col-start-1 row-start-2 text-xs text-gray-500 sm:table-cell sm:col-span-auto sm:row-start-auto sm:px-4 sm:py-5 sm:text-sm sm:whitespace-nowrap">
                      <span className={operation.name ? '' : 'hidden sm:inline'}>
                        {operation.name ?? '-'}
                      </span>
                    </td>

                    {/* Bottom line: category badge (rubro) + highlighted amount.
                        Mobile drops the literal type (the sign + badge tone
                        carry it); the cell stays for the desktop table. */}
                    <td className="col-start-1 row-start-3 sm:table-cell sm:px-4 sm:py-5 sm:text-sm sm:text-gray-500">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeTone}`}
                      >
                        {operation.category?.name ?? '-'}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell sm:px-4 sm:py-5 text-sm text-gray-500">
                      {TYPE_LABELS[operation.type]}
                    </td>
                    <td
                      className={`col-start-2 row-start-3 justify-self-end whitespace-nowrap text-right text-sm font-semibold sm:table-cell sm:justify-self-auto sm:px-4 sm:py-5 sm:font-medium ${
                        isIncome ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(operation.amount, operation.currency)}
                    </td>

                    {/* Desktop-only fixed action row (the ⋮ panel replaces it
                        on mobile). */}
                    <td className="hidden sm:table-cell sm:px-4 sm:py-5 text-right text-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(operation)}
                        className="text-blue-600 hover:text-blue-900 transition-colors mr-3"
                        title="Editar operación"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(operation.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Eliminar operación"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
