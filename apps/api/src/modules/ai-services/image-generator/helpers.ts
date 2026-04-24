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
  // Nueva ruta estandarizada: files/images/gen_{uuid}.png
  const path = `files/images/gen_${randomUUID()}.png`;
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
  mode: 'referential' | 'creative' = 'creative',
): Promise<string> {
  const finalPrompt: string[] = [];

  // 1. Protocolos Técnicos de Calidad
  finalPrompt.push('### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###');
  finalPrompt.push('### QUALITY: Professional photography, clean, premium, 4k, marketing quality, studio lighting ###');
  finalPrompt.push('### NEGATIVE PROMPT: No chaotic elements, no distorted logos, no low resolution, no generic aesthetic, no double logos, no distorted text ###');

  // 2. Protocolo según Modo
  if (mode === 'referential') {
    finalPrompt.push('### IMAGE-COMPOSITION PROTOCOL: COHESIVE INTEGRATION ###');
    finalPrompt.push('### SUBJECT LOCK: You must strictly maintain the exact identity, textures, and label details of the main product. It must still be the exact same product. ###');
  } else {
    finalPrompt.push('### BRAND-CENTRIC CREATIVE MODE ###');
    finalPrompt.push('### Respect the brand DNA. Extract and use ONLY the exact hex codes/colors from the reference images. ###');
  }

  if (!projectId) return `${finalPrompt.join('\n')}\n\nUSER PROMPT: ${basePrompt}`;

  try {
    const brand = await prisma.brandProfile.findUnique({ where: { projectId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const brandCtx: string[] = [];

    if (project?.companyName) brandCtx.push(`Brand Name: "${project.companyName}"`);
    if (project?.industry) brandCtx.push(`Industry: ${project.industry}`);
    if (brand?.voiceTone) brandCtx.push(`Brand Tone: ${brand.voiceTone}`);

    const palette = Array.isArray(brand?.colorPalette)
      ? (brand.colorPalette as string[]).filter((c) => typeof c === 'string')
      : [];
    if (useBrandPalette && palette.length > 0) {
      brandCtx.push(`Mandatory HEX Palette: ${palette.join(', ')}`);
    }

    if (brand?.visualDirection) brandCtx.push(`Visual Art Direction: ${brand.visualDirection}`);

    // 3. Inteligencia Visual Incremental (Moodboard y Social)
    try {
      const recentAssets = await prisma.contentAsset.findMany({
        where: { projectId, assetType: 'image' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { metadata: true }
      });
      
      const visualInsights: string[] = [];
      for (const asset of recentAssets) {
        const va = (asset.metadata as any)?.visual_analysis as ImageVisualAnalysis | undefined;
        if (va?.creative_prompt_summary) {
          visualInsights.push(va.creative_prompt_summary);
        }
      }
      
      if (visualInsights.length > 0) {
        brandCtx.push(`\n[ESTÉTICA DETECTADA EN ASSETS REALES]`);
        brandCtx.push(visualInsights.join('\n'));
      }
    } catch (err) {
      logger.warn({ err }, 'failed to pull visual insights from assets');
    }

    if (Array.isArray(brand?.brandValues) && brand.brandValues.length > 0) {
      brandCtx.push(
        `Brand Values: ${brand.brandValues.slice(0, MAX_BRAND_VALUES_IN_PROMPT).join(', ')}`,
      );
    }

    // Logo Placement Rule
    finalPrompt.push('### MANDATORY LOGO PLACEMENT: Integrate the brand logo elegantly and clearly in a corner or natural spot, ensuring it does not overlap essential elements. ###');

    if (brandCtx.length > 0) {
      logger.info({ projectId, mode, ctxLines: brandCtx.length }, 'prompt enriched with brand context');
      return `${finalPrompt.join('\n')}\n\n[BRAND DNA CONTEXT]\n${brandCtx.join('\n')}\n\nUSER REQUEST: ${basePrompt}`;
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enrich prompt with brand context');
  }

  return `${finalPrompt.join('\n')}\n\nUSER REQUEST: ${basePrompt}`;
}
