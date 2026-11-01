import { useState } from 'react';
import type { BudgetLimitSnapshot } from '@/types/budget';
import { formatNumber, parseAmount } from '@/utils/formatters';
import { backendDetail } from '@/utils/apiErrors';
import { Button } from '@/components/common/Button/Button';
import { BudgetProgressBar } from './BudgetProgressBar';

interface GlobalLimitCardProps {
  limit: BudgetLimitSnapshot | null;
  onSaveLimit: (amount: number) => Promise<void>;
  onRemoveLimit: () => Promise<void>;
}

/** Global spending cap (global limit card): a single input that upserts the
 * monthly cap against the total consumption of the period, or edit/remove it
 * when one is already configured. */
export function GlobalLimitCard({ limit, onSaveLimit, onRemoveLimit }: GlobalLimitCardProps) {
  const [amountInput, setAmountInput] = useState(limit ? String(limit.amount) : '');
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
      await onSaveLimit(amount);
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
      await onRemoveLimit();
      setAmountInput('');
    } catch (err) {
      setError(backendDetail(err, 'No se pudieron guardar los cambios'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Límite global de gasto</h2>
        {limit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={submitting}
            className="w-auto"
          >
            Quitar límite
          </Button>
        )}
      </div>

      {limit ? (
        <>
          <p className="text-sm text-gray-600 mb-2">
            {formatNumber(limit.used)} gastados de {formatNumber(limit.amount)} configurados
          </p>
          <BudgetProgressBar percentage={limit.percentage} label="del límite global" />
        </>
      ) : (
        <p className="text-sm text-gray-500 mb-3">
          Configurá un tope para los gastos totales del mes (opcional).
        </p>
      )}

      {/* Input + action in one row: plain button (not the shared `Button`,
          whose `w-full` base overrides the `w-auto` override and stretches the
          button until it squashes the input). The input grows but is capped so
          it never swallows the whole width on desktop. */}
      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="global-limit-amount" className="sr-only">Monto del límite</label>
        <input
          id="global-limit-amount"
          type="number"
          min="0"
          step="0.01"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder={limit ? String(limit.amount) : 'Monto del límite global'}
          className="min-w-0 flex-1 max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Guardando…' : 'Guardar límite'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
