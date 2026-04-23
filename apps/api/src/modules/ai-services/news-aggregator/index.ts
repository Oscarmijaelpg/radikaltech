import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { notificationService } from '../../notifications/service.js';
import { moonshotWebSearch, stripJsonWrapping } from '../moonshot.js';
import { hostnameOf } from './authority.js';
import { enrichItems } from './enricher.js';
import type {
  AggregateNewsInput,
  AggregateNewsOutput,
  NewsAnalysis,
  NewsItem,
  NewsResult,
  ProjectContext,
} from './types.js';

export type {
  AggregateNewsInput,
  AggregateNewsOutput,
  EnrichedNewsItem,
  NewsAnalysis,
  NewsItem,
  NewsResult,
  ProjectContext,
} from './types.js';

const FALLBACK_PREVIEW_ITEMS = 3;
const REPORT_SUMMARY_MAX_CHARS = 600;

const SYSTEM_PROMPT = `Eres analista senior en inteligencia competitiva y monitoreo sectorial.
Tienes acceso a la web mediante la herramienta $web_search y DEBES usarla para encontrar noticias REALES con URL verificable.

Reglas estrictas:
- Está PROHIBIDO inventar URLs, titulares, medios o fechas.
- Cada noticia debe tener una URL real devuelta por $web_search.
- Prefiere noticias de los últimos 12 meses.
- Si no hay suficientes resultados, devuelve menos pero todas reales — calidad > cantidad.

Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin markdown fences, sin comentarios.
Empieza con { y termina con }.`;

interface KimiNewsItemRaw {
  title?: unknown;
  url?: unknown;
  source?: unknown;
  published_at?: unknown;
  summary?: unknown;
  sentiment?: unknown;
  relevance_score?: unknown;
  relevance_reason?: unknown;
}

interface KimiNewsResponseRaw {
  items?: unknown;
  narrative?: unknown;
  executive_summary?: unknown;
  key_insights?: unknown;
  trending_keywords?: unknown;
  top_themes?: unknown;
  overall_sentiment?: unknown;
}

async function fetchProjectContext(
  projectId: string | undefined,
): Promise<ProjectContext | null> {
  if (!projectId) return null;
  try {
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) return null;
    return {
      company_name: p.companyName,
      industry: p.industry ?? p.industryCustom,
      business_summary: p.businessSummary,
      unique_value: p.uniqueValue,
      main_products: p.mainProducts,
      operating_countries:
        p.operatingCountries.length > 0 ? p.operatingCountries : p.operatingCountriesSuggested,
    };
  } catch (err) {
    logger.warn({ err }, 'failed to load project context for news');
    return null;
  }
}

function buildUserPrompt(topic: string, ctx: ProjectContext | null): string {
  const lines: string[] = [];
  if (ctx) {
    lines.push('CONTEXTO DE LA EMPRESA');
    if (ctx.company_name) lines.push(`- Nombre: ${ctx.company_name}`);
    if (ctx.industry) lines.push(`- Industria: ${ctx.industry}`);
    if (ctx.operating_countries && ctx.operating_countries.length > 0) {
      lines.push(`- Países operativos: ${ctx.operating_countries.join(', ')}`);
    }
    if (ctx.business_summary) lines.push(`- Resumen: ${ctx.business_summary}`);
    if (ctx.main_products) lines.push(`- Productos: ${ctx.main_products}`);
    if (ctx.unique_value) lines.push(`- Propuesta de valor: ${ctx.unique_value}`);
    lines.push('');
  }
  lines.push(
    'TAREA',
    `Busca con $web_search noticias estratégicas sobre: "${topic}".`,
    'Enfócate en cambios regulatorios, tecnología, competencia, inversiones, crecimiento o comportamiento del consumidor que afecten al sector descrito en el contexto.',
    'Devuelve entre 6 y 10 noticias clave (mínimo 3, todas con URL real).',
    '',
    'FORMATO DE SALIDA (JSON estricto, sin markdown fences):',
    '{',
    '  "items": [',
    '    {',
    '      "title": "Titular de la noticia",',
    '      "url": "URL real devuelta por $web_search",',
    '      "source": "nombre del medio (Reuters, Forbes, El Tiempo...)",',
    '      "published_at": "YYYY-MM-DD si lo conoces",',
    '      "summary": "2-3 frases en español que expliquen la noticia y por qué importa al sector",',
    '      "sentiment": "positive | neutral | negative",',
    '      "relevance_score": 0-100,',
    '      "relevance_reason": "1 frase concreta de por qué es relevante para esta empresa"',
    '    }',
    '  ],',
    '  "executive_summary": "1 párrafo de máximo 280 caracteres con la conclusión ejecutiva del bloque de noticias.",',
    '  "narrative": "Análisis en Markdown (3-6 párrafos) que conecta las noticias en una narrativa estratégica para la empresa. Usa títulos ## y citas con [titular](url) cuando referencies.",',
    '  "key_insights": ["3-5 insights accionables, en una frase cada uno"],',
    '  "trending_keywords": ["5-10 keywords relevantes del momento"],',
    '  "top_themes": [{ "name": "tema", "count": N, "description": "1 frase" }],',
    '  "overall_sentiment": "positive | neutral | negative"',
    '}',
  );
  return lines.join('\n');
}

