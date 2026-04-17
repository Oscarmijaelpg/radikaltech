import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

export interface CompetitorAnalysisResult {
  query: string;
  competitors: Array<{
    name: string;
    url?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;
  insights: string[];
}

export interface AnalyzeCompetitorInput {
  query: string;
  userId: string;
  projectId?: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

async function tavilySearch(query: string, maxResults = 8): Promise<TavilyResponse> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: maxResults,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

async function synthesizeWithOpenRouter(
  query: string,
  results: TavilyResult[],
): Promise<{ competitors: CompetitorAnalysisResult['competitors']; insights: string[] }> {
  const context = results
    .slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content.slice(0, 500)}`)
    .join('\n\n');

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
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista estratégico. Devuelves JSON con { competitors: [{name, url, summary, strengths[], weaknesses[]}], insights: string[] }.',
        },
        {
          role: 'user',
          content: `Consulta: "${query}"\n\nResultados de búsqueda:\n${context}\n\nDevuelve entre 3 y 6 competidores relevantes y 3-5 insights estratégicos. SOLO JSON.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text().catch(() => '')}`);
  const body = await res.json();
  const content = body.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    return {
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    };
  } catch {
    return { competitors: [], insights: [] };
  }
}

export class CompetitorAnalyzer {
  async analyze(
    input: AnalyzeCompetitorInput,
  ): Promise<{ jobId: string; result: CompetitorAnalysisResult }> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'competitor_analyze',
        status: 'running',
        input: { query: input.query },
        projectId: input.projectId,
        userId: input.userId,
      },
    });

    try {
      let competitors: CompetitorAnalysisResult['competitors'] = [];
      let insights: string[] = [];

      if (env.TAVILY_API_KEY) {
        logger.info({ query: input.query }, 'tavily search start');
        const tav = await tavilySearch(input.query);
        if (env.OPENROUTER_API_KEY && tav.results.length > 0) {
          const syn = await synthesizeWithOpenRouter(input.query, tav.results);
          competitors = syn.competitors;
          insights = syn.insights;
        } else {
          competitors = tav.results.slice(0, 5).map((r) => ({
            name: r.title,
            url: r.url,
            summary: r.content.slice(0, 200),
          }));
        }
      } else {
        logger.warn('TAVILY_API_KEY not set');
      }

      const result: CompetitorAnalysisResult = { query: input.query, competitors, insights };
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'succeeded', output: result as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
      });
      return { jobId: job.id, result };
    } catch (err) {
      logger.error({ err }, 'competitor analyzer failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId ?? null,
          jobKind: 'competitor_analyze',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
