import { memo, useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Operation } from '@/types/operation';
import { TYPE_LABELS, ROUTES } from '@/utils/constants';
import { useData } from '@/features/data/DataProvider';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types/operation';

interface OperationsTableProps {
  operations: Operation[];
  selectedAccountId: number | null;
}

/** Client-side quick filter chips shown above the operations list. Selecting a
 * type also resets the category filter (a category only exists under one
 * type). */
const TYPE_FILTERS = [
  { key: 'all', label: 'Toda' },
  { key: 'Expense', label: 'Egresos' },
  { key: 'Income', label: 'Ingresos' },
  { key: 'Transfer', label: 'Transferencias' },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]['key'];

type CategoryFilter = number | 'all';

/** Mobile-only label for a stacked table cell (the column headers are hidden
 * below `sm`, so every cell names itself before its value). */
const CellLabel = memo(function CellLabel({ text }: { text: string }) {
  return (
    <span className="text-xs uppercase tracking-wide text-gray-400 whitespace-nowrap sm:hidden">
      {text}
    </span>
  );
});

export const OperationsTable = memo(function OperationsTable({
  operations,
  selectedAccountId,
}: OperationsTableProps) {
  const { removeOperation, categories } = useData();
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
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

  // Shared cell rule: stacked (flex) row on mobile, plain table cell from `sm`
  // up — one DOM so the filters and data never render twice.
  const cellClass =
    'flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:table-cell sm:px-4 sm:py-5';

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
        <div className="ml-auto">
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
                return (
                  <tr
                    key={operation.id}
                    className="flex flex-col gap-2 sm:table-row sm:gap-0 hover:bg-gray-50"
                  >
                    <td className={`${cellClass} whitespace-nowrap text-gray-500`}>
                      <CellLabel text="Fecha" />
                      <span>{formatDate(operation.date)}</span>
                    </td>
                    <td className={`${cellClass} min-w-0 text-gray-900 sm:truncate`}>
                      <CellLabel text="Concepto" />
                      <span className="truncate sm:max-w-none min-w-0">{operation.concept}</span>
                    </td>
                    <td className={`${cellClass} whitespace-nowrap text-gray-500`}>
                      <CellLabel text="Nombre" />
                      <span>{operation.name ?? '-'}</span>
                    </td>
                    <td className={`${cellClass} whitespace-nowrap text-gray-500`}>
                      <CellLabel text="Categoría" />
                      <span>{operation.category?.name ?? '-'}</span>
                    </td>
                    <td className={`${cellClass} whitespace-nowrap text-gray-500`}>
                      <CellLabel text="Tipo" />
                      <span>{TYPE_LABELS[operation.type]}</span>
                    </td>
                    <td
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium sm:table-cell sm:px-4 sm:py-5 sm:text-right ${
                        isIncome ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      <CellLabel text="Monto" />
                      <span className="whitespace-nowrap">
                        {isIncome ? '+' : '-'}
                        {formatCurrency(operation.amount, operation.currency)}
                      </span>
                    </td>
                    <td className={`${cellClass} text-gray-500`}>
                      <CellLabel text="Acciones" />
                      <span>
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
                      </span>
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
