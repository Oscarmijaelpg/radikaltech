import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getTour, type TourId } from './registry';
import { isTourCompleted, useTour } from './TourProvider';

const DEFAULT_DELAY_MS = 600;

interface Options {
  delayMs?: number;
  requireOnboarding?: boolean;
  enabled?: boolean;
}

export function usePageTour(tourId: TourId, options: Options = {}) {
  const {
    delayMs = DEFAULT_DELAY_MS,
    requireOnboarding = true,
    enabled = true,
  } = options;
  const { profile } = useAuth();
  const { startTour } = useTour();

  useEffect(() => {
    if (!enabled) return;
    if (requireOnboarding && !profile?.onboarding_completed) return;
    if (isTourCompleted(tourId)) return;
    const def = getTour(tourId);
    if (!def) return;
    const t = window.setTimeout(() => startTour(def), delayMs);
    return () => window.clearTimeout(t);
  }, [
    enabled,
    tourId,
    delayMs,
    requireOnboarding,
    profile?.onboarding_completed,
    startTour,
  ]);
}
