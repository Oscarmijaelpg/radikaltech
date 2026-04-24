import { prisma, Prisma } from '@radikal/db';
import { env } from '../../../config/env.js';
import { PROVIDER_URLS } from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import { notificationService } from '../../notifications/service.js';
import { analyzeNewsWithAI, buildEnhancedQuery } from './ai-analyzer.js';
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

const TAVILY_TIMEOUT_MS = 25_000;
const TAVILY_DAYS_WINDOW = 21;
const TAVILY_MAX_RESULTS = 12;
const TAVILY_SUMMARY_MAX_CHARS = 280;
const FALLBACK_PREVIEW_ITEMS = 3;
const REPORT_SUMMARY_MAX_CHARS = 600;

async function fetchProjectContext(projectId: string | undefined): Promise<ProjectContext | null> {
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

async function fetchTavilyNews(query: string): Promise<NewsItem[]> {
  if (!env.TAVILY_API_KEY) {
    logger.warn('TAVILY_API_KEY not set');
    return [];
  }
  const res = await fetch(PROVIDER_URLS.tavily.search, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      topic: 'news',
      days: TAVILY_DAYS_WINDOW,
      max_results: TAVILY_MAX_RESULTS,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, 'tavily news failed');
    return [];
  }
  const body = (await res.json()) as {
    results: Array<{ title: string; url: string; content: string; published_date?: string }>;
  };
  return body.results.map((r) => ({
    title: r.title,
    url: r.url,
    source: hostnameOf(r.url),
    published_at: r.published_date,
    summary: r.content?.slice(0, TAVILY_SUMMARY_MAX_CHARS),
  }));
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
      const enhancedQuery = buildEnhancedQuery(input.topic, projectCtx);
      logger.info(
        { original: input.topic, enhanced: enhancedQuery },
        'news query enhanced with brand context',
      );

      const items = await fetchTavilyNews(enhancedQuery);

      const aiResult = await analyzeNewsWithAI(input.topic, items, projectCtx);
      let analysis: NewsAnalysis | undefined = aiResult?.analysis;
      const perItemRelevance = aiResult?.per_item_relevance ?? {};
      if (items.length > 0) {
        const sentMap = analysis?.per_item_sentiment ?? {};
        const enriched = enrichItems(items, sentMap, perItemRelevance);
        if (!analysis) {
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
            .slice(0, FALLBACK_PREVIEW_ITEMS)
            .map((it, i) => `${i + 1}. ${it.title}${it.source ? ` — ${it.source}` : ''}`)
            .join('\n');

          const contentMd = analysis?.narrative
            ? analysis.narrative
            : analysis?.executive_summary
              ? analysis.executive_summary
              : JSON.stringify(items);

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
