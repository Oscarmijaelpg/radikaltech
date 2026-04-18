import { prisma } from '@radikal/db';
import { memoryService } from '../../memory/service.js';
import type { ToolDefinition } from './types.js';

export const saveMemoryTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Guarda una nota o insight en la memoria del proyecto cuando el usuario dice algo importante.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['note', 'brand_insight', 'idea', 'customer_feedback'],
          },
          value: { type: 'string' },
          key: { type: 'string' },
        },
        required: ['category', 'value'],
      },
    },
  },
  label: 'Guardando memoria',
  async execute(args, ctx) {
    const category = String(args.category ?? 'note');
    const value = String(args.value ?? '').trim();
    const key = args.key ? String(args.key) : null;
    if (!value) return { summary: 'value vacío', error: 'missing_arg' };
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const mem = await memoryService.create(ctx.userId, {
      project_id: ctx.projectId,
      category,
      key,
      value,
      metadata: { source: 'chat_tool', chat_id: ctx.chatId },
    });
    return {
      summary: `Memoria guardada (${category}): ${value.slice(0, 80)}`,
      data: { id: mem.id },
    };
  },
};

export const createRecommendationTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'create_recommendation',
      description:
        'Crea una recomendación accionable para el user basada en la conversación.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          kind: {
            type: 'string',
            enum: [
              'post',
              'campaign',
              'strategy',
              'report',
              'content_improvement',
              'competitor_response',
              'news_reaction',
            ],
          },
        },
        required: ['title', 'why', 'kind'],
      },
    },
  },
  label: 'Creando recomendación',
  async execute(args, ctx) {
    const title = String(args.title ?? '').trim();
    const why = String(args.why ?? '').trim();
    const kind = String(args.kind ?? 'post');
    if (!title || !why) return { summary: 'title/why vacío', error: 'missing_arg' };
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const rec = await prisma.recommendation.create({
      data: {
        projectId: ctx.projectId,
        userId: ctx.userId,
        kind: kind as
          | 'post'
          | 'campaign'
          | 'strategy'
          | 'report'
          | 'content_improvement'
          | 'competitor_response'
          | 'news_reaction',
        title,
        why,
        actionLabel: 'Revisar',
        actionKind: 'open_chat',
        actionPayload: { chat_id: ctx.chatId },
        impact: 'medium',
        sources: [{ type: 'chat', chat_id: ctx.chatId }],
      },
    });
    return {
      summary: `Recomendación creada: ${title}`,
      data: { id: rec.id },
    };
  },
};
