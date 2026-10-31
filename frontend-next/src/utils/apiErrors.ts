/** Extrae el `detail` del body de error de Axios (o un mensaje de fallback)
 * para surfacear en la UI el detalle exacto que devuelve el backend. */
export function backendDetail(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? fallback;
}
