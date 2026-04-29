import type { ReactNode } from 'react';
import {
  Icon,
  Stepper,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { LoadingMessages, SAVING_MESSAGES } from './LoadingMessages';
import { useActiveJobsForUser } from '@/features/memory/api/memory/jobs';
import { JobFailureToasts } from '@/features/notifications/components/JobFailureToasts';

interface OnboardingLayoutProps {
  children: ReactNode;
  stepIndex?: number;
  showStepper?: boolean;
  character?: {
    src: string;
    name: string;
    message: string;
  };
  fullWidth?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
  saving?: boolean;
  savingMessages?: string[];
}

const STEPS = [
  { label: 'Empresa' },
  { label: 'Sitio web' },
  { label: 'Redes' },
  { label: 'Marca' },
  { label: 'Objetivos' },
];

const ONBOARDING_JOB_LABELS: Record<string, string> = {
  website_analyze: 'Analizando tu sitio web',
  instagram_scrape: 'Descargando posts de Instagram',
  tiktok_scrape: 'Descargando posts de TikTok',
  brand_analyze: 'Sintetizando tu marca',
  brand_synthesize: 'Sintetizando identidad',
  image_analyze: 'Analizando imágenes',
  auto_competitor_detect: 'Detectando competidores',
};

export function OnboardingLayout({
  children,
  stepIndex = 0,
  showStepper = true,
  character,
  fullWidth = false,
  errorMessage,
  onDismissError,
  saving = false,
  savingMessages = SAVING_MESSAGES,
}: OnboardingLayoutProps) {
  const { data: bgJobs = [] } = useActiveJobsForUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-cyan-50 relative overflow-hidden">
      <JobFailureToasts />
      {/* Decorative blobs */}
      <div className="hidden sm:block absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--color-primary)/0.12)] blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[hsl(var(--color-secondary)/0.12)] blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {showStepper && (
          <div className="w-full px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <div className="max-w-5xl mx-auto overflow-x-auto">
              <Stepper steps={STEPS} currentStep={stepIndex} />
            </div>
          </div>
        )}

        <div className="flex-1 flex items-start justify-center p-4 sm:p-6 md:p-10">
          <div
            className={cn(
              'w-full',
              fullWidth ? 'max-w-5xl' : 'max-w-6xl',
              'grid gap-8 items-start',
              character ? 'grid-cols-1 md:grid-cols-[2fr_3fr]' : 'grid-cols-1',
            )}
          >
            {character && (
              <div className="hidden md:flex flex-col items-center gap-6 animate-in fade-in slide-in-from-left-4 duration-700 md:sticky md:top-10 md:self-start">
                <img
                  src={character.src}
                  alt={character.name}
                  className="h-64 md:h-80 w-auto drop-shadow-2xl object-contain"
                />
                <div className="relative w-full max-w-xs">
                  <div className="bg-white rounded-3xl shadow-lg p-5 text-sm text-slate-700 leading-relaxed">
                    <p className="text-[10px] font-black uppercase tracking-tighter opacity-50 mb-2">
                      {character.name}
                    </p>
                    <p>{character.message}</p>
                  </div>
                  <div className="absolute -top-2 left-10 w-4 h-4 bg-white rotate-45 shadow-[-2px_-2px_3px_rgba(0,0,0,0.04)]" />
                </div>
              </div>
            )}

            <div
              className={cn(
                'rounded-[20px] sm:rounded-[32px] bg-white/80 backdrop-blur-xl shadow-2xl border border-white p-4 sm:p-6 md:p-10',
              )}
            >
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                  <Icon name="error" className="text-red-500 text-[20px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700">No pudimos guardar</p>
                    <p className="text-xs text-red-600 mt-0.5 break-words">{errorMessage}</p>
                  </div>
                  {onDismissError && (
                    <button
                      type="button"
                      onClick={onDismissError}
                      className="text-red-400 hover:text-red-600 p-0.5 rounded-full hover:bg-red-100 transition-colors shrink-0"
                      aria-label="Cerrar"
                    >
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  )}
                </div>
              )}
              {bgJobs.length > 0 && !saving && (
                <div className="mb-4 p-3 bg-gradient-to-r from-[hsl(var(--color-primary)/0.06)] to-transparent border border-[hsl(var(--color-primary)/0.15)] rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Icon name="progress_activity" className="text-[18px] text-[hsl(var(--color-primary))] animate-spin shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">
                      <span className="font-bold text-slate-700">
                        {bgJobs.length === 1
                          ? ONBOARDING_JOB_LABELS[bgJobs[0]!.kind] ?? 'Analizando en segundo plano'
                          : `${bgJobs.length} tareas en curso`}
                      </span>
                      {' — '}Los datos aparecerán automáticamente. Puedes seguir avanzando.
                    </p>
                    {bgJobs.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {bgJobs.slice(0, 4).map((j) => (
                          <span
                            key={j.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-semibold text-slate-600 border border-slate-200"
                          >
                            {ONBOARDING_JOB_LABELS[j.kind] ?? j.kind}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {children}
              {saving && (
                <div className="mt-6 flex justify-center">
                  <LoadingMessages messages={savingMessages} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
