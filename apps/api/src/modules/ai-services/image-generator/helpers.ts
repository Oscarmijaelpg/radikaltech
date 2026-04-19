import { randomUUID } from 'node:crypto';
import { prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import type { ImageVisualAnalysis } from '../image-analyzer.js';

const STORAGE_BUCKET = 'assets';

const QUALITY_LOW = 4;
const QUALITY_MID = 6;
const QUALITY_HIGH = 8;
const MIN_DESC_CHARS = 30;
const MIN_RICH_TAGS = 3;
const MIN_RICH_COLORS = 3;
const MAX_BRAND_VALUES_IN_PROMPT = 4;

export async function uploadBuffer(
  userId: string,
  buf: Buffer,
): Promise<{ url: string; path: string }> {
  const path = `${userId}/generated/${randomUUID()}.png`;
  const up = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: false });
  if (up.error) throw up.error;
  const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const url = pub.data?.publicUrl ?? '';
  if (!url) throw new Error('No public URL after upload');
  return { url, path };
}

export function computeQualityScore(analysis: ImageVisualAnalysis | null): number | undefined {
  if (!analysis) return undefined;
  const desc = analysis.description ?? '';
  if (!desc || desc.length < MIN_DESC_CHARS) return QUALITY_LOW;
  const tags = analysis.style_tags?.length ?? 0;
  const colors = analysis.dominant_colors?.length ?? 0;
  if (tags >= MIN_RICH_TAGS && colors >= MIN_RICH_COLORS) return QUALITY_HIGH;
  return QUALITY_MID;
}

export async function buildBrandContext(
  projectId: string | undefined,
  useBrandPalette: boolean,
  basePrompt: string,
): Promise<string> {
  if (!projectId) return basePrompt;
  try {
    const brand = await prisma.brandProfile.findUnique({ where: { projectId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const brandCtx: string[] = [];
    if (project?.companyName) brandCtx.push(`Marca: "${project.companyName}"`);
    if (project?.industry) brandCtx.push(`Industria: ${project.industry}`);
    if (brand?.voiceTone) brandCtx.push(`Tono: ${brand.voiceTone}`);
    const palette = Array.isArray(brand?.colorPalette)
      ? (brand.colorPalette as string[]).filter((c) => typeof c === 'string')
      : [];
    if (useBrandPalette && palette.length > 0)
      brandCtx.push(`Paleta obligatoria: ${palette.join(', ')}`);
    if (brand?.visualDirection) brandCtx.push(`Dirección visual: ${brand.visualDirection}`);
    if (Array.isArray(brand?.brandValues) && brand.brandValues.length > 0) {
      brandCtx.push(
        `Valores de marca: ${brand.brandValues.slice(0, MAX_BRAND_VALUES_IN_PROMPT).join(', ')}`,
      );
    }
    if (brandCtx.length > 0) {
      logger.info({ projectId, ctxLines: brandCtx.length }, 'prompt enriched with brand context');
      return `${basePrompt}\n\n[CONTEXTO DE MARCA - respétalo estrictamente]\n${brandCtx.join('\n')}`;
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enrich prompt with brand context');
  }
  return basePrompt;
}
