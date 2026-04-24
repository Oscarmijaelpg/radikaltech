import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import {
  PROVIDER_URLS,
  preferredChatEndpoint,
  preferredChatModel,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';

export type TrendMomentum = 'rising' | 'peaking' | 'cooling';
export type TrendCategory = 'content' | 'format' | 'topic' | 'tech';

export interface TrendEvidence {
  type: 'news' | 'competitor_post';
  title: string;
  url: string;
}

export interface DetectedTrend {
  name: string;
  category: TrendCategory;
  momentum: TrendMomentum;
  description: string;
  evidence: TrendEvidence[];
  relevance_score: number; // 0-100
  suggested_action: string;
}

export interface DetectTrendsInput {
  projectId: string;
  userId: string;
}

export interface DetectTrendsResult {
  jobId: string;
  trends: DetectedTrend[];
}

interface TavilyNews {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

async function fetchTavilyNews(query: string, days = 7): Promise<TavilyNews[]> {
  if (!env.TAVILY_API_KEY) return [];
  try {
    const res = await fetch(PROVIDER_URLS.tavily.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        topic: 'news',
        days,
        max_results: 10,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'tavily trending news failed');
      return [];
    }
    const body = (await res.json()) as { results?: TavilyNews[] };
    return body.results ?? [];
  } catch (err) {
    logger.warn({ err }, 'tavily trending error');
    return [];
  }
}

function buildNewsQueries(project: {
  industry: string | null;
  industryCustom: string | null;
  companyName: string | null;
  mainProducts: string | null;
  operatingCountries: string[];
}): string[] {
  const industry = project.industry ?? project.industryCustom ?? '';
  const country = project.operatingCountries?.[0];
  const qs: string[] = [];
  if (industry) qs.push(`tendencias ${industry} ${country ?? ''}`.trim());
  if (industry) qs.push(`innovación ${industry}`);
  if (project.mainProducts) qs.push(`novedades ${project.mainProducts.slice(0, 60)}`);
  if (qs.length === 0) qs.push('tendencias de marketing');
  return qs.slice(0, 3);
}

async function consolidateWithAI(params: {
  brandCtx: string;
  news: TavilyNews[];
  topPosts: Array<{ caption: string | null; platform: string; likes: number; url: string; postType: string | null }>;
}): Promise<DetectedTrend[]> {
  if (!env.OPENROUTER_API_KEY && !env.OPENAI_API_KEY) return [];

  const newsBlock = params.news
    .slice(0, 20)
    .map((n, i) => `[N${i + 1}] ${n.title} | ${n.url}`)
    .join('\n');
  const postsBlock = params.topPosts
    .slice(0, 20)
    .map(
      (p, i) =>
        `[P${i + 1}] ${p.platform} | ${p.postType ?? '-'} | likes=${p.likes} | ${
          (p.caption ?? '').slice(0, 120)
        } | ${p.url}`,
    )
    .join('\n');

  const systemPrompt = `Eres un analista senior de tendencias de marketing y cultura digital. Analizas noticias recientes y posts de alto engagement de competidores para detectar tendencias útiles para una marca concreta. Respondes SOLO JSON.`;

  const userPrompt = `CONTEXTO DE LA MARCA:
${params.brandCtx}

NOTICIAS RECIENTES (últimos 7 días):
${newsBlock || '(sin noticias)'}

POSTS VIRALES DE COMPETIDORES (últimos 30 días, top engagement):
${postsBlock || '(sin posts)'}

Devuelve SOLO JSON con estructura:
{
  "trends": [
    {
      "name": "nombre corto de la tendencia",
      "category": "content" | "format" | "topic" | "tech",
      "momentum": "rising" | "peaking" | "cooling",
      "description": "1-2 frases en español",
      "evidence": [ { "type": "news"|"competitor_post", "title": "...", "url": "..." } ],
      "relevance_score": 0-100,
      "suggested_action": "qué podría hacer ESTA marca concretamente"
    }
  ]
}

Reglas:
- 4 a 8 tendencias.
- Prioriza tendencias realmente relevantes a la marca (relevance_score alto).
- evidence: al menos 1 item citando URLs reales del input (N1..Nn o P1..Pn deben mapear a títulos/urls reales).
- JSON válido, nada más.`;

  const url = preferredChatEndpoint();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY}`,
  };
  if (env.OPENROUTER_API_KEY) {
    headers['HTTP-Referer'] = env.WEB_URL;
    headers['X-Title'] = 'Radikal';
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: preferredChatModel(),
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'trending ai failed');
      return [];
    }
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { trends?: unknown };
    if (!Array.isArray(parsed.trends)) return [];
    const validCats: TrendCategory[] = ['content', 'format', 'topic', 'tech'];
    const validMom: TrendMomentum[] = ['rising', 'peaking', 'cooling'];
    const out: DetectedTrend[] = [];
    for (const t of parsed.trends) {
      if (!t || typeof t !== 'object') continue;
      const tt = t as Record<string, unknown>;
      const name = typeof tt.name === 'string' ? tt.name : '';
      if (!name) continue;
      const category = validCats.includes(tt.category as TrendCategory)
        ? (tt.category as TrendCategory)
        : 'topic';
      const momentum = validMom.includes(tt.momentum as TrendMomentum)
        ? (tt.momentum as TrendMomentum)
        : 'rising';
      const evidence = Array.isArray(tt.evidence)
        ? (tt.evidence as Array<Record<string, unknown>>)
            .map((e) => ({
              type:
                e.type === 'news' || e.type === 'competitor_post'
                  ? (e.type as 'news' | 'competitor_post')
                  : 'news',
              title: String(e.title ?? ''),
              url: String(e.url ?? ''),
            }))
            .filter((e) => e.title && e.url)
            .slice(0, 5)
        : [];
      out.push({
        name: name.slice(0, 120),
        category,
        momentum,
        description: String(tt.description ?? '').slice(0, 400),
        evidence,
        relevance_score: Math.max(
          0,
          Math.min(100, Math.round(Number(tt.relevance_score ?? 50))),
        ),
        suggested_action: String(tt.suggested_action ?? '').slice(0, 400),
      });
      if (out.length >= 8) break;
    }
    return out;
  } catch (err) {
    logger.warn({ err }, 'trending ai parse failed');
    return [];
  }
}

export class TrendingFinder {
  async detect(input: DetectTrendsInput): Promise<DetectTrendsResult> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'trending_detect',
        status: 'running',
        input: { project_id: input.projectId } as unknown as Prisma.InputJsonValue,
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      const project = await prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new Error('Project not found');
      const brand = await prisma.brandProfile.findUnique({
        where: { projectId: input.projectId },
      });

      const queries = buildNewsQueries({
        industry: project.industry,
        industryCustom: project.industryCustom,
        companyName: project.companyName,
        mainProducts: project.mainProducts,
        operatingCountries: project.operatingCountries,
      });

      const newsResults = await Promise.all(queries.map((q) => fetchTavilyNews(q, 7)));
      const news = newsResults.flat();

      // Dedupe news by url
      const seen = new Set<string>();
      const uniqueNews = news.filter((n) => {
        if (seen.has(n.url)) return false;
        seen.add(n.url);
        return true;
      });

      // top competitor posts (last 30 days, highest engagement)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const posts = await prisma.socialPost.findMany({
        where: {
          projectId: input.projectId,
          postedAt: { gte: thirtyDaysAgo },
        },
        orderBy: [{ likes: 'desc' }, { views: 'desc' }],
        take: 20,
      });

      const brandCtx = [
        project.companyName && `Marca: ${project.companyName}`,
        (project.industry || project.industryCustom) &&
          `Industria: ${project.industry ?? project.industryCustom}`,
        project.businessSummary && `Negocio: ${project.businessSummary.slice(0, 300)}`,
        project.uniqueValue && `Valor único: ${project.uniqueValue.slice(0, 200)}`,
        project.mainProducts && `Productos: ${project.mainProducts.slice(0, 200)}`,
        project.operatingCountries.length > 0 &&
          `Opera en: ${project.operatingCountries.join(', ')}`,
        brand?.voiceTone && `Voz/tono: ${brand.voiceTone}`,
        brand?.essence && `Esencia: ${brand.essence.slice(0, 200)}`,
      ]
        .filter(Boolean)
        .join('\n');

      const trends = await consolidateWithAI({
        brandCtx: brandCtx || '(sin contexto de marca)',
        news: uniqueNews,
        topPosts: posts.map((p) => ({
          caption: p.caption,
          platform: p.platform,
          likes: p.likes,
          url: p.postUrl,
          postType: p.postType,
        })),
      });

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: { trends } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return { jobId: job.id, trends };
    } catch (err) {
      logger.error({ err }, 'trending finder failed');
      await prisma.aiJob
        .update({
          where: { id: job.id },
          data: { status: 'failed', error: String(err), finishedAt: new Date() },
        })
        .catch(() => {});
      throw err;
    }
  }
}
