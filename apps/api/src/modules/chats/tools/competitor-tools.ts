import { prisma } from '@radikal/db';
import { competitorAnalyzer } from '../../ai-services/index.js';
import type { ToolDefinition } from './types.js';

export const analyzeCompetitorTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'analyze_competitor',
      description:
        'Analiza un competidor específico del proyecto. Úsalo cuando el usuario pregunta sobre un competidor.',
      parameters: {
        type: 'object',
        properties: {
          competitor_name: {
            type: 'string',
            description: 'Nombre del competidor a analizar',
          },
        },
        required: ['competitor_name'],
      },
    },
  },
  label: 'Analizando competidor',
  async execute(args, ctx) {
    const competitorName = String(args.competitor_name ?? '').trim();
    if (!competitorName) return { summary: 'competitor_name vacío', error: 'missing_arg' };
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const { result } = await competitorAnalyzer.analyze({
      query: competitorName,
      userId: ctx.userId,
      projectId: ctx.projectId,
    });
    const top = result.competitors
      .slice(0, 5)
      .map((c) => `- ${c.name}: ${c.summary ?? c.url ?? ''}`);
    return {
      summary: `Análisis de "${competitorName}" completado. ${result.competitors.length} hallazgos.`,
      data: {
        competitors: result.competitors.slice(0, 5),
        insights: result.insights.slice(0, 5),
        preview: top.join('\n'),
      },
    };
  },
};

export const getCompetitorDataTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'get_competitor_data',
      description:
        'Lee datos detallados de un competidor: engagement, posts top, métricas, gaps. Úsalo para comparaciones o cuando necesites datos exactos.',
      parameters: {
        type: 'object',
        properties: {
          competitor_name: {
            type: 'string',
            description: 'Nombre del competidor. Deja vacío para obtener resumen de todos.',
          },
        },
      },
    },
  },
  label: 'Consultando competidores',
  async execute(args, ctx) {
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const compName = String(args.competitor_name ?? '').trim();
    if (compName) {
      const comp = await prisma.competitor.findFirst({
        where: { projectId: ctx.projectId, name: { contains: compName, mode: 'insensitive' } },
      });
      if (!comp) return { summary: `No se encontró competidor "${compName}".`, error: 'not_found' };
      const posts = await prisma.socialPost.findMany({
        where: { competitorId: comp.id },
        orderBy: { likes: 'desc' },
        take: 10,
      });
      const stats = comp.engagementStats as Record<string, unknown> | null;
      const topPosts = posts.map((p) => ({
        platform: p.platform,
        likes: p.likes,
        comments: p.comments,
        views: p.views,
        caption: p.caption?.slice(0, 120),
        postType: p.postType,
        url: p.postUrl,
      }));
      return {
        summary: `Datos de ${comp.name}: ${posts.length} posts, engagement promedio ${stats?.avg_engagement ?? 'N/A'}.`,
        data: {
          name: comp.name,
          website: comp.website,
          engagement: stats,
          analysis: comp.analysisData,
          topPosts,
        },
      };
    }
    const allComps = await prisma.competitor.findMany({
      where: { projectId: ctx.projectId, status: 'confirmed' },
      take: 10,
    });
    const summary = allComps.map((c) => {
      const s = c.engagementStats as Record<string, unknown> | null;
      return `- ${c.name}: ${s?.total_posts ?? 0} posts, avg engagement ${s?.avg_engagement ?? 'N/A'}`;
    });
    return {
      summary: `${allComps.length} competidores confirmados.`,
      data: {
        competitors: allComps.map((c) => ({
          id: c.id,
          name: c.name,
          website: c.website,
          engagement: c.engagementStats,
        })),
        preview: summary.join('\n'),
      },
    };
  },
};
