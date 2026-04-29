import type { StructuredInsight } from './types';

export function sentimentClasses(s?: string): string {
  const v = (s ?? '').toLowerCase();
  if (v === 'positive' || v === 'positivo') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (v === 'negative' || v === 'negativo') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function impactClasses(i?: string): string {
  const v = (i ?? '').toLowerCase();
  if (v === 'high' || v === 'alto') return 'bg-red-100 text-red-700 border-red-200';
  if (v === 'medium' || v === 'medio') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (v === 'low' || v === 'bajo') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function parseInsights(items: string[]): Array<StructuredInsight> {
  return items.map((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && ('text' in parsed || 'impact' in parsed)) {
        return parsed as StructuredInsight;
      }
    } catch {
      /* noop */
    }
    return { text: raw };
  });
}

export function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function tryParseJson(s: string | null | undefined): unknown | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function fmtDate(s?: string): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function sentimentLabel(s?: string): string {
  const v = (s ?? '').toLowerCase();
  if (v === 'positive' || v === 'positivo') return 'Positivo';
  if (v === 'negative' || v === 'negativo') return 'Negativo';
  if (v === 'neutral') return 'Neutral';
  return s ?? '—';
}

export function relevanceClasses(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-700 border-red-200';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function authorityStars(authority: number): number {
  return Math.max(1, Math.min(5, Math.round(authority / 20)));
}
