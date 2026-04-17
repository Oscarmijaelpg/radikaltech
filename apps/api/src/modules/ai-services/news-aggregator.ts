import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

export interface NewsItem {
  title: string;
  url: string;
  source?: string;
  published_at?: string;
  summary?: string;
}

export interface EnrichedNewsItem {
  original_index: number;
  title: string;
  url: string;
  source?: string;
  source_authority: number;
  relevance_score: number;
  relevance_reason: string;
  cluster_id?: string;
  cluster_size?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface NewsAnalysis {
  narrative: string; // texto corrido con citas [1][2] etc.
  executive_summary: string;
  top_themes: Array<{ name: string; count: number; description: string }>;
  overall_sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  per_item_sentiment: Record<string, 'positive' | 'neutral' | 'negative'>;
  key_insights: string[];
  trending_keywords: string[];
  items_enriched?: EnrichedNewsItem[];
}

const AUTHORITY: Record<string, number> = {
  'reuters.com': 95,
  'bloomberg.com': 95,
  'nytimes.com': 90,
  'wsj.com': 90,
  'ft.com': 90,
  'economist.com': 88,
  'forbes.com': 80,
  'fortune.com': 85,
  'cnbc.com': 82,
  'bbc.com': 90,
  'theguardian.com': 85,
  'techcrunch.com': 75,
  'wired.com': 75,
  'theverge.com': 75,
  'wikipedia.org': 70,
  'medium.com': 55,
  'substack.com': 55,
  'linkedin.com': 50,
  'facebook.com': 40,
  'twitter.com': 40,
  'x.com': 40,
};

function computeAuthority(host: string | undefined): number {
  if (!host) return 55;
  const h = host.toLowerCase();
  // exact match
  if (AUTHORITY[h] !== undefined) return AUTHORITY[h]!;
  // match without subdomain
  for (const [dom, score] of Object.entries(AUTHORITY)) {
    if (h === dom || h.endsWith(`.${dom}`)) return score;
  }
  let score = 55;
  if (h.includes('news') || h.includes('press') || h.includes('times')) score += 5;
  if (h.endsWith('.edu')) score += 15;
  if (h.endsWith('.gov')) score += 15;
  return Math.min(100, score);
}

function tokenize(s: string): Set<string> {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'are',
    'was', 'were', 'but', 'not', 'you', 'your', 'their', 'them', 'about',
    'over', 'into', 'after', 'before', 'de', 'la', 'el', 'los', 'las', 'un',
    'una', 'unos', 'unas', 'por', 'para', 'con', 'sin', 'que', 'como', 'y',
    'o', 'en', 'a', 'al', 'del', 'es', 'son', 'fue', 'ser', 'se', 'lo',
  ]);
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w)),
  );
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function clusterItems(items: NewsItem[]): Array<{ clusterId: string; size: number }> {
  const tokens = items.map((it) => tokenize(it.title ?? ''));
  const assignments: number[] = new Array(items.length).fill(-1);
  const clusterIds: string[] = [];
  let next = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (assignments[i] !== -1) continue;
    const id = `cluster-${++next}`;
    clusterIds.push(id);
    assignments[i] = clusterIds.length - 1;
    for (let j = i + 1; j < items.length; j += 1) {
      if (assignments[j] !== -1) continue;
      const sim = jaccardSim(tokens[i]!, tokens[j]!);
      if (sim > 0.6) assignments[j] = clusterIds.length - 1;
    }
  }
  const sizes: Record<number, number> = {};
  for (const a of assignments) sizes[a] = (sizes[a] ?? 0) + 1;
  return assignments.map((idx) => ({
    clusterId: clusterIds[idx]!,
    size: sizes[idx] ?? 1,
  }));
}

export interface ProjectContext {
  company_name?: string | null;
  industry?: string | null;
  business_summary?: string | null;
  unique_value?: string | null;
  main_products?: string | null;
  operating_countries?: string[];
}

export interface NewsResult {
  topic: string;
  items: NewsItem[];
  analysis?: NewsAnalysis;
}

