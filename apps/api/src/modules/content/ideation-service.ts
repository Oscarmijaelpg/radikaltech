import { prisma } from '@radikal/db';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { moonshotWebSearch, stripJsonWrapping } from '../ai-services/moonshot.js';

export type IdeaAngle = 'educativo' | 'entretenimiento' | 'venta' | 'storytelling' | 'auto';

export interface GenerateIdeasInput {
  projectId: string;
  userId: string;
  angle?: IdeaAngle;
  count?: number;
}

export interface ContentIdea {
  title: string;
  description: string;
  platform: 'Instagram' | 'LinkedIn' | 'Twitter' | 'TikTok';
  visual_suggestion: string;
  type: 'pilar' | 'carrusel';
  image_count: number;
}

export interface GenerateIdeasOutput {
  ideas: ContentIdea[];
}

const DEFAULT_COUNT = 5;
const MAX_COUNT = 8;

const ANGLE_DESCRIPTIONS: Record<Exclude<IdeaAngle, 'auto'>, string> = {
  educativo: 'Educación: datos, how-tos, desmitificación. Gancho: aprendizaje rápido.',
  entretenimiento: 'Entretenimiento: humor, trends, cultura pop relevante al sector.',
  venta: 'Venta directa: demostrar el producto/servicio, CTA explícito.',
  storytelling: 'Storytelling: casos de clientes, behind-the-scenes, narrativa de marca.',
};

const PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter', 'TikTok'] as const;

function normalizePlatform(v: unknown): ContentIdea['platform'] {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('tiktok')) return 'TikTok';
  if (s.includes('linkedin')) return 'LinkedIn';
  if (s.includes('twitter') || s.includes('x.com') || s === 'x') return 'Twitter';
  return 'Instagram';
}

function normalizeType(v: unknown): ContentIdea['type'] {
  return String(v ?? '').toLowerCase() === 'carrusel' ? 'carrusel' : 'pilar';
}

function parseIdeas(raw: string): ContentIdea[] {
  const clean = stripJsonWrapping(raw);
  const parsed = JSON.parse(clean) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { ideas?: unknown[] })?.ideas)
    ? (parsed as { ideas: unknown[] }).ideas
    : null;
  if (!list) throw new Error('formato inesperado: esperaba array de ideas');
  return list
    .map((item): ContentIdea | null => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const title = typeof o.title === 'string' ? o.title.trim() : '';
      const description = typeof o.description === 'string' ? o.description.trim() : '';
      const visual = typeof o.visual_suggestion === 'string' ? o.visual_suggestion.trim() : '';
      if (!title || !description) return null;
      const type = normalizeType(o.type);
      const imageCount = Number(o.image_count);
      return {
        title: title.slice(0, 160),
        description: description.slice(0, 800),
        platform: normalizePlatform(o.platform),
        visual_suggestion: visual.slice(0, 400),
        type,
        image_count:
          Number.isFinite(imageCount) && imageCount > 0
            ? Math.min(10, Math.floor(imageCount))
            : type === 'carrusel'
            ? 4
            : 1,
      };
    })
    .filter((x): x is ContentIdea => x !== null);
}

