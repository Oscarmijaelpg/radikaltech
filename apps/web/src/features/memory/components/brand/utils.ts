export interface ContentAssetLite {
  id: string;
  asset_url: string;
  asset_type: string;
  tags: string[] | null;
  ai_description: string | null;
  created_at: string;
}

export interface VisualAnalysisLike {
  dominant_colors?: string[];
  lighting?: string;
  mood?: string;
  composition?: string;
  style_tags?: string[];
  description?: string;
}

export function getInitials(name: string | null | undefined) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function palettetoArray(palette: unknown): string[] {
  if (!palette) return [];
  if (Array.isArray(palette))
    return palette.filter((x): x is string => typeof x === 'string');
  if (typeof palette === 'object') {
    return Object.values(palette as Record<string, unknown>).filter(
      (x): x is string => typeof x === 'string',
    );
  }
  return [];
}

export function extractVisualAnalysis(asset: ContentAssetLite): VisualAnalysisLike | null {
  const meta = (asset as unknown as { metadata?: { visual_analysis?: VisualAnalysisLike } }).metadata;
  return meta?.visual_analysis ?? null;
}

export function flagFromIso(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const A = 0x1f1e6;
  const upper = code.toUpperCase();
  const cp1 = A + (upper.charCodeAt(0) - 65);
  const cp2 = A + (upper.charCodeAt(1) - 65);
  try {
    return String.fromCodePoint(cp1, cp2);
  } catch {
    return '🌐';
  }
}

export const LATAM_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'R. Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CA', name: 'Canadá' },
];

export function countryName(code: string): string {
  const found = LATAM_COUNTRIES.find((c) => c.code === code.toUpperCase());
  return found ? found.name : code;
}

export const JOB_LABELS: Record<string, { label: string; icon: string }> = {
  website_analyze: { label: 'Analizando tu sitio web', icon: 'language' },
  brand_analyze: { label: 'Ejecutando análisis completo de marca', icon: 'auto_awesome' },
  brand_synthesize: { label: 'Sintetizando identidad de marca', icon: 'psychology' },
  image_analyze: { label: 'Analizando imágenes con IA', icon: 'image_search' },
  instagram_scrape: { label: 'Descargando contenido de Instagram', icon: 'photo_camera' },
  tiktok_scrape: { label: 'Descargando contenido de TikTok', icon: 'music_note' },
  auto_competitor_detect: { label: 'Detectando competidores', icon: 'radar' },
  news_aggregate: { label: 'Buscando noticias', icon: 'newspaper' },
};

// ---------- Shared presentational primitives ----------

export const SOCIAL_ICON_MAP: Record<string, string> = {
  instagram: 'photo_camera',
  facebook: 'facebook',
  twitter: 'alternate_email',
  x: 'alternate_email',
  linkedin: 'business_center',
  tiktok: 'music_note',
  youtube: 'play_circle',
  whatsapp: 'chat',
  pinterest: 'push_pin',
};
