const LOCALE = 'es-ES';

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(LOCALE, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(LOCALE, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}
