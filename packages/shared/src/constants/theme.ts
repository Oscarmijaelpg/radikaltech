// Design tokens. HSL values are stored as strings so they can be plugged into
// Tailwind/CSS variables directly (e.g. `hsl(var(--primary))`).

export const THEME = {
  primaryHsl: '327 100% 51%',
  primaryForegroundHsl: '0 0% 100%',
  secondaryHsl: '182 53% 50%',
  secondaryForegroundHsl: '0 0% 100%',
  accentHsl: '327 100% 51%',
  accentForegroundHsl: '0 0% 100%',
  backgroundHsl: '0 0% 100%',
  foregroundHsl: '240 10% 4%',
  mutedHsl: '240 5% 96%',
  mutedForegroundHsl: '240 4% 46%',
  borderHsl: '240 6% 90%',
  destructiveHsl: '0 84% 60%',
  destructiveForegroundHsl: '0 0% 100%',
} as const;

export type ThemeTokens = typeof THEME;