export interface AggregateNewsInput {
  topic: string;
  userId: string;
  projectId?: string;
}

export interface AggregateNewsOutput {
  jobId: string;
  result: NewsResult;
  report?: {
    id: string;
    title: string;
    summary: string | null;
    createdAt: Date;
  };
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function buildEnhancedQuery(topic: string, ctx: ProjectContext | null): string {
  if (!ctx) return topic;
  const bits: string[] = [topic];
  if (ctx.industry) bits.push(`sector ${ctx.industry}`);
  if (ctx.operating_countries && ctx.operating_countries.length > 0) {
    bits.push(ctx.operating_countries.join(' '));
  }
  // Añadir palabras clave del business_summary (primeras 5 palabras significativas)
  if (ctx.business_summary) {
    const keywords = ctx.business_summary
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/[.,;:]/.test(w))
      .slice(0, 5)
      .join(' ');
    if (keywords) bits.push(keywords);
  }
  return bits.join(' ');
}

interface AnalyzeAIResult {
  analysis: NewsAnalysis;
  per_item_relevance: Record<string, { score: number; reason: string }>;
}

async function analyzeNewsWithAI(
  topic: string,
  items: NewsItem[],
  ctx: ProjectContext | null,
): Promise<AnalyzeAIResult | null> {
  if (!env.OPENROUTER_API_KEY || items.length < 3) return null;

  const context = items
    .map(
      (it, i) =>
        `[${i + 1}] ${it.title ?? ''} | ${it.source ?? ''} | ${(it.summary ?? '').slice(0, 280)} | ${it.url}`,
    )
    .join('\n');

  const brandContext = ctx
    ? [
        ctx.company_name && `Marca: "${ctx.company_name}"`,
        ctx.industry && `Industria: ${ctx.industry}`,
        ctx.business_summary && `Negocio: ${ctx.business_summary.slice(0, 400)}`,
        ctx.unique_value && `Valor único: ${ctx.unique_value.slice(0, 200)}`,
        ctx.main_products && `Productos: ${ctx.main_products.slice(0, 200)}`,
        ctx.operating_countries?.length && `Opera en: ${ctx.operating_countries.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '(sin contexto de marca — análisis genérico)';

  const systemPrompt = `Eres un analista senior de tendencias e inteligencia competitiva. Analizas noticias SIEMPRE en el contexto específico de una marca. Devuelves SOLO JSON válido.

REGLAS de escritura para "narrative":
- 200-350 palabras en español.
- ES LO MÁS IMPORTANTE: escribe un análisis corrido (3-5 párrafos) en ESPAÑOL que explique qué está pasando y QUÉ IMPLICA PARA LA MARCA específica.
- CITA fuentes inline usando notación [N] donde N es el índice de la noticia (1-based). Ej: "El mercado de delivery creció 22% [2][5], pero la regulación sanitaria se endureció [1]."
- Cada afirmación importante debe llevar al menos una cita [N].
- NO incluyas URLs directas en el texto, solo los [N].
- Conecta los hallazgos con la marca del usuario concretamente.`;

  const userPrompt = `CONTEXTO DE LA MARCA:
${brandContext}

TEMA CONSULTADO: "${topic}"

NOTICIAS ENCONTRADAS (formato [índice] título | source | summary | url):
${context}

Devuelve SOLO JSON con:
- narrative: análisis 200-350 palabras EN ESPAÑOL sobre qué pasa y qué significa para ESTA marca específica. Usa citas [N] inline (índices 1..${items.length}).
- executive_summary: 2-3 frases que resumen el narrative (sin citas).
- top_themes: array 3-5 objetos { name, count, description }.
- overall_sentiment: "positive" | "neutral" | "negative".
- sentiment_breakdown: { positive: N, neutral: N, negative: N } suma = ${items.length}.
- per_item_sentiment: objeto que mapea cada URL del listado al sentiment individual.
- per_item_relevance: objeto que mapea cada URL a { score: 0-100, reason: string corto en español explicando por qué es o no relevante para ESTA marca específica }.
- key_insights: 3-5 bullets accionables ESPECÍFICOS para esta marca (no genéricos).
- trending_keywords: 5-10 palabras clave del sector.

Devuelve SOLO JSON válido.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'openrouter news analysis failed');
      return null;
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as Partial<NewsAnalysis> & {
      per_item_relevance?: Record<string, { score?: number; reason?: string }>;
    };

    const sb = parsed.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 };
    const validSentiments: Array<'positive' | 'neutral' | 'negative'> = [
      'positive',
      'neutral',
      'negative',
    ];
    const overall = validSentiments.includes(parsed.overall_sentiment as 'positive')
      ? (parsed.overall_sentiment as 'positive' | 'neutral' | 'negative')
      : 'neutral';

    const per_item_relevance: Record<string, { score: number; reason: string }> = {};
    if (parsed.per_item_relevance && typeof parsed.per_item_relevance === 'object') {
      for (const [url, v] of Object.entries(parsed.per_item_relevance)) {
        const score = Math.max(0, Math.min(100, Number(v?.score ?? 50)));
        per_item_relevance[url] = {
          score: isFinite(score) ? score : 50,
          reason: typeof v?.reason === 'string' ? v.reason.slice(0, 280) : '',
        };
      }
    }

    const analysis: NewsAnalysis = {
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '',
      executive_summary: typeof parsed.executive_summary === 'string' ? parsed.executive_summary : '',
      top_themes: Array.isArray(parsed.top_themes)
        ? parsed.top_themes.slice(0, 5).map((t) => ({
            name: String(t?.name ?? ''),
            count: Number(t?.count ?? 0),
            description: String(t?.description ?? ''),
          }))
        : [],
      overall_sentiment: overall,
      sentiment_breakdown: {
        positive: Number(sb.positive ?? 0),
        neutral: Number(sb.neutral ?? 0),
        negative: Number(sb.negative ?? 0),
      },
      per_item_sentiment:
        parsed.per_item_sentiment && typeof parsed.per_item_sentiment === 'object'
          ? (parsed.per_item_sentiment as Record<string, 'positive' | 'neutral' | 'negative'>)
          : {},
      key_insights: Array.isArray(parsed.key_insights)
        ? parsed.key_insights.filter((s): s is string => typeof s === 'string').slice(0, 5)
        : [],
      trending_keywords: Array.isArray(parsed.trending_keywords)
        ? parsed.trending_keywords.filter((s): s is string => typeof s === 'string').slice(0, 10)
        : [],
    };
    return { analysis, per_item_relevance };
  } catch (err) {
    logger.warn({ err }, 'news ai analysis failed');
    return null;
  }
}

