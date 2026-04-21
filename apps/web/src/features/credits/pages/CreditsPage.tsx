import { NavLink } from 'react-router-dom';
import { Icon, Spinner, Badge } from '@radikal/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/shared/utils/cn';
import { useCreditBalance, useCreditHistory, type CreditTransaction } from '../api/credits';

const KIND_LABEL: Record<CreditTransaction['kind'], string> = {
  grant: 'Bono',
  spend: 'Consumo',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
};

const KIND_BADGE: Record<CreditTransaction['kind'], 'success' | 'muted' | 'primary' | 'warning'> = {
  grant: 'success',
  spend: 'muted',
  refund: 'primary',
  adjustment: 'warning',
};

const ACTION_LABEL: Record<string, string> = {
  'chat.message': 'Mensaje de chat',
  'embeddings.generate': 'Embeddings',
  'caption.generate': 'Generar caption',
  'brand.synthesize': 'Sintetizar marca',
  'recommendations.generate': 'Recomendaciones',
  'auto_competitor.detect': 'Detectar competidores',
  'market.detect': 'Detectar mercados',
  'image.analyze': 'Analizar imagen',
  'content.evaluate': 'Evaluar contenido',
  'news.aggregate': 'Agregar noticias',
  'trends.detect': 'Detectar tendencias',
  'competitor.analyze': 'Analizar competidor',
  'website.analyze': 'Analizar sitio web',
  'image.generate': 'Generar imagen',
  'image.edit': 'Editar imagen',
  'brand.analyze': 'Analizar marca',
  'tiktok.scrape': 'Scraping TikTok',
  'instagram.scrape': 'Scraping Instagram',
};

function formatMonedas(n: number): string {
  return new Intl.NumberFormat('es-MX').format(n);
}

function formatDate(iso: string | Date): string {
  return format(new Date(iso), "dd 'de' MMM yyyy · HH:mm", { locale: es });
}

export function CreditsPage() {
  const balanceQ = useCreditBalance();
  const historyQ = useCreditHistory(100);

  const balance = balanceQ.data?.balance ?? 0;
  const low = !balanceQ.isLoading && balance <= 20;

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <div className="px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-4xl mx-auto flex items-center gap-1.5 text-[11px] text-slate-500">
        <NavLink to="/settings" className="hover:text-slate-700 font-semibold inline-flex items-center gap-1">
          <Icon name="settings" className="text-[14px]" />
          Ajustes
        </NavLink>
        <span className="opacity-40">›</span>
        <span>Monedas</span>
      </div>

      <div className="p-4 sm:p-6 md:p-8 pt-2 max-w-4xl mx-auto space-y-6">
        {/* Hero con balance */}
        <header
          className={cn(
            'relative overflow-hidden rounded-[24px] md:rounded-[32px] p-6 md:p-10 text-white shadow-2xl',
            low
              ? 'bg-gradient-to-br from-rose-500 to-red-600'
              : 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500',
          )}
        >
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/20 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                <Icon name="paid" className="text-[18px]" />
                Tu saldo
              </div>
              <div className="font-display text-5xl sm:text-6xl font-black mt-1 tabular-nums">
                {balanceQ.isLoading ? '…' : formatMonedas(balance)}
              </div>
              <div className="text-white/80 text-sm mt-1">monedas Radikal</div>
            </div>
            <button
              type="button"
              disabled
              title="Disponible pronto"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/90 text-slate-900 font-bold text-sm shadow-lg cursor-not-allowed opacity-75"
            >
              <Icon name="add_card" className="text-[18px]" />
              Comprar monedas
              <span className="text-[10px] font-black uppercase opacity-60">Pronto</span>
            </button>
          </div>
          {low && (
            <div className="relative z-10 mt-5 rounded-2xl bg-white/15 backdrop-blur-sm px-4 py-3 flex items-start gap-2 text-sm">
              <Icon name="warning" className="text-[20px] shrink-0" />
              <div>
                Tu saldo está bajo. Algunas acciones podrían bloquearse hasta que recargues.
              </div>
            </div>
          )}
        </header>

        {/* Historial */}
        <section className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white shadow-xl p-4 sm:p-6">
          <header className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display text-xl font-black">Historial</h2>
            <span className="text-xs text-slate-500">Últimas {historyQ.data?.length ?? 0} operaciones</span>
          </header>

          {historyQ.isLoading ? (
            <div className="py-12 grid place-items-center">
              <Spinner />
            </div>
          ) : !historyQ.data || historyQ.data.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Aún no has registrado movimientos.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/70">
              {historyQ.data.map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl grid place-items-center shrink-0',
                      t.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    <Icon
                      name={
                        t.kind === 'grant'
                          ? 'card_giftcard'
                          : t.kind === 'refund'
                            ? 'undo'
                            : t.kind === 'adjustment'
                              ? 'tune'
                              : 'paid'
                      }
                      className="text-[18px]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">
                        {t.actionKey ? (ACTION_LABEL[t.actionKey] ?? t.actionKey) : KIND_LABEL[t.kind]}
                      </div>
                      <Badge variant={KIND_BADGE[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
                    </div>
                    {t.reason && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">{t.reason}</div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(t.createdAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={cn(
                        'font-mono font-bold tabular-nums',
                        t.amount > 0 ? 'text-emerald-600' : 'text-slate-700',
                      )}
                    >
                      {t.amount > 0 ? '+' : ''}
                      {formatMonedas(t.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      saldo: {formatMonedas(t.balanceAfter)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
