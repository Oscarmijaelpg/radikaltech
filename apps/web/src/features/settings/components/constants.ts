export type NotifPrefs = {
  enabled: boolean;
  scheduled_reports: boolean;
  high_impact_news: boolean;
  jobs_completed: boolean;
  new_recommendations: boolean;
};

export const DEFAULT_NOTIF: NotifPrefs = {
  enabled: true,
  scheduled_reports: true,
  high_impact_news: true,
  jobs_completed: true,
  new_recommendations: true,
};

export const NOTIF_KEY = 'radikal:notification_preferences';
export const COLOR_KEY = 'radikal:color_primary';
export const DENSITY_KEY = 'radikal:density';
export const DARKMODE_KEY = 'radikal:dark_mode';

export const COLOR_PRESETS = [
  { id: 'pink', label: 'Rosa', hsl: '335 82% 58%', hex: '#ec4899' },
  { id: 'blue', label: 'Azul', hsl: '217 91% 60%', hex: '#3b82f6' },
  { id: 'green', label: 'Verde', hsl: '160 84% 39%', hex: '#10b981' },
  { id: 'violet', label: 'Violeta', hsl: '262 83% 58%', hex: '#8b5cf6' },
] as const;

export function loadNotif(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return DEFAULT_NOTIF;
    return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIF;
  }
}
