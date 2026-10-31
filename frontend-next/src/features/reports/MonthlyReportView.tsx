'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMonthlySummary, saveBudgetLimit, deleteBudgetLimit } from '@/api/budgetApi';
import { getActivePeriods } from '@/api/operationsApi';
import type { MonthlySummary } from '@/types/budget';
import type { ActivePeriod } from '@/types/operation';
import { backendDetail } from '@/utils/apiErrors';
import { Button } from '@/components/common/Button/Button';
import { AccountSelectField } from '@/components/dashboard/AccountSelectField';
import { useData } from '@/features/data/DataProvider';
import { PeriodSelector } from '@/components/reports/PeriodSelector';
import { SummaryCards } from '@/components/reports/SummaryCards';
import { GlobalLimitCard } from '@/components/reports/GlobalLimitCard';
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown';
import { ROUTES } from '@/utils/constants';

/** Monthly salary vs expenses analytics (`/reports/monthly`, RF-01 a RF-04).
 * Everything is scoped to the selected account — the summary, the active
 * periods and the spending caps receive its `account_id`, which keeps every
 * total in a single currency (each operation snapshots its account's currency).
 * Owns the fiscal-period selection — driven by the account's actual operations
 * — and refetches the authoritative summary on every period/account change or
 * limit mutation. */
export default function MonthlyReportView() {
  const router = useRouter();
  const { accounts, loading: loadingData, selectedAccountId, selectAccount } = useData();

  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [periods, setPeriods] = useState<ActivePeriod[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (
    selectedYear: number,
    selectedMonth: number,
    accountId: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMonthlySummary(selectedYear, selectedMonth, accountId);
      setSummary(data);
    } catch (err) {
      setError(backendDetail(err, 'No se pudo cargar el resumen mensual'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId !== null) {
      loadSummary(period.year, period.month, selectedAccountId);
    }
  }, [period, selectedAccountId, loadSummary]);

  // The period selector is data-driven (`GET /operations/active-periods?account_id=`,
  // scoped to the account): when the current month shows no operations on it,
  // the view falls back to its most recent active period. A failing load keeps
  // the current-month selection as the graceful default (the summary already
  // surfaces its own error state).
  useEffect(() => {
    if (selectedAccountId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const available = await getActivePeriods(selectedAccountId);
        if (cancelled) return;
        setPeriods(available);
        if (available.length === 0) return;
        const current = available.find(
          (p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1
        );
        const target = current ?? available[0];
        setPeriod((prev) => (prev.year === target.year && prev.month === target.month ? prev : target));
      } catch {
        // keep the current-month selection; the summary state covers the error.
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAccountId]);

  const handlePeriodChange = useCallback((year: number, month: number) => {
    setPeriod((prev) => {
      // Only months with operations exist in the selector; switching to a year
      // where the current month had no operations jumps to the most recent
      // active month of that year.
      const monthsOfYear = periods
        .filter((p) => p.year === year)
        .map((p) => p.month)
        .sort((a, b) => b - a);
      if (monthsOfYear.length > 0 && !monthsOfYear.includes(month)) {
        return { year, month: monthsOfYear[0] };
      }
      if (prev.year === year && prev.month === month) return prev;
      return { year, month };
    });
  }, [periods]);

  const handleSetGlobalLimit = useCallback(async (amount: number) => {
    await saveBudgetLimit({
      account_id: selectedAccountId!,
      category_id: null,
      amount,
      month: period.month,
      year: period.year,
    });
    await loadSummary(period.year, period.month, selectedAccountId!);
  }, [selectedAccountId, period, loadSummary]);

  const handleRemoveGlobalLimit = useCallback(async () => {
    const limitId = summary?.global_limit?.id;
    if (limitId !== undefined) {
      await deleteBudgetLimit(limitId);
    }
    await loadSummary(period.year, period.month, selectedAccountId!);
  }, [summary, selectedAccountId, period, loadSummary]);

  const handleSetCategoryLimit = useCallback(async (categoryId: number, amount: number) => {
    await saveBudgetLimit({
      account_id: selectedAccountId!,
      category_id: categoryId,
      amount,
      month: period.month,
      year: period.year,
    });
    await loadSummary(period.year, period.month, selectedAccountId!);
  }, [selectedAccountId, period, loadSummary]);

  const handleRemoveCategoryLimit = useCallback(async (categoryId: number) => {
    const limitId = summary?.categories.find((row) => row.category_id === categoryId)?.limit?.id;
    if (limitId !== undefined) {
      await deleteBudgetLimit(limitId);
    }
    await loadSummary(period.year, period.month, selectedAccountId!);
  }, [summary, selectedAccountId, period, loadSummary]);

  if (loadingData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando resumen…</div>;
  }

  if (selectedAccountId === null) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Resumen mensual</h1>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(ROUTES.DASHBOARD)}
              className="w-auto"
            >
              Volver
            </Button>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            Aún no tenés cuentas. Creá una para ver el resumen mensual.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Resumen mensual</h1>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(ROUTES.DASHBOARD)}
            className="w-auto"
          >
            Volver
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <AccountSelectField
            id="report-account"
            accounts={accounts}
            value={selectedAccountId}
            onChange={selectAccount}
          />
        </div>

        <PeriodSelector period={period} periods={periods} onPeriodChange={handlePeriodChange} />

        {error ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">{error}</div>
        ) : summary ? (
          <>
            <SummaryCards summary={summary} />

            <GlobalLimitCard
              key={summary.global_limit?.id ?? 'no-global-limit'}
              limit={summary.global_limit}
              onSaveLimit={handleSetGlobalLimit}
              onRemoveLimit={handleRemoveGlobalLimit}
            />

            <CategoryBreakdown
              categories={summary.categories}
              onSaveCategoryLimit={handleSetCategoryLimit}
              onRemoveCategoryLimit={handleRemoveCategoryLimit}
            />
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            No hay datos para el periodo seleccionado.
          </div>
        )}
      </div>
    </div>
  );
}
