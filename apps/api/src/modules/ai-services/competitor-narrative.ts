import { prisma, Prisma } from '@radikal/db';
import {
  CompetitorNarrativeSchema,
  COMPETITOR_NARRATIVE_VERSION,
  type CompetitorNarrative,
} from '@radikal/shared';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

export interface GenerateNarrativeInput {
  competitorId: string;
  userId: string;
  projectId: string;
}

interface BrandContext {
  name: string;
  industry: string | null;
  summary: string | null;
}

interface CompetitorSnapshot {
  name: string;
  website: string | null;
  socialLinks: Record<string, string> | null;
  webAnalysis: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    insights?: string[];
  } | null;
  engagement: Record<string, unknown> | null;
  topColors: string[];
  topStyleTags: string[];
  topPosts: Array<{
    platform: string;
    caption: string | null;
    likes: number;
    comments: number;
    views: number;
  }>;
}

function parseRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

async function loadSnapshot(competitorId: string): Promise<{
  brand: BrandContext;
  competitor: CompetitorSnapshot;
}> {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      project: true,
      posts: {
        orderBy: { postedAt: 'desc' },
        take: 30,
      },
    },
  });
  if (!competitor) throw new Error(`Competitor ${competitorId} not found`);

  const analysis = parseRecord(competitor.analysisData);
  const webAnalysis = analysis && analysis.web ? parseRecord(analysis.web) : analysis;
  const engagement = parseRecord(competitor.engagementStats);

  const colorCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};
  for (const p of competitor.posts) {
    const va = parseRecord(p.visualAnalysis);
    if (!va) continue;
    const colors = Array.isArray(va.dominant_colors) ? va.dominant_colors : [];
    const tags = Array.isArray(va.style_tags) ? va.style_tags : [];
    for (const c of colors) {
      if (typeof c !== 'string') continue;
      const k = c.toUpperCase();
      colorCount[k] = (colorCount[k] ?? 0) + 1;
    }
    for (const t of tags) {
      if (typeof t !== 'string') continue;
      const k = t.toLowerCase();
      tagCount[k] = (tagCount[k] ?? 0) + 1;
    }
  }
  const topColors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);
  const topStyleTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);

  const topPosts = [...competitor.posts]
    .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3))
    .slice(0, 5)
    .map((p) => ({
      platform: String(p.platform),
      caption: p.caption,
      likes: p.likes,
      comments: p.comments,
      views: p.views,
    }));

  return {
    brand: {
      name: competitor.project.companyName ?? competitor.project.name,
      industry: competitor.project.industry,
      summary: competitor.project.businessSummary,
    },
    competitor: {
      name: competitor.name,
      website: competitor.website,
      socialLinks: parseRecord(competitor.socialLinks) as Record<string, string> | null,
      webAnalysis: webAnalysis
        ? {
            summary: typeof webAnalysis.summary === 'string' ? webAnalysis.summary : undefined,
            strengths: Array.isArray(webAnalysis.strengths)
              ? (webAnalysis.strengths as string[])
              : undefined,
            weaknesses: Array.isArray(webAnalysis.weaknesses)
              ? (webAnalysis.weaknesses as string[])
              : undefined,
            insights: Array.isArray(webAnalysis.insights)
              ? (webAnalysis.insights as string[])
              : undefined,
          }
        : null,
      engagement,
      topColors,
      topStyleTags,
      topPosts,
    },
  };
}

function buildPrompt(brand: BrandContext, comp: CompetitorSnapshot): string {
  const postsBlock =
    comp.topPosts.length > 0
      ? comp.topPosts
          .map(
            (p, i) =>
              `${i + 1}. [${p.platform}] ${p.likes} likes, ${p.comments} comments. Caption: ${p.caption ?? '—'}`,
          )
          .join('\n')
      : 'Sin posts scrapeados.';

  const engagementBlock = comp.engagement
    ? JSON.stringify(comp.engagement, null, 2)
    : 'Sin métricas de engagement.';

  return `Mi marca:
- Nombre: ${brand.name}
- Industria: ${brand.industry ?? '—'}
- Negocio: ${brand.summary ?? '—'}

Competidor a interpretar: ${comp.name}
Web: ${comp.website ?? '—'}
Redes: ${comp.socialLinks ? Object.entries(comp.socialLinks).map(([k, v]) => `${k}=${v}`).join(', ') : '—'}

Análisis web previo:
${comp.webAnalysis ? JSON.stringify(comp.webAnalysis, null, 2) : 'Sin análisis web.'}

Métricas de engagement:
${engagementBlock}

Top posts (ordenados por performance):
${postsBlock}

Colores dominantes (hex): ${comp.topColors.join(', ') || '—'}
Style tags: ${comp.topStyleTags.join(', ') || '—'}

Devuelve SOLO JSON con esta forma exacta:
{
  "summary": "3-4 párrafos interpretando qué es esta marca, qué hace bien, dónde tiene vulnerabilidades. Usa lenguaje humano y específico, no genérico.",
  "aesthetic": "2-3 párrafos describiendo su identidad visual (paleta, estilo fotográfico, tipografía inferida, tono visual). Basado en colores y style tags.",
  "opportunity": "3-5 bullets concretos y accionables de qué PUEDE HACER MI MARCA '${brand.name}' frente a este competidor. Sé específico, no plantillas."
}

No incluyas la clave 'version'. No agregues texto fuera del JSON.`;
}

async function callLLM(prompt: string): Promise<Omit<CompetitorNarrative, 'version'>> {
  const endpoint = env.OPENROUTER_API_KEY
    ? PROVIDER_URLS.openrouter.chatCompletions
    : PROVIDER_URLS.openai.chatCompletions;
  const model = env.OPENROUTER_API_KEY ? LLM_MODELS.chat.openrouter : LLM_MODELS.chat.openai;
  const apiKey = env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Sin LLM configurado (OPENROUTER o OPENAI)');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(env.OPENROUTER_API_KEY
        ? { 'HTTP-Referer': env.WEB_URL, 'X-Title': 'Radikal' }
        : {}),
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content:
            'Eres Sira, analista de inteligencia de marca. Devuelves JSON estricto con interpretaciones concretas y accionables — nunca genéricas.',
        },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text().catch(() => '')}`);
  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    aesthetic: typeof parsed.aesthetic === 'string' ? parsed.aesthetic : '',
    opportunity: typeof parsed.opportunity === 'string' ? parsed.opportunity : '',
  };
}

export class CompetitorNarrativeGenerator {
  async generate(input: GenerateNarrativeInput): Promise<CompetitorNarrative> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'competitor_narrative',
        status: 'running',
        input: { competitorId: input.competitorId },
        projectId: input.projectId,
        userId: input.userId,
      },
    });
    try {
      const { brand, competitor } = await loadSnapshot(input.competitorId);
      const prompt = buildPrompt(brand, competitor);
      const body = await callLLM(prompt);
      const narrative = CompetitorNarrativeSchema.parse({
        version: COMPETITOR_NARRATIVE_VERSION,
        ...body,
      });
      await prisma.competitor.update({
        where: { id: input.competitorId },
        data: {
          narrative: narrative as unknown as Prisma.InputJsonValue,
          narrativeGeneratedAt: new Date(),
        },
      });
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: narrative as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      return narrative;
    } catch (err) {
      logger.error({ err, competitorId: input.competitorId }, 'narrative generation failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId,
          jobKind: 'competitor_narrative',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}

export const competitorNarrativeGenerator = new CompetitorNarrativeGenerator();
