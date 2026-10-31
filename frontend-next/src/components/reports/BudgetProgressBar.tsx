import { consumptionLevel, formatPercentage } from '@/utils/formatters';

interface BudgetProgressBarProps {
  /** Spend-to-cap percentage (0..100+, may exceed 100 when over the limit). */
  percentage: number | null;
  /** Optional caption shown next to the percentage (e.g. "consumo del sueldo"). */
  label?: string;
}

const levelStyles = {
  neutral: 'bg-gray-300',
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
} as const;

const levelLabels = {
  neutral: 'Sin ingresos',
  ok: 'Saludable',
  warning: 'En alerta',
  danger: 'Límite superado',
} as const;

/** Colored progress bar for spend-vs-budget consumption (semáforo:
 * 🟢 < 75%, 🟡 75-99%, 🔴 >= 100%). A null percentage renders the neutral
 * state (there is no budget/limit configured to compare against). */
export function BudgetProgressBar({ percentage, label }: BudgetProgressBarProps) {
  const level = consumptionLevel(percentage);
  const clamped = percentage === null ? 0 : Math.min(percentage, 100);

  return (
    <div>
      <div
        className="h-3 w-full rounded-full bg-gray-200 overflow-hidden"
        role="progressbar"
        aria-label={label ?? 'Consumo'}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-500 ${levelStyles[level]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-gray-500">{levelLabels[level]}</span>
        <span data-testid="progress-percentage" className="font-medium text-gray-700">
          {formatPercentage(percentage)}{label ? ` — ${label}` : ''}
        </span>
      </div>
    </div>
  );
}
