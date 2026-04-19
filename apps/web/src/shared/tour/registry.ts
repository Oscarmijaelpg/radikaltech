import type { CharacterKey } from '@/shared/characters';
import type { TourDefinition } from './TourProvider';
import { COMPETITORS_TOUR } from './competitors-tour';
import { DASHBOARD_TOUR } from './dashboard-tour';

export type TourId =
  | 'dashboard'
  | 'competitors'
  | 'memory'
  | 'content'
  | 'reports'
  | 'recommendations'
  | 'news';

export const FEATURE_CHARACTER: Record<TourId, CharacterKey> = {
  dashboard: 'ankor',
  memory: 'ankor',
  competitors: 'sira',
  news: 'sira',
  content: 'nexo',
  reports: 'kronos',
  recommendations: 'indexa',
};

export const TOURS: Partial<Record<TourId, TourDefinition>> = {
  dashboard: DASHBOARD_TOUR,
  competitors: COMPETITORS_TOUR,
};

export function getTour(id: TourId): TourDefinition | null {
  return TOURS[id] ?? null;
}
