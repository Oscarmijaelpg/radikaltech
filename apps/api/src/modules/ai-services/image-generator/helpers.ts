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
      } else {
        brandCtx.push(`
### CRITICAL LOGO RULE ###
- HAS SELECCIONADO UN LOGO EN LAS REFERENCIAS.
- POR LO TANTO: **EL LOGO GENERADO DEBE SER EXACTAMENTE EL LOGO SELECCIONADO**.
- Está ESTRICTAMENTE PROHIBIDO alterar, rediseñar o inventar variaciones del logo. Usa el logo provisto tal cual y respeta sus proporciones, colores y diseño exactos.`);
      }
    } else {
      // No references at all
      brandCtx.push(`
### CRITICAL BRANDING & TEXT RULE ###
- NO HAY REFERENCIAS VISUALES Y NO HAS SELECCIONADO NINGÚN LOGO.
- **PROHIBIDO INVENTAR LOGOS**: La IA no debe intentar crear o inventar un logo de la marca por su cuenta bajo ninguna circunstancia.
- **NO PLACEHOLDERS DE TEXTO**: Está TERMINANTEMENTE PROHIBIDO incluir textos técnicos como "[TEXT OVERLAY SPACE]", "[Insert Title]", "Your text here" o corchetes de posición. Si vas a incluir texto, debe ser contenido real y final.
- Crea una escena genérica que respete los colores de la marca pero SIN incluir logos, marcas de agua o placeholders inventados.`);
    }

    // Mode-specific composition protocol (mirrors previous platform ContentIdeation.tsx)
    if (mode === 'referential') {
      brandCtx.push(`
### MODO: APEGADO AL REFERENTE (STRICT FIDELITY) ###
### ASPECT RATIO: MANDATORY 1:1 SQUARE ###
STRICT ROLE: You are a high-end product photographer and expert compositor.
- TASK: Your goal is EXACT REPLICATION. The main subject (product, cake, place) from the reference images MUST be identical in the final result.
- SUBJECT LOCK: Maintain the EXACT identity, shape, textures, and label details of the reference product. Do not "re-interpret" the subject; clone its appearance perfectly.
- AUTHORIZED: Professional studio lighting, premium background replacement, ultra-sharp focus.
- COLORS & LOGO: Use the EXACT color hexes from the brand and references. If a logo is present in refs, it must be pixel-perfect and naturally integrated.
- NEGATIVE: NO re-interpretation of the subject. NO distortions. NO horizontal or vertical stretching. MUST BE SQUARE.`);
    } else {
      brandCtx.push(`
### MODO: EXPLORACIÓN CREATIVA ###
### ASPECT RATIO: MANDATORY 1:1 SQUARE ###
CORE RULE: Maintain brand essence but allow creative scene interpretation.
- COLOR PALETTE: Respect brand colors strictly.
- SCENE: Creative and high-impact environment.
- NEGATIVE: Do not distort logos. MUST BE SQUARE.`);
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
