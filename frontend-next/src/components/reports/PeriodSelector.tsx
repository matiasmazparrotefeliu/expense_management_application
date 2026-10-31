import { memo } from 'react';
import type { ActivePeriod } from '@/types/operation';
import { MONTH_NAMES } from './period';

interface PeriodSelectorProps {
  period: { year: number; month: number };
  /** Fiscal months with at least one operation, newest first (`active-periods`). */
  periods: ActivePeriod[];
  onPeriodChange: (year: number, month: number) => void;
}

/** Mes/Año dropdowns driving the fiscal period every analytics tile is
 * calculated for. The options are data-driven: only months that actually have
 * operations are selectable (an empty option set falls back to the current
 * selection so the selectors never go blank while loading). */
export const PeriodSelector = memo(function PeriodSelector({
  period,
  periods,
  onPeriodChange,
}: PeriodSelectorProps) {
  const yearsDesc = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const activeMonthsDesc = periods
    .filter((p) => p.year === period.year)
    .map((p) => p.month)
    .sort((a, b) => b - a);

  const yearOptions = yearsDesc.length > 0 ? yearsDesc : [period.year];
  const monthOptions =
    activeMonthsDesc.length > 0 ? activeMonthsDesc : [period.month];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Periodo</h2>
      <div>
        <label htmlFor="period-month" className="sr-only">Mes</label>
        <select
          id="period-month"
          value={period.month}
          onChange={(e) => onPeriodChange(period.year, Number(e.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>{MONTH_NAMES[month - 1]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="period-year" className="sr-only">Año</label>
        <select
          id="period-year"
          value={period.year}
          onChange={(e) => onPeriodChange(Number(e.target.value), period.month)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <p className="ml-auto text-sm text-gray-500">Solo meses con operaciones registradas</p>
    </div>
  );
});