function enrichItems(
  items: NewsItem[],
  perItemSentiment: Record<string, 'positive' | 'neutral' | 'negative'>,
  perItemRelevance: Record<string, { score: number; reason: string }>,
): EnrichedNewsItem[] {
  const clusters = clusterItems(items);
  return items.map((it, idx) => {
    const host = it.source ?? (it.url ? (() => { try { return new URL(it.url).hostname.replace(/^www\./, ''); } catch { return undefined; } })() : undefined);
    const rel = it.url ? perItemRelevance[it.url] : undefined;
    const sent = (it.url ? perItemSentiment[it.url] : undefined) ?? 'neutral';
    return {
      original_index: idx,
      title: it.title ?? '',
      url: it.url,
      source: it.source,
      source_authority: computeAuthority(host),
      relevance_score: rel?.score ?? 50,
      relevance_reason: rel?.reason ?? '',
      cluster_id: clusters[idx]?.clusterId,
      cluster_size: clusters[idx]?.size ?? 1,
      sentiment: sent,
    };
  });
}

export class NewsAggregator {
  async aggregate(input: AggregateNewsInput): Promise<AggregateNewsOutput> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'news_aggregate',
        status: 'running',
        input: { topic: input.topic },
        projectId: input.projectId,
        userId: input.userId,
      },
    });

    try {
      let items: NewsItem[] = [];

      // Cargar contexto de la marca si hay projectId
      let projectCtx: ProjectContext | null = null;
      if (input.projectId) {
        try {
          const p = await prisma.project.findUnique({ where: { id: input.projectId } });
          if (p) {
            projectCtx = {
              company_name: p.companyName,
              industry: p.industry ?? p.industryCustom,
              business_summary: p.businessSummary,
              unique_value: p.uniqueValue,
              main_products: p.mainProducts,
              operating_countries:
                p.operatingCountries.length > 0 ? p.operatingCountries : p.operatingCountriesSuggested,
            };
          }
        } catch (err) {
          logger.warn({ err }, 'failed to load project context for news');
        }
      }

      const enhancedQuery = buildEnhancedQuery(input.topic, projectCtx);
      logger.info({ original: input.topic, enhanced: enhancedQuery }, 'news query enhanced with brand context');

      if (env.TAVILY_API_KEY) {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query: enhancedQuery,
            topic: 'news',
            days: 21,
            max_results: 12,
            include_answer: false,
          }),
          signal: AbortSignal.timeout(25_000),
        });
        if (res.ok) {
          const body = (await res.json()) as {
            results: Array<{ title: string; url: string; content: string; published_date?: string }>;
          };
          items = body.results.map((r) => ({
            title: r.title,
            url: r.url,
            source: hostnameOf(r.url),
            published_at: r.published_date,
            summary: r.content?.slice(0, 280),
          }));
        } else {
          logger.warn({ status: res.status }, 'tavily news failed');
        }
      } else {
        logger.warn('TAVILY_API_KEY not set');
      }

      const aiResult = await analyzeNewsWithAI(input.topic, items, projectCtx);
      let analysis: NewsAnalysis | undefined = aiResult?.analysis;
      const perItemRelevance = aiResult?.per_item_relevance ?? {};
      if (items.length > 0) {
        const sentMap = analysis?.per_item_sentiment ?? {};
        const enriched = enrichItems(items, sentMap, perItemRelevance);
        if (!analysis) {
          // fallback: still provide enriched even without AI
          analysis = {
            narrative: '',
            executive_summary: '',
            top_themes: [],
            overall_sentiment: 'neutral',
            sentiment_breakdown: { positive: 0, neutral: items.length, negative: 0 },
            per_item_sentiment: {},
            key_insights: [],
            trending_keywords: [],
            items_enriched: enriched,
          };
        } else {
          analysis.items_enriched = enriched;
        }
      }
      const result: NewsResult = { topic: input.topic, items, analysis };

      let report: AggregateNewsOutput['report'];
      if (input.projectId) {
        try {
          const fallbackSummary = items
            .slice(0, 3)
            .map((it, i) => `${i + 1}. ${it.title}${it.source ? ` — ${it.source}` : ''}`)
            .join('\n');

          const contentMd = analysis?.narrative
            ? analysis.narrative
            : analysis?.executive_summary
              ? analysis.executive_summary
              : JSON.stringify(items);

          const summaryText = analysis?.executive_summary
            ? analysis.executive_summary.slice(0, 600)
            : fallbackSummary || null;

          const keyInsights = analysis?.key_insights ?? [];

          const sourceDataPayload: Prisma.InputJsonValue = analysis
            ? ({ items, analysis } as unknown as Prisma.InputJsonValue)
            : (items as unknown as Prisma.InputJsonValue);

          const created = await prisma.report.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              title: `Noticias: ${input.topic}`,
              reportType: 'news',
              content: contentMd,
              summary: summaryText,
              keyInsights,
              sourceData: sourceDataPayload,
            },
          });
          report = {
            id: created.id,
            title: created.title,
            summary: created.summary,
            createdAt: created.createdAt,
          };
        } catch (err) {
          logger.warn({ err }, 'failed to persist news report');
        }
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: { ...result, reportId: report?.id } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      return { jobId: job.id, result, report };
    } catch (err) {
      logger.error({ err }, 'news aggregator failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId ?? null,
          jobKind: 'news_aggregate',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
