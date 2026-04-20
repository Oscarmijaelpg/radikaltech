export function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
