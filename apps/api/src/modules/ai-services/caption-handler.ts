import type { Context } from 'hono';
import { z } from 'zod';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { BadRequest, Forbidden } from '../../lib/errors.js';
import { ok } from '../../lib/response.js';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { assertOptionalProject } from './guards.js';

export const captionPlatformEnum = z.enum([
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'x',
  'threads',
  'pinterest',
  'youtube',
  'other',
]);

export const captionRequestSchema = z.object({
  asset_id: z.string().uuid().optional(),
  topic: z.string().max(500).optional(),
  platforms: z.array(captionPlatformEnum).min(1).max(9),
  tone: z.string().max(100).optional(),
  project_id: z.string().uuid().optional(),
});

const PLATFORM_STYLE: Record<string, string> = {
  instagram: 'storytelling, emoji-friendly, CTAs',
  tiktok: 'directo, urgencia, tendencias',
  linkedin: 'profesional, valor tangible, hooks',
  facebook: 'conversacional, pregunta al final',
  x: 'punchy, <280 chars, hook fuerte',
  threads: 'conversacional, casual, hook corto',
  pinterest: 'inspiracional, descriptivo, keywords',
  youtube: 'hook fuerte, descripcion clara, CTA a ver',
  other: 'claro y conciso',
};

const MAX_BRAND_VALUES_IN_PROMPT = 6;
const LLM_TEMPERATURE = 0.8;

async function resolveAssetDescription(
  assetId: string | undefined,
  userId: string,
): Promise<string | null> {
  if (!assetId) return null;
  const asset = await prisma.contentAsset.findUnique({ where: { id: assetId } });
  if (!asset) return null;
  if (asset.userId !== userId) throw new Forbidden();
  const meta = (asset.metadata as Record<string, unknown> | null) ?? null;
  const visual =
    meta && typeof meta === 'object' ? (meta as Record<string, unknown>).visual_analysis : null;
  if (visual && typeof visual === 'object') {
    const desc = (visual as Record<string, unknown>).description;
    if (typeof desc === 'string') return desc;
  }
  return asset.aiDescription ?? null;
}

interface BrandCtx {
  companyName: string;
  voiceTone: string;
  values: string[];
  targetAudience: string;
}

async function resolveBrandContext(
  projectId: string | undefined,
  overrideTone: string | undefined,
): Promise<BrandCtx> {
  let companyName = 'la marca';
  let voiceTone = overrideTone ?? '';
  let values: string[] = [];
  let targetAudience = '';
  if (!projectId) return { companyName, voiceTone, values, targetAudience };

  const [project, brandProfile] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.brandProfile.findUnique({ where: { projectId } }),
  ]);
  if (project) {
    companyName = project.companyName ?? project.name ?? companyName;
  }
  if (brandProfile) {
    if (!voiceTone) voiceTone = brandProfile.voiceTone ?? '';
    values = brandProfile.brandValues ?? [];
    targetAudience = brandProfile.targetAudience ?? '';
  }
  return { companyName, voiceTone, values, targetAudience };
}

export async function handleGenerateCaption(
  c: Context<{ Variables: AuthVariables }>,
) {
  const user = c.get('user');
  const { asset_id, topic, platforms, tone, project_id } =
    await c.req.json<z.infer<typeof captionRequestSchema>>();
  await assertOptionalProject(project_id, user.id);

  if (!env.OPENROUTER_API_KEY) {
    throw new BadRequest('OPENROUTER_API_KEY no configurada');
  }

  const assetDescription = await resolveAssetDescription(asset_id, user.id);
  const brand = await resolveBrandContext(project_id, tone);

  const subject = topic || assetDescription || 'Contenido de marca';
  const platformStyles = platforms
    .map((p) => `- ${p}: ${PLATFORM_STYLE[p] ?? PLATFORM_STYLE.other}`)
    .join('\n');

  const system =
    'Eres un copywriter experto en redes sociales. Devuelves SOLO JSON válido, sin explicaciones.';
  const userPrompt = `Genera 3 variantes de caption en español para esta marca, para cada plataforma solicitada.

Marca: ${brand.companyName}
Tono de marca: ${brand.voiceTone || 'cercano, auténtico'}
Valores: ${brand.values.slice(0, MAX_BRAND_VALUES_IN_PROMPT).join(', ') || 'N/A'}
Audiencia: ${brand.targetAudience || 'general'}
Tema/imagen: ${subject}
Plataformas: ${platforms.join(', ')}

Por cada plataforma genera 3 captions DISTINTAS (corta/media/larga), cada una con:
- caption (sin hashtags al final, deja espacio para ellos)
- hashtags: 5-10 hashtags relevantes (sin #)
- emoji_suggested: 2-3 emojis sugeridos

Estilo específico por plataforma:
${platformStyles}

Devuelve SOLO JSON con esta forma exacta:
{ "per_platform": { "<platform>": { "variants": [{ "length": "short|medium|long", "caption": "...", "hashtags": ["tag1","tag2"], "emoji_suggested": ["✨","🔥"] }] } } }`;

  const r = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.WEB_URL,
      'X-Title': 'Radikal',
    },
    body: JSON.stringify({
      model: LLM_MODELS.chat.openrouter,
      response_format: { type: 'json_object' },
      temperature: LLM_TEMPERATURE,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!r.ok) {
    throw new BadRequest(`OpenRouter error: ${r.status}`);
  }
  const data = (await r.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new BadRequest('Respuesta IA inválida');
  }
  return c.json(ok(parsed));
}
