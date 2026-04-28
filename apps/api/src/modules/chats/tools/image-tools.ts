import { prisma } from '@radikal/db';
import { contentEvaluator, imageGenerator } from '../../ai-services/index.js';
import type { ToolDefinition } from './types.js';

export const generateImageTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'generate_image',
      description:
        'Genera una imagen con IA aplicando la identidad de la marca del proyecto. Úsalo SÓLO cuando el usuario ya ha confirmado el modo de generación y/o ha seleccionado referencias. Para proponer generación, usa primero propose_image.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { 
            type: 'string',
            description: 'Descripción detallada de la imagen a generar, incluyendo el concepto visual, ambiente, colores y estilo deseado.',
          },
          size: { 
            type: 'string', 
            enum: ['1024x1024', '1792x1024', '1024x1792'],
            description: 'Tamaño de la imagen: 1024x1024 para posts cuadrados, 1024x1792 para historias verticales, 1792x1024 para banners horizontales.',
          },
          mode: {
            type: 'string',
            enum: ['creative', 'referential'],
            description: 'Modo de generación: "creative" para mayor libertad creativa, "referential" para adherirse estrictamente a las referencias visuales de la marca.',
          },
          reference_asset_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de los activos visuales (imágenes de referencia) seleccionados por el usuario para basar la generación.',
          },
        },
        required: ['prompt'],
      },
    },
  },
  label: 'Generando imagen con IA',
  async execute(args, ctx) {
    const prompt = String(args.prompt ?? '').trim();
    if (!prompt) return { summary: 'prompt vacío', error: 'missing_arg' };
    const size = (args.size as '1024x1024' | '1792x1024' | '1024x1792') ?? '1024x1024';
    const mode = (args.mode as 'creative' | 'referential') ?? 'creative';
    const referenceAssetIds = Array.isArray(args.reference_asset_ids) ? args.reference_asset_ids : undefined;
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const out = await imageGenerator.generate({
      prompt,
      size,
      mode,
      userId: ctx.userId,
      projectId: ctx.projectId,
      referenceAssetIds,
      useBrandPalette: true,
      variations: 1,
    });
    const first = out.variations[0];
    return {
      summary: first ? `Imagen generada: ${first.url}` : 'No se pudo generar la imagen.',
      data: first ? { url: first.url, assetId: first.assetId } : undefined,
    };
  },
};

export const proposeImageTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'propose_image',
      description:
        'Propone la creación de una imagen al usuario mostrando los activos visuales de la marca (logos, referencias, productos) para que el usuario pueda seleccionarlos antes de generar. Úsalo SIEMPRE como primer paso cuando el usuario pida diseñar, crear o generar una imagen.',
      parameters: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'Concepto inicial sugerido para la imagen.',
          },
        },
      },
    },
  },
  label: 'Buscando activos visuales de la marca',
  async execute(args, ctx) {
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    
    // Fetch project brand assets (logos, references, user uploaded)
    const assets = await prisma.contentAsset.findMany({
      where: {
        projectId: ctx.projectId,
        tags: { hasSome: ['logo', 'reference', 'user_uploaded'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, url: true, tags: true, aiDescription: true },
    });

    return {
      summary: `Se encontraron ${assets.length} activos visuales para proponer.`,
      data: {
        concept: args.concept,
        assets,
      },
    };
  },
};

export const evaluateContentTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'evaluate_content',
      description:
        'Evalúa una imagen/asset de contenido del proyecto con score estético, feedback de marketing, y sugerencias. Úsalo cuando el usuario quiera feedback sobre una pieza visual.',
      parameters: {
        type: 'object',
        properties: {
          asset_id: {
            type: 'string',
            description: 'ID del asset a evaluar. Si no se tiene, busca los assets recientes del proyecto.',
          },
        },
        required: ['asset_id'],
      },
    },
  },
  label: 'Evaluando contenido',
  async execute(args, ctx) {
    const assetId = String(args.asset_id ?? '').trim();
    if (!assetId) return { summary: 'asset_id vacío', error: 'missing_arg' };
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const { result: evalResult } = await contentEvaluator.evaluate({
      assetId,
      userId: ctx.userId,
      projectId: ctx.projectId,
    });
    return {
      summary: `Evaluación completada. Score estético: ${evalResult.aesthetic_score}/10.`,
      data: {
        score: evalResult.aesthetic_score,
        feedback: evalResult.marketing_feedback,
        tags: evalResult.tags,
        suggestions: evalResult.suggestions,
        elements: evalResult.detected_elements,
      },
    };
  },
};
