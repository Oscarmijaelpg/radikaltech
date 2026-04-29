import { marketDetector, websiteAnalyzer } from '../../ai-services/index.js';
import type { ToolDefinition } from './types.js';

export const analyzeWebsiteTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'analyze_website',
      description:
        'Analiza un sitio web: extrae info de marca, logo, productos, propuesta de valor. Úsalo cuando el usuario da una URL para analizar.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL del sitio web a analizar' },
        },
        required: ['url'],
      },
    },
  },
  label: 'Analizando sitio web',
  async execute(args, ctx) {
    const url = String(args.url ?? '').trim();
    if (!url) return { summary: 'url vacía', error: 'missing_arg' };
    const { result: webResult } = await websiteAnalyzer.analyze({
      url,
      userId: ctx.userId,
      projectId: ctx.projectId ?? undefined,
    });
    const info = webResult.detected_info;
    return {
      summary: `Sitio web "${url}" analizado. ${info.brand_name ? `Marca: ${info.brand_name}` : 'Info extraída.'}`,
      data: { detected_info: info, logo_url: webResult.logo_url, metadata: webResult.metadata },
    };
  },
};

export const detectMarketsTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'detect_markets',
      description:
        'Detecta mercados geográficos donde opera la marca basándose en su sitio web y descripción.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  label: 'Detectando mercados',
  async execute(_args, ctx) {
    if (!ctx.projectId)
      return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
    const mkResult = await marketDetector.detect({
      projectId: ctx.projectId,
      userId: ctx.userId,
    });
    if (mkResult.countries.length === 0) {
      return { summary: 'No se pudieron detectar mercados geográficos con la info disponible.' };
    }
    return {
      summary: `Mercados detectados: ${mkResult.countries.join(', ')} (confianza: ${mkResult.confidence ?? 'N/A'})`,
      data: mkResult,
    };
  },
};
