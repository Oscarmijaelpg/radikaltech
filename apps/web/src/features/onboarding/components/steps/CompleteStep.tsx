import { useEffect, useState } from 'react';
import { Button, Spinner } from '@radikal/ui';
import { AlertCircle } from 'lucide-react';
import type { OnboardingState } from '../../types';
import { WebsiteSource } from '@radikal/shared';
import ankorImg from '@/media/ankor.webp';
import siraImg from '@/media/Sira.webp';
import nexoImg from '@/media/Nexo.webp';
import kronosImg from '@/media/Kronos.webp';
import indexaImg from '@/media/indexa.webp';

const CHARACTERS = [
  { src: ankorImg, name: 'Ankor' },
  { src: siraImg, name: 'Sira' },
  { src: nexoImg, name: 'Nexo' },
  { src: kronosImg, name: 'Kronos' },
  { src: indexaImg, name: 'Indexa' },
];

interface CompleteStepProps {
  state: OnboardingState;
  onFinish: () => Promise<void>;
}

export function CompleteStep({ state, onFinish }: CompleteStepProps) {
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ensure no scroll flicker
  }, []);

  const websiteConfigured =
    state.company?.website_source === WebsiteSource.URL ||
    (state.company?.business_summary && state.company.business_summary.length > 0);
  const socialsConfigured = (state.socials?.accounts?.length ?? 0) > 0;
  const brandConfigured = !!state.brand?.tone_of_voice;
  const objectivesCount = state.objectives?.objectives?.length ?? 0;

  const hasWarnings = !websiteConfigured || !socialsConfigured;

  const handleFinish = async () => {
    setError(null);
    setFinishing(true);
    try {
      await onFinish();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos finalizar. Intenta de nuevo.');
      setFinishing(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center gap-4 sm:gap-6 py-4 sm:py-6">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center shadow-xl shadow-emerald-500/40 animate-in zoom-in-50 duration-500">
        <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>
      <div className="max-w-xl">
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">¡Todo listo!</h2>
        <p className="mt-3 text-[hsl(var(--color-muted))]">
          Radikal ya tiene el contexto necesario para trabajar como tu socio estratégico.
        </p>
      </div>

      <div className="w-full max-w-md text-left bg-slate-50 rounded-2xl p-4 sm:p-5 flex flex-col gap-2">
        <SummaryRow label="Empresa" value={state.company?.company_name ?? '—'} />
        <SummaryRow
          label="Industria"
          value={state.company?.industry_custom || state.company?.industry || '—'}
        />
        <SummaryRow
          label="Sitio web"
          value={
            state.company?.website_source === WebsiteSource.URL
              ? state.company?.website_url ?? 'Configurado'
              : state.company?.business_summary
                ? 'Descrito manualmente'
                : 'Omitido'
          }
        />
        <SummaryRow label="Redes sociales" value={`${state.socials?.accounts?.length ?? 0} conectadas`} />
        <SummaryRow label="Tono de voz" value={state.brand?.tone_of_voice || 'No definido'} />
        <SummaryRow label="Objetivos" value={`${objectivesCount} definidos`} />
      </div>

      {hasWarnings && (
        <div className="w-full max-w-md flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 text-left">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Completar estos datos mejora la IA. Podrás hacerlo después desde la sección Memory.
          </span>
        </div>
      )}

      {error && (
        <div className="w-full max-w-md flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 text-left">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button size="lg" onClick={handleFinish} disabled={finishing} className="mt-2">
        {finishing ? (
          <Spinner size="sm" className="border-white border-t-white/40" />
        ) : null}
        Entrar al dashboard
        {!finishing && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
      </Button>

      <div className="w-full flex items-end justify-center gap-2 md:gap-4 mt-6 pt-6 border-t border-slate-100">
        {CHARACTERS.map((c, i) => (
          <div
            key={c.name}
            className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <img
              src={c.src}
              alt={c.name}
              className="w-16 md:w-20 drop-shadow-xl object-contain"
            />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600">
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[hsl(var(--color-muted))]">{label}</span>
      <span className="font-semibold text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
