import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { notificationService } from '../../notifications/service.js';
import { moonshotWebSearch } from '../moonshot.js';
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

      const systemPrompt = `Actúa como analista senior en inteligencia competitiva y monitoreo sectorial. Tienes acceso a la web mediante la herramienta \`$web_search\`. TU TAREA PRINCIPAL es buscar noticias reales.
Debes devolver tu respuesta EXCLUSIVAMENTE en formato JSON válido.

Empresa objetivo
Nombre: ${projectCtx?.company_name || 'Desconocida'}
Contexto de la empresa: ${projectCtx?.business_summary || 'No especificado'}
Industria principal: ${projectCtx?.industry || 'General'}
Mercado geográfico: ${projectCtx?.operating_countries?.join(', ') || 'Global'}

Objetivo de la investigación
Utiliza \`$web_search\` para identificar noticias estratégicas, tendencias sectoriales y cambios estructurales de los ÚLTIMOS 12 MESES sobre el tema: "${input.topic}".

Reglas de Búsqueda de Noticias (PRIORIDAD ALTA):
1. Usa \`$web_search\` exhaustivamente para buscar noticias reales sobre la industria en los mercados detectados.
2. Encuentra al menos 5 noticias clave que afecten regulaciones, tecnología, competencia, crecimiento, inversiones o comportamiento del consumidor.
3. EXIGENCIA DE FUENTES: Cada noticia debe provenir de una URL real devuelta por \`$web_search\`. PROHIBIDO inventar URLs.

Formato Obligatorio de Salida (JSON):
Debes devolver un JSON con esta estructura exacta:
{
  "narrative": "Un análisis en formato Markdown (3-5 párrafos) detallando las tendencias y el impacto de las noticias encontradas para la empresa objetivo.",
  "executive_summary": "Un resumen breve (2-3 frases) de las noticias y su impacto.",
  "key_insights": ["Insight accionable 1", "Insight accionable 2", "Insight accionable 3"],
  "items": [
    {
      "title": "Titular de la noticia",
      "url": "URL verificable de la fuente",
      "source": "Nombre del medio",
      "published_at": "Fecha (ej. 2024-05-20)",
      "summary": "Resumen de la noticia (máx 120 palabras)"
    }
  ]
}`;

      const userPrompt = `Por favor, ejecuta la investigación sobre el tema "${input.topic}" y devuelve los resultados en el formato JSON indicado.`;

      // Llamamos a Moonshot
      const rawMoonshotResult = await moonshotWebSearch(systemPrompt, userPrompt);
      
      // Parsear resultado de Moonshot (puede venir con Markdown wrap)
      let parsedData: any;
      try {
        const cleaned = rawMoonshotResult
          .replace(/```json\n?/g, '')
          .replace(/\n?```/g, '')
          .trim();
        parsedData = JSON.parse(cleaned);
      } catch (err) {
        logger.error({ err, rawMoonshotResult }, 'Failed to parse Moonshot JSON');
        const match = rawMoonshotResult.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedData = JSON.parse(match[0]);
          } catch (e2) {
            throw new Error('Moonshot output was not valid JSON even after extraction attempt');
          }
        } else {
          throw new Error('Moonshot output was not valid JSON and no JSON block found');
        }
      }

      const items: NewsItem[] = parsedData.items || [];
      const analysis: NewsAnalysis = {
        narrative: parsedData.narrative || '',
        executive_summary: parsedData.executive_summary || '',
        key_insights: parsedData.key_insights || [],
        top_themes: [],
        overall_sentiment: 'neutral',
        sentiment_breakdown: { positive: 0, neutral: items.length, negative: 0 },
        per_item_sentiment: {},
        trending_keywords: []
      };

      const result: NewsResult = { topic: input.topic, items, analysis };

      let report: AggregateNewsOutput['report'];
      if (input.projectId) {
        try {
          // Construir un contenido Markdown rico para la tabla Report
          const newsListMarkdown = items.map(it => 
            `### ${it.title}\n- **Medio:** ${it.source}\n- **Enlace:** [${it.url}](${it.url})\n- **Resumen:** ${it.summary}`
          ).join('\n\n');

          const contentMd = `# Reporte de Noticias: ${input.topic}\n\n## Resumen Ejecutivo\n${analysis.executive_summary}\n\n## Análisis Estratégico\n${analysis.narrative}\n\n## Insights Clave\n${analysis.key_insights?.map(i => `- ${i}`).join('\n')}\n\n## Noticias Detectadas\n${newsListMarkdown}`;

          const summaryText = analysis.executive_summary.slice(0, REPORT_SUMMARY_MAX_CHARS);

          const sourceDataPayload: Prisma.InputJsonValue = { items, analysis } as unknown as Prisma.InputJsonValue;

          const created = await prisma.report.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              title: `Noticias: ${input.topic}`,
              reportType: 'news',
              content: contentMd,
              summary: summaryText,
              keyInsights: analysis.key_insights,
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

