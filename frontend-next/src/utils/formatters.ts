export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatPercentage(percentage: number | null): string {
  return percentage === null ? '—' : `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(percentage)}%`;
}

/** Visual alert level for a spend-vs-limit percentage: green below 75%,
 * yellow between 75%-99% and red at 100% or over. `neutral` (no limit or no
 * salary yet) renders a calm gray/dashed bar instead. */
export type ConsumptionLevel = 'neutral' | 'ok' | 'warning' | 'danger';

export function consumptionLevel(percentage: number | null): ConsumptionLevel {
  if (percentage === null) return 'neutral';
  if (percentage >= 100) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'ok';
}

export function parseAmount(raw: string): number {
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
}
