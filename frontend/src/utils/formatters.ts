export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

export function parseAmount(raw: string): number {
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
}