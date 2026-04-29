import { prisma } from '@radikal/db';
import { contentEvaluator, imageGenerator } from '../../ai-services/index.js';
import type { ToolDefinition } from './types.js';

export const generateImageTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'generate_image',
      description:
        'Genera una imagen con IA aplicando la identidad de la marca del proyecto. Solo úsalo DESPUÉS de que el usuario haya seleccionado activos de la galería de get_library_assets. IMPORTANTE SOBRE LOGOS: Si el usuario seleccionó un logo, la imagen DEBE incluir ese logo EXACTO. Si el usuario NO seleccionó ningún logo, la imagen NO debe tener ningún logo y NO debes inventar ninguno.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { 
            type: 'string',
            description: 'Descripción detallada de la imagen. REGLA CRÍTICA DE LOGOS: Si el usuario seleccionó un logo (reference_asset_ids), debes instruir "Include the exact provided logo, do not modify it". Si NO seleccionó un logo, debes instruir explícitamente "NO logo, NO text, NO brand marks, do not invent any logo".',
          },
          size: { 
            type: 'string', 
            enum: ['1024x1024', '1792x1024', '1024x1792'],
            description: 'Tamaño de la imagen. DEBE ser 1024x1024 por defecto (cuadrado). Solo usa 1024x1792 para historias/vertical o 1792x1024 para banners/horizontal si el usuario lo pide.',
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
      sourceSection: 'chat',
    });
    const first = out.variations[0];
    return {
      summary: first ? `Imagen generada: ${first.url}` : 'No se pudo generar la imagen.',
      data: first ? { url: first.url, assetId: first.assetId } : undefined,
    };
  },
};

export const getLibraryAssetsTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'get_library_assets',
      description:
        'Obtener y MOSTRAR la biblioteca visual de la marca (logos, fotos, referencias). Úsalo para que el usuario elija. Si el usuario envía "[ASSETS: id1,id2]", pásalos en el parámetro reference_asset_ids de generate_image.',
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
    
    // Fetch logo specifically to ensure it is always proposed if it exists
    const logos = await prisma.contentAsset.findMany({
      where: {
        projectId: ctx.projectId,
        tags: { has: 'logo' },
      },
      take: 2,
      select: { id: true, assetUrl: true, tags: true, aiDescription: true },
    });

    // Fetch other references (Increased limit to 50 as requested, scrollable in UI)
    const otherAssets = await prisma.contentAsset.findMany({
      where: {
        projectId: ctx.projectId,
        tags: { hasSome: ['reference', 'user_uploaded', 'website', 'social_media', 'product', 'moodboard', 'instagram', 'facebook'] },
        id: { notIn: logos.map(l => l.id) },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, assetUrl: true, tags: true, aiDescription: true },
    });

    const conceptTerms = args.concept?.toLowerCase().split(' ').filter(t => t.length > 3) || [];

    const assets = [...logos, ...otherAssets].map(a => {
      const isSuggested = conceptTerms.length > 0 && (
        a.aiDescription?.toLowerCase().includes(conceptTerms[0]) || 
        a.tags.some(t => conceptTerms.includes(t.toLowerCase()))
      );
      
      return {
        id: a.id,
        url: a.assetUrl,
        tags: a.tags,
        aiDescription: a.aiDescription,
        suggested: isSuggested || a.tags.includes('logo') // Logos are always suggested
      };
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
