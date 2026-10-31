import { memo } from 'react';
import type { MonthlySummary } from '@/types/budget';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { BudgetProgressBar } from './BudgetProgressBar';

interface SummaryCardsProps {
  summary: MonthlySummary;
}

/** KPI panel (RF-02): salary income, total consumption (expense + transfer),
 * the star figure — the net remainder of the salary — and the salary
 * consumption health bar. Non-salary income (banks interests, etc.) is shown
 * informational only: it does NOT grow the budget. Every amount is rendered in
 * the summary's currency: all aggregates belong to the selected account, which
 * snapshots its currency on every operation. */
export const SummaryCards = memo(function SummaryCards({ summary }: SummaryCardsProps) {
  const otherIncome = summary.total_income - summary.total_salary;
  const inDeficit = summary.net_available < 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-500">Ingresos del mes (sueldo)</p>
          <p data-testid="total-salary" className="mt-1 text-3xl font-bold text-green-600">
            {formatCurrency(summary.total_salary, summary.currency)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Otros ingresos (no suman al sueldo): {formatCurrency(otherIncome, summary.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Gastos del mes</p>
          <p data-testid="total-expenses" className="mt-1 text-3xl font-bold text-red-600">
            {formatCurrency(summary.total_expenses, summary.currency)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Egresos + transferencias ({formatPercentage(summary.consumption_percentage)} del sueldo)
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Dinero disponible</p>
          <p
            data-testid="net-available"
            className={`mt-1 text-3xl font-bold ${inDeficit ? 'text-red-600' : 'text-gray-900'}`}
          >
            {formatCurrency(summary.net_available, summary.currency)}
          </p>
          {inDeficit ? (
            <p data-testid="deficit-warning" className="mt-1 text-xs font-medium text-red-600">
              Estás gastando más de lo que ingresas este mes.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">Sueldo − gastos del periodo</p>
          )}
        </div>
      </div>

      <BudgetProgressBar
        percentage={summary.consumption_percentage}
        label="consumo del sueldo"
      />
    </div>
  );
});
