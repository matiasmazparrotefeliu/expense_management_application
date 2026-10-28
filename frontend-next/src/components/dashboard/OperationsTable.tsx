import { memo } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Operation } from '@/types/operation';
import { TYPE_LABELS, ROUTES } from '@/utils/constants';
import { useData } from '@/features/data/DataProvider';
import { useRouter } from 'next/navigation';

interface OperationsTableProps {
  operations: Operation[];
  selectedAccountId: number | null;
}

export const OperationsTable = memo(function OperationsTable({
  operations,
  selectedAccountId,
}: OperationsTableProps) {
  const { removeOperation } = useData();
  const router = useRouter();

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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full table-auto divide-y divide-gray-200">
        <thead className="bg-gray-50">
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
          {accountOperations.map((operation) => {
            const isIncome = operation.type === 'Income';
            return (
              <tr key={operation.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(operation.date)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 truncate">
                  {operation.concept}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {operation.name ?? '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {operation.category?.name ?? '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {TYPE_LABELS[operation.type]}
                </td>
                <td
                  className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    isIncome ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(operation.amount, operation.currency)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
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
          })}
        </tbody>
      </table>
    </div>
  );
});
