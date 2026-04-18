import { newsAggregator, trendingFinder } from '../../ai-services/index.js';
import type { ToolDefinition } from './types.js';

export const searchNewsTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'search_news',
      description: 'Busca noticias recientes sobre un tema en el sector del usuario.',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string' } },
        required: ['topic'],
      },
    },
  },
  label: 'Buscando noticias',
  async execute(args, ctx) {
    const topic = String(args.topic ?? '').trim();
    if (!topic) return { summary: 'topic vacío', error: 'missing_arg' };
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const res = await newsAggregator.aggregate({
      topic,
      userId: ctx.userId,
      projectId: ctx.projectId,
    });
    const items = (res.result?.items ?? []).slice(0, 5);
    const lines = items.map(
      (n: { title: string; source?: string }, i: number) =>
        `${i + 1}. ${n.title} — ${n.source ?? ''}`,
    );
    return {
      summary: `Encontradas ${items.length} noticias sobre "${topic}".`,
      data: { items, preview: lines.join('\n') },
    };
  },
};

export const findTrendsTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'find_trends',
      description:
        'Detecta tendencias actuales del sector cruzando noticias y posts de competidores. Úsalo cuando pregunten por tendencias, qué está de moda, o qué tema abordar.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  label: 'Detectando tendencias',
  async execute(_args, ctx) {
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const { trends } = await trendingFinder.detect({
      projectId: ctx.projectId,
      userId: ctx.userId,
    });
    if (trends.length === 0) {
      return { summary: 'No se detectaron tendencias relevantes para tu sector.' };
    }
    const lines = trends.map(
      (t, i) =>
        `${i + 1}. **${t.name}** [${t.momentum}] (relevancia ${t.relevance_score}/100): ${t.description}\n   → Acción sugerida: ${t.suggested_action}`,
    );
    return {
      summary: `${trends.length} tendencias detectadas para tu sector.`,
      data: { trends, preview: lines.join('\n') },
    };
  },
};
