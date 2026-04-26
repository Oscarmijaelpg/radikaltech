import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  Icon,
  SectionTitle,
} from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { FIRST_DAY_TASKS } from './tasks';
import { FTE_HIDDEN_KEY } from './FirstDayCard';
import onboardingVideo from '@/media/onboarding.mp4';

// Sufijo -v1: si cambia la modal de bienvenida, bumpea para re-mostrar.
export const WELCOME_SEEN_KEY = 'radikal-welcome-seen-v1';

export function WelcomeModal() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const { completedIds } = useFirstTimeProgress(activeProject?.id);

  const [open, setOpen] = useState<boolean>(() => {
    try {
      if (window.localStorage.getItem(WELCOME_SEEN_KEY) === '1') return false;
    } catch {
      /* ignore */
    }
    return true;
  });

  useEffect(() => {
    if (!profile?.onboarding_completed) setOpen(false);
  }, [profile?.onboarding_completed]);

  const nextThree = useMemo(
    () => FIRST_DAY_TASKS.filter((t) => !completedIds.has(t.id)).slice(0, 3),
    [completedIds],
  );

  if (!profile?.onboarding_completed) return null;

  const firstName = profile.full_name?.split(' ')[0] ?? 'bienvenido';

  const persistSeen = () => {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) persistSeen();
    setOpen(next);
  };

  const handleStart = () => {
    persistSeen();
    try {
      window.localStorage.removeItem(FTE_HIDDEN_KEY);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleExplore = () => {
    persistSeen();
    try {
      window.localStorage.setItem(FTE_HIDDEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-gradient-to-br from-pink-50 via-white to-cyan-50 p-0 sm:p-0 overflow-y-auto max-h-[95dvh] border border-white/80">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-pink-300/30 to-cyan-300/30 blur-3xl pointer-events-none" />

        <div className="relative p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <video
              src={onboardingVideo}
              width={320}
              height={180}
              autoPlay
              muted
              loop
              playsInline
              className="rounded-2xl shadow-lg w-full md:w-[320px] aspect-video object-cover bg-black"
            />
            <div className="flex-1 min-w-0 text-center md:text-left">
              <SectionTitle className="text-pink-600 mb-2">
                Bienvenida
              </SectionTitle>
              <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-tight">
                ¡Bienvenido a Radikal, {firstName}!
              </h2>
              <p className="text-slate-600 mt-3 text-base md:text-lg">
                Has completado lo básico. Ahora vamos a hacer que tu marca brille.
              </p>
            </div>
          </div>

          {nextThree.length > 0 && (
            <>
              <SectionTitle size="sm" className="mb-3">
                Tus primeros pasos
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                {nextThree.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 grid place-items-center text-white shadow-md">
                      <Icon name={t.icon} className="text-[20px]" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                    <span className="text-[11px] font-semibold text-pink-600 inline-flex items-center gap-1 mt-auto">
                      <Icon name="schedule" className="text-[13px]" />~
                      {t.estimatedMinutes} min
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col-reverse md:flex-row gap-3 justify-end">
            <Button variant="outline" onClick={handleExplore}>
              Explorar solo
            </Button>
            <Button
              onClick={() => {
                handleStart();
                if (nextThree[0]) navigate(nextThree[0].cta.to);
              }}
            >
              Empezar
              <Icon name="arrow_forward" className="text-[18px]" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
