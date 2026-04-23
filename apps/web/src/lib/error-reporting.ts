// Stub de error reporting — no envía nada por defecto.
// Si hay VITE_SENTRY_DSN en env, podría inicializar Sentry en el futuro.
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function captureException(err: unknown, context?: Record<string, unknown>) {
  console.error('[app-error]', err, context);
  if (DSN) {
    // TODO: importar dinámico @sentry/react cuando se active
    // const Sentry = await import('@sentry/react');
    // Sentry.captureException(err, { extra: context });
  }
}

export function captureMessage(
  msg: string,
  level: 'info' | 'warn' | 'error' = 'info',
) {
  const fn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[app-${level}]`, msg);
}

// Handlers globales
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    captureException(e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    captureException(e.reason);
  });
}