async function loadProjectContext(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new NotFound('Project not found');

  const [brand, competitors, recentMemories] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { projectId } }),
    prisma.competitor.findMany({
      where: { projectId, status: { in: ['confirmed', 'suggested'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.memory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { project, brand, competitors, recentMemories };
}

function buildPrompt(
  ctx: Awaited<ReturnType<typeof loadProjectContext>>,
  angle: IdeaAngle,
  count: number,
): { systemPrompt: string; userPrompt: string } {
  const { project, brand, competitors, recentMemories } = ctx;

  const systemPrompt =
    'Eres el "Estratega Nexo" de Radikal, experto en contenido digital con acceso a $web_search para verificar tendencias actuales. ' +
    'Tu misión es transformar datos de marca + inteligencia de mercado en ideas de contenido accionables, sustentadas en datos reales. ' +
    'Responde SIEMPRE con JSON crudo, sin bloques markdown, sin texto antes o después.';

  const angleBlock =
    angle === 'auto'
      ? 'Usa el ángulo que consideres más efectivo para cada idea (mezcla educativo, storytelling, venta).'
      : ANGLE_DESCRIPTIONS[angle];

  const brandLines: string[] = [];
  if (brand?.essence) brandLines.push(`- Esencia: ${brand.essence}`);
  if (brand?.voiceTone) brandLines.push(`- Voz/tono: ${brand.voiceTone}`);
  if (brand?.targetAudience) brandLines.push(`- Audiencia: ${brand.targetAudience}`);
  if (brand?.competitiveAdvantage) brandLines.push(`- Ventaja: ${brand.competitiveAdvantage}`);
  if (brand?.brandValues?.length) brandLines.push(`- Valores: ${brand.brandValues.join(', ')}`);

  const competitorLines = competitors
    .slice(0, 5)
    .map((c) => `- ${c.name}${c.website ? ` (${c.website})` : ''}`);

  const memoryLines = recentMemories
    .slice(0, 5)
    .map((m) => `- [${m.category}] ${m.value.slice(0, 180)}`);

  const userPrompt = [
    `CONTEXTO DE LA EMPRESA`,
    project.companyName ? `- Empresa: ${project.companyName}` : null,
    project.industry || project.industryCustom
      ? `- Industria: ${project.industry ?? project.industryCustom}`
      : null,
    project.operatingCountries ? `- Mercados: ${project.operatingCountries}` : null,
    project.businessSummary ? `- Negocio: ${project.businessSummary}` : null,
    project.uniqueValue ? `- Propuesta de valor: ${project.uniqueValue}` : null,
    project.mainProducts ? `- Productos/servicios: ${project.mainProducts}` : null,
    '',
    brandLines.length ? `IDENTIDAD DE MARCA` : null,
    ...brandLines,
    brandLines.length ? '' : null,
    competitorLines.length ? `COMPETENCIA DETECTADA` : null,
    ...competitorLines,
    competitorLines.length ? '' : null,
    memoryLines.length ? `MEMORIAS RECIENTES` : null,
    ...memoryLines,
    memoryLines.length ? '' : null,
    `TAREA`,
    `Genera EXACTAMENTE ${count} ideas de contenido para las próximas 2 semanas.`,
    angleBlock,
    '',
    `REGLAS:`,
    `1. Usa $web_search si necesitas verificar una tendencia actual del sector (últimos 30 días).`,
    `2. Cada idea debe respetar la voz/tono de marca descrita arriba.`,
    `3. description debe tener formato: "Qué: [idea concreta]. Por qué: [dato o insight que la sustenta]."`,
    `4. visual_suggestion describe la imagen ideal (estilo, composición, elementos).`,
    `5. Mezcla ideas tipo "pilar" (1 imagen) y "carrusel" (3-5 imágenes) si ayuda al objetivo.`,
    '',
    `FORMATO DE SALIDA (JSON crudo, nada más):`,
    `{`,
    `  "ideas": [`,
    `    {`,
    `      "title": "Título accionable",`,
    `      "description": "Qué: ... Por qué: ...",`,
    `      "platform": "Instagram|LinkedIn|Twitter|TikTok",`,
    `      "visual_suggestion": "Descripción visual",`,
    `      "type": "pilar|carrusel",`,
    `      "image_count": 1`,
    `    }`,
    `  ]`,
    `}`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { systemPrompt, userPrompt };
}

export const ideationService = {
  async generateIdeas(input: GenerateIdeasInput): Promise<GenerateIdeasOutput> {
    const count = Math.min(MAX_COUNT, Math.max(1, input.count ?? DEFAULT_COUNT));
    const angle: IdeaAngle = input.angle ?? 'auto';

    const ctx = await loadProjectContext(input.projectId, input.userId);
    const { systemPrompt, userPrompt } = buildPrompt(ctx, angle, count);

    const result = await moonshotWebSearch({ systemPrompt, userPrompt });
    if (!result.text.trim()) {
      throw new BadRequest('El motor de ideación devolvió respuesta vacía.');
    }

    let ideas: ContentIdea[] = [];
    try {
      ideas = parseIdeas(result.text);
    } catch (err) {
      logger.warn({ err, preview: result.text.slice(0, 400) }, 'ideation parse failed');
      throw new BadRequest('No se pudieron interpretar las ideas generadas.');
    }

    if (ideas.length === 0) {
      throw new BadRequest('El motor no produjo ideas válidas.');
    }

    return { ideas };
  },
};