function asTrimmedString(v: unknown, max = 500): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

function asNumberInRange(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

function asSentiment(v: unknown): 'positive' | 'neutral' | 'negative' {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  if (s === 'positive' || s === 'negative') return s;
  return 'neutral';
}

function parseKimiNewsJson(text: string): {
  items: NewsItem[];
  perItemSentiment: Record<string, 'positive' | 'neutral' | 'negative'>;
  perItemRelevance: Record<string, { score: number; reason: string }>;
  partial: Partial<NewsAnalysis>;
} {
  const clean = stripJsonWrapping(text);
  let parsed: KimiNewsResponseRaw | unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    logger.warn({ err, snippet: clean.slice(0, 300) }, 'failed to parse Kimi news JSON');
    return { items: [], perItemSentiment: {}, perItemRelevance: {}, partial: {} };
  }

  const root = parsed as KimiNewsResponseRaw;
  const rawItems = Array.isArray(root?.items) ? (root.items as unknown[]) : [];
  const items: NewsItem[] = [];
  const perItemSentiment: Record<string, 'positive' | 'neutral' | 'negative'> = {};
  const perItemRelevance: Record<string, { score: number; reason: string }> = {};

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as KimiNewsItemRaw;
    const url = asTrimmedString(r.url, 800);
    const title = asTrimmedString(r.title, 400);
    if (!url || !title) continue;
    const source = asTrimmedString(r.source, 120) ?? hostnameOf(url);
    const item: NewsItem = {
      title,
      url,
      source,
      published_at: asTrimmedString(r.published_at, 40),
      summary: asTrimmedString(r.summary, 600),
    };
    items.push(item);
    perItemSentiment[url] = asSentiment(r.sentiment);
    const score = asNumberInRange(r.relevance_score, 0, 100);
    if (score !== undefined) {
      perItemRelevance[url] = {
        score,
        reason: asTrimmedString(r.relevance_reason, 200) ?? '',
      };
    }
  }

  const partial: Partial<NewsAnalysis> = {
    narrative: asTrimmedString(root.narrative, 8000) ?? '',
    executive_summary: asTrimmedString(root.executive_summary, REPORT_SUMMARY_MAX_CHARS) ?? '',
    key_insights: Array.isArray(root.key_insights)
      ? (root.key_insights as unknown[])
          .map((k) => asTrimmedString(k, 280))
          .filter((k): k is string => !!k)
      : [],
    trending_keywords: Array.isArray(root.trending_keywords)
      ? (root.trending_keywords as unknown[])
          .map((k) => asTrimmedString(k, 80))
          .filter((k): k is string => !!k)
      : [],
    top_themes: Array.isArray(root.top_themes)
      ? (root.top_themes as unknown[])
          .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
          .map((t) => ({
            name: asTrimmedString(t.name, 120) ?? 'tema',
            count: asNumberInRange(t.count, 0, 100) ?? 0,
            description: asTrimmedString(t.description, 280) ?? '',
          }))
      : [],
    overall_sentiment: asSentiment(root.overall_sentiment),
  };

  return { items, perItemSentiment, perItemRelevance, partial };
}

function computeSentimentBreakdown(
  perItemSentiment: Record<string, 'positive' | 'neutral' | 'negative'>,
): { positive: number; neutral: number; negative: number } {
  const out = { positive: 0, neutral: 0, negative: 0 };
  for (const v of Object.values(perItemSentiment)) out[v] += 1;
  return out;
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
      const projectCtx = await fetchProjectContext(input.projectId);
      const userPrompt = buildUserPrompt(input.topic, projectCtx);

      const search = await moonshotWebSearch({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
      });

      const { items, perItemSentiment, perItemRelevance, partial } = parseKimiNewsJson(
        search.text,
      );

      logger.info(
        {
          itemsCount: items.length,
          iterations: search.iterations,
          toolCalls: search.toolCallsMade,
          hasNarrative: !!partial.narrative,
        },
        'news aggregator pipeline (kimi)',
      );

      let analysis: NewsAnalysis | undefined;
      if (items.length > 0 || partial.narrative || partial.executive_summary) {
        analysis = {
          narrative: partial.narrative ?? '',
          executive_summary: partial.executive_summary ?? '',
          top_themes: partial.top_themes ?? [],
          overall_sentiment: partial.overall_sentiment ?? 'neutral',
          sentiment_breakdown: computeSentimentBreakdown(perItemSentiment),
          per_item_sentiment: perItemSentiment,
          key_insights: partial.key_insights ?? [],
          trending_keywords: partial.trending_keywords ?? [],
          items_enriched:
            items.length > 0 ? enrichItems(items, perItemSentiment, perItemRelevance) : [],
        };
      }

      const result: NewsResult = { topic: input.topic, items, analysis };

      let report: AggregateNewsOutput['report'];
      if (input.projectId) {
        try {
          const fallbackSummary = items
            .slice(0, FALLBACK_PREVIEW_ITEMS)
            .map((it, i) => `${i + 1}. ${it.title}${it.source ? ` — ${it.source}` : ''}`)
            .join('\n');

          const contentMd =
            analysis?.narrative || analysis?.executive_summary || JSON.stringify(items);
          const summaryText = analysis?.executive_summary
            ? analysis.executive_summary.slice(0, REPORT_SUMMARY_MAX_CHARS)
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
