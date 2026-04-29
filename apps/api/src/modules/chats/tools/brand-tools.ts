import { prisma } from '@radikal/db';
import type { ToolDefinition } from './types.js';

export const getBrandProfileTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'get_brand_profile',
      description:
        'Obtiene el perfil completo de la marca: identidad, tono, valores, audiencia, paleta, keywords, misión, visión. Úsalo cuando necesites datos exactos de la marca.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  label: 'Cargando perfil de marca',
  async execute(_args, ctx) {
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const [proj, bp] = await Promise.all([
      prisma.project.findUnique({ where: { id: ctx.projectId } }),
      prisma.brandProfile.findUnique({ where: { projectId: ctx.projectId } }),
    ]);
    if (!proj) return { summary: 'Proyecto no encontrado.', error: 'not_found' };
    return {
      summary: `Perfil de ${proj.companyName ?? proj.name} cargado.`,
      data: {
        project: {
          name: proj.companyName ?? proj.name,
          industry: proj.industry ?? proj.industryCustom,
          summary: proj.businessSummary,
          unique_value: proj.uniqueValue,
          ideal_customer: proj.idealCustomer,
          products: proj.mainProducts,
          website: proj.websiteUrl,
        },
        brand: bp
          ? {
              essence: bp.essence,
              voice_tone: bp.voiceTone,
              target_audience: bp.targetAudience,
              values: bp.brandValues,
              mission: bp.mission,
              vision: bp.vision,
              keywords: bp.keywords,
              visual_direction: bp.visualDirection,
              color_palette: bp.colorPalette,
              color_palette_suggested: bp.colorPaletteSuggested,
            }
          : null,
      },
    };
  },
};
