/**
 * Serializers for Prisma entities → API JSON shape.
 *
 * Convention: exposes all fields in snake_case for clients that expect the DB column names.
 * Keep pure (no I/O) and total (no throws).
 */

export interface SerializedBrand {
  id: string;
  project_id: string;
  user_id: string;
  essence: string | null;
  mission: string | null;
  vision: string | null;
  brand_values: string[];
  keywords: string[];
  target_audience: string | null;
  competitive_advantage: string | null;
  portfolio: string | null;
  voice_tone: string | null;
  visual_direction: string | null;
  color_palette: unknown;
  color_palette_suggested: unknown;
  visual_analysis_summary: string | null;
  moodboard_data: unknown;
  ai_generated: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function isoOrNull(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return null;
}

export function serializeBrand(
  brand: Record<string, unknown> | null | undefined,
): SerializedBrand | null {
  if (!brand) return null;
  return {
    id: String(brand.id ?? ''),
    project_id: String(brand.projectId ?? ''),
    user_id: String(brand.userId ?? ''),
    essence: (brand.essence as string | null) ?? null,
    mission: (brand.mission as string | null) ?? null,
    vision: (brand.vision as string | null) ?? null,
    brand_values: Array.isArray(brand.brandValues) ? (brand.brandValues as string[]) : [],
    keywords: Array.isArray(brand.keywords) ? (brand.keywords as string[]) : [],
    target_audience: (brand.targetAudience as string | null) ?? null,
    competitive_advantage: (brand.competitiveAdvantage as string | null) ?? null,
    portfolio: (brand.portfolio as string | null) ?? null,
    voice_tone: (brand.voiceTone as string | null) ?? null,
    visual_direction: (brand.visualDirection as string | null) ?? null,
    color_palette: brand.colorPalette ?? null,
    color_palette_suggested: brand.colorPaletteSuggested ?? null,
    visual_analysis_summary: (brand.visualAnalysisSummary as string | null) ?? null,
    moodboard_data: brand.moodboardData ?? null,
    ai_generated: Boolean(brand.aiGenerated),
    created_at: isoOrNull(brand.createdAt),
    updated_at: isoOrNull(brand.updatedAt),
  };
}
