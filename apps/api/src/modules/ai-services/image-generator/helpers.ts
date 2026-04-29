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
    
    // 1. ADN de Marca (Punto de partida obligatorio)
    const brandDna: string[] = [];
    if (brand?.voiceTone) brandDna.push(`TONO DE VOZ: ${brand.voiceTone}`);
    if (brand?.visualDirection) brandDna.push(`DIRECCIÓN VISUAL: ${brand.visualDirection}`);
    
    const palette = Array.isArray(brand?.colorPalette)
      ? (brand.colorPalette as string[]).filter((c) => typeof c === 'string')
      : [];
    if (useBrandPalette && palette.length > 0) {
      brandDna.push(`PALETA DE COLORES OBLIGATORIA: ${palette.join(', ')}`);
    }

    // 2. Análisis de Referencias (Descripción Visual Real)
    const referenceVisuals: string[] = [];
    let hasLogoInRefs = false;

    if (referenceAssetIds.length > 0) {
      const assets = await prisma.contentAsset.findMany({
        where: { id: { in: referenceAssetIds } },
        select: { id: true, aiDescription: true, marketingFeedback: true, tags: true },
      });
      
      hasLogoInRefs = assets.some(a => a.tags?.includes('logo'));
      
      assets.forEach((a, i) => {
        const desc = a.aiDescription || a.marketingFeedback;
        if (!desc) return;
        const isLogo = a.tags?.includes('logo');
        referenceVisuals.push(`Referencia #${i + 1}${isLogo ? ' (LOGO OFICIAL)' : ''}: ${desc.trim()}`);
      });
    }

    // 3. Reglas de Composición y Logos
    const rules: string[] = [];
    if (referenceAssetIds.length > 0) {
      if (!hasLogoInRefs) {
        rules.push("CRITICAL: NO logo selected in references. DO NOT invent or include any logo, text or corporate branding.");
      } else {
        rules.push("NOTE: Logo selected. The system will programmatically overlay the logo after generation. DO NOT attempt to draw the logo yourself. DO NOT include any text or invented symbols.");
      }
    } else {
      rules.push("CRITICAL: No references provided. PROHIBITED to invent logos or use text placeholders.");
    }

    if (mode === 'referential') {
      rules.push("MODE: IDENTITY LOCK (STRICT FIDELITY). The user wants EXACT structural and visual consistency with the provided references. You MUST prioritize the subjects and composition of the references over the prompt's creativity. If the prompt contradicts a reference subject, the reference subject WINS. Ignoring reference visual details is considered a FAILURE.");
    } else {
      rules.push("MODE: CREATIVE EXPLORATION. Respect brand essence but allow artistic scene interpretation.");
    }

    // Construir el bloque de contexto estructurado para el Sintetizador
    return `
### BRAND DNA ###
${brandDna.join('\n')}

### USER INTENT / IDEA ###
${basePrompt}

### VISUAL REFERENCES ANALYSIS ###
${referenceVisuals.length > 0 ? referenceVisuals.join('\n') : 'No hay referencias visuales específicas.'}

### COMPOSITION RULES ###
${rules.join('\n')}
`.trim();

  } catch (err) {
    logger.warn({ err }, 'failed to build brand context for synthesis');
    return basePrompt;
  }
}
