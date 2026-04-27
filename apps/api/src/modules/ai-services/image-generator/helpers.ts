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
  referenceAssetIds: string[] = [],
  mode: 'creative' | 'referential' = 'creative',
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

    if (referenceAssetIds.length > 0) {
      const assets = await prisma.contentAsset.findMany({
        where: { id: { in: referenceAssetIds } },
        select: { id: true, aiDescription: true, marketingFeedback: true, tags: true },
      });
      
      const hasLogoInRefs = assets.some(a => a.tags?.includes('logo'));
      
      const assetCtx = assets
        .map((a, i) => {
          const desc = a.aiDescription || a.marketingFeedback;
          if (!desc) return null;
          const isLogo = a.tags?.includes('logo');
          return `Ref #${i + 1}${isLogo ? ' (LOGO OFICIAL)' : ''}: ${desc.slice(0, 300)}${a.tags?.length ? ` (Tags: ${a.tags.join(', ')})` : ''}`;
        })
        .filter(Boolean);

      if (assetCtx.length > 0) {
        brandCtx.push(`\nRECUERDA ESTAS REFERENCIAS VISUALES:\n${assetCtx.join('\n')}`);
      }

      if (!hasLogoInRefs) {
        brandCtx.push(`
### CRITICAL LOGO RULE ###
- NO HAS SELECCIONADO UN LOGO EN LAS REFERENCIAS.
- POR LO TANTO: **ESTÁ ESTRICTAMENTE PROHIBIDO INVENTAR O DIBUJAR UN LOGO**.
- La imagen NO debe contener ningún logo, marca de agua o texto corporativo inventado. Solo enfócate en la escena/producto sin branding si el logo no está en las Refs.`);
      }
    } else {
      // No references at all
      brandCtx.push(`
### CRITICAL BRANDING RULE ###
- NO HAY REFERENCIAS VISUALES.
- **PROHIBIDO INVENTAR LOGOS O TEXTOS**: La IA no debe intentar crear un logo de la marca por su cuenta. 
- Crea una escena genérica que respete los colores de la marca pero SIN incluir logos inventados.`);
    }

    // Mode-specific composition protocol (mirrors previous platform ContentIdeation.tsx)
    if (mode === 'referential') {
      brandCtx.push(`
### IMAGE-COMPOSITION PROTOCOL: COHESIVE INTEGRATION ###
### MANDATORY ASPECT RATIO: Respect the requested size ###
STRICT ROLE: You are an expert art director and compositor.
- TASK: Do NOT just paste the images together like a basic collage. Create a cohesive, realistic, and professional scene or editorial composition using all provided visual elements.
- SUBJECT LOCK: You may maintain the exact identity, textures, and label details of the main product/subject.
- AUTHORIZED: Better lighting, high-end studio or lifestyle background, sharp focus, dynamic angles.
- COLORS & LOGO: Extract and use ONLY the exact colors from the reference images. The logo (IF SELECTED) must be placed elegantly and naturally without deforming its typography, shape, or original color.
- NEGATIVE: Do NOT make a flat collage, do NOT distort the product shape or label, do NOT add unrelated elements.`);
    } else {
      brandCtx.push(`
### BRAND-CENTRIC CREATIVE MODE ###
CORE RULE: Even in creative mode, you MUST respect the brand DNA strictly.
- COLOR PALETTE: Extract and use ONLY the exact hex codes/colors present in the reference images and brand palette.
- LOGO INTEGRITY: IF (and only if) a logo is selected as reference, place it clearly and legibly. NEVER alter its shape, font, or color.
- SCENE: Create a compelling, new lifestyle or studio setting, but keep the brand identity clean and professional.
- QUALITY: Professional photography quality, 4K, editorial-grade composition.
- NEGATIVE: No chaotic elements, no distorted logos, no neon colors unless present in the brand.`);
    }

    if (brandCtx.length > 0) {
      logger.info({ projectId, ctxLines: brandCtx.length, mode }, 'prompt enriched with brand context');
      return `${basePrompt}\n\n[CONTEXTO DE MARCA - respétalo estrictamente]\n${brandCtx.join('\n')}`;
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enrich prompt with brand context');
  }
  return basePrompt;
}
