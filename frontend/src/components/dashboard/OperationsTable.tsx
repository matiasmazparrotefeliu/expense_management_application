import { memo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import type { Operation } from '@/types/operation';
import { TYPE_LABELS } from '@/utils/constants';

interface OperationsTableProps {
  operations: Operation[];
  selectedAccountId: number | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

export const OperationsTable = memo(function OperationsTable({
  operations,
  selectedAccountId,
}: OperationsTableProps) {
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});