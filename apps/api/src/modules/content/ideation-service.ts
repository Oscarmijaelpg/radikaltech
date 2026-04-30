import { prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { preferredChatEndpoint, preferredChatModel } from '../../config/providers.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { moonshotWebSearch, stripJsonWrapping } from '../ai-services/moonshot.js';

export type IdeaAngle = 'educativo' | 'entretenimiento' | 'venta' | 'storytelling' | 'auto';

export interface GenerateIdeasInput {
  projectId: string;
  userId: string;
  angle?: IdeaAngle;
  count?: number;
  source?: 'competition' | 'news';
}

export interface ContentIdea {
  title: string;
  description: string;
  platform: 'Instagram' | 'LinkedIn' | 'Twitter' | 'TikTok';
  visual_suggestion: string;
  type: 'post' | 'carrusel' | 'historia';
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
  const t = String(v ?? '').toLowerCase();
  return ['carrusel', 'historia'].includes(t) ? (t as 'carrusel' | 'historia') : 'post';
}

function parseIdeas(raw: string): ContentIdea[] {
  const clean = stripJsonWrapping(raw);
  const parsed = JSON.parse(clean) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { ideas?: unknown[] })?.ideas)
    ? (parsed as { ideas: unknown[] }).ideas
    : null;
  if (!list) throw new BadRequest('formato inesperado: esperaba array de ideas');
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

async function loadProjectContext(projectId: string, userId: string, source?: 'competition' | 'news') {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new NotFound('Project not found');

  const [brand, reports, recentMemories] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { projectId } }),
    prisma.report.findMany({
      where: { 
        projectId, 
        ...(source === 'competition' ? { reportType: { in: ['competition', 'monthly_audit'] } } : source === 'news' ? { reportType: 'news' } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.memory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { project, brand, reports, recentMemories };
}

function buildPrompt(
  ctx: Awaited<ReturnType<typeof loadProjectContext>>,
  angle: IdeaAngle,
  count: number,
  source?: 'competition' | 'news'
): { systemPrompt: string; userPrompt: string } {
  const { project, brand, reports, recentMemories } = ctx;

  const systemPrompt =
    'Eres el "Estratega Nexo" de Radikal, experto en contenido digital con acceso a $web_search para verificar tendencias actuales. ' +
    'Tu misión es transformar datos de marca + inteligencia de mercado en ideas de contenido accionables, sustentadas en datos reales. ' +
    'CRÍTICO: Tu respuesta FINAL DEBE ser ÚNICAMENTE el JSON con las ideas. ' +
    'No imprimas las queries de búsqueda ni tus razonamientos intermedios en el mensaje final. ' +
    'Máximo 2 búsquedas con $web_search — ya tienes todo el contexto de marca en el prompt. ' +
    'El mensaje final DEBE empezar con `{` y terminar con `}`.';

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

  const reportLines = reports
    .map((r) => `- [${r.title}] ${r.summary ? r.summary.slice(0, 500) : ''} \n${r.keyInsights?.slice(0, 3).map((ki: string) => `  * ${ki}`).join('\n')}`);

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
    reportLines.length ? `REPORTES DE ANÁLISIS ${source ? `(${source === 'competition' ? 'COMPETENCIA' : 'NOTICIAS'})` : 'ESTRATÉGICOS'}` : null,
    ...reportLines,
    reportLines.length ? '' : null,
    !source && memoryLines.length ? `MEMORIAS RECIENTES` : null,
    ...(!source ? memoryLines : []),
    !source && memoryLines.length ? '' : null,
    `TAREA`,
    `Genera EXACTAMENTE ${count} ideas de contenido para las próximas 2 semanas.`,
    angleBlock,
    '',
    `REGLAS:`,
    `1. MÁXIMO 2 búsquedas con $web_search para verificar 1-2 tendencias actuales del sector (últimos 30 días). Menos es mejor.`,
    `2. DESPUÉS de las búsquedas (o sin búsquedas si no son necesarias), devuelve INMEDIATAMENTE el JSON final con las ideas.`,
    `3. Cada idea debe respetar la voz/tono de marca descrita arriba.`,
    `4. description debe tener formato: "Qué: [idea concreta]. Por qué: [dato o insight que la sustenta]."`,
    `5. visual_suggestion describe la imagen ideal (estilo, composición, elementos).`,
    `6. Mezcla ideas tipo "post" (formato cuadrado 1:1), "carrusel" (3-5 imágenes) y "historia" (formato vertical 9:16).`,
    '',
    `FORMATO DE SALIDA (JSON crudo, nada más):`,
    `{`,
    `  "ideas": [`,
    `    {`,
    `      "title": "Un título gancho de máx 50 caracteres",`,
    `      "description": "Qué mostrar y por qué, detallado y persuasivo (máx 200 caracteres)",`,
    `      "visual_suggestion": "Instrucción exacta para el fotógrafo / IA de qué debe verse en la imagen",`,
    `      "platform": "Instagram|LinkedIn|TikTok",`,
    `      "type": "post|carrusel|historia",`,
    `      "image_count": 1`,
    `    }`,
    `  ]`,
    `}`
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { systemPrompt, userPrompt };
}

function looksLikeToolCallEcho(text: string): boolean {
  const trimmed = text.trim().slice(0, 50).toLowerCase();
  return trimmed.startsWith('$web_search') || trimmed.startsWith('{"queries"');
}

async function fallbackComposeIdeasWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  count: number,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new BadRequest('OPENAI_API_KEY / OPENROUTER_API_KEY no configurado para fallback');
  }
  const endpoint = preferredChatEndpoint();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (env.OPENROUTER_API_KEY) {
    headers['HTTP-Referer'] = env.WEB_URL;
    headers['X-Title'] = 'Radikal';
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: preferredChatModel(),
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            systemPrompt +
            ' IMPORTANTE: NO uses búsqueda web. Usa solo el contexto que te paso. Devuelve SOLO el JSON.',
        },
        {
          role: 'user',
          content: `${userPrompt}\n\nRECUERDA: genera ${count} ideas y responde SOLO con el JSON {"ideas":[...]}.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new BadRequest(`fallback LLM ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

export const ideationService = {
  async generateIdeas(input: GenerateIdeasInput): Promise<GenerateIdeasOutput> {
    const count = Math.min(MAX_COUNT, Math.max(1, input.count ?? DEFAULT_COUNT));
    const angle: IdeaAngle = input.angle ?? 'auto';

    const ctx = await loadProjectContext(input.projectId, input.userId, input.source);
    const { systemPrompt, userPrompt } = buildPrompt(ctx, angle, count, input.source);

    const primary = await moonshotWebSearch({
      systemPrompt,
      userPrompt,
      maxIterations: 8,
    });

    let rawText = primary.text.trim();

    if (!rawText || looksLikeToolCallEcho(rawText)) {
      logger.warn(
        { iterations: primary.iterations, toolCalls: primary.toolCallsMade },
        'ideation primary returned tool-call echo, retrying with JSON-only fallback',
      );
      try {
        rawText = (await fallbackComposeIdeasWithOpenAI(systemPrompt, userPrompt, count)).trim();
      } catch (err) {
        logger.warn({ err }, 'ideation fallback LLM failed');
        throw new BadRequest(
          'La IA se quedó buscando tendencias y no compuso las ideas a tiempo. Reintenta en unos segundos.',
        );
      }
    }

    if (!rawText) {
      throw new BadRequest('El motor de ideación devolvió respuesta vacía.');
    }

    let ideas: ContentIdea[] = [];
    try {
      ideas = parseIdeas(rawText);
    } catch (err) {
      logger.warn({ err, preview: rawText.slice(0, 400) }, 'ideation parse failed');
      throw new BadRequest(
        'No se pudieron interpretar las ideas generadas por la IA. Intenta con otro ángulo o de nuevo.',
      );
    }

    if (ideas.length === 0) {
      throw new BadRequest('El motor no produjo ideas válidas.');
    }

    // Persistir las ideas en la memoria del proyecto
    try {
      const memoryKey = 'latest_ideas';
      const memoryCategory = 'ideation';
      const existing = await prisma.memory.findFirst({
        where: { projectId: input.projectId, category: memoryCategory, key: memoryKey },
      });

      if (existing) {
        await prisma.memory.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(ideas) },
        });
      } else {
        await prisma.memory.create({
          data: {
            projectId: input.projectId,
            userId: input.userId,
            category: memoryCategory,
            key: memoryKey,
            value: JSON.stringify(ideas),
          },
        });
      }
    } catch (err) {
      logger.error({ err }, 'failed to save latest ideas to memory');
      // No bloqueamos el retorno si falla la persistencia
    }

    return { ideas };
  },
};
