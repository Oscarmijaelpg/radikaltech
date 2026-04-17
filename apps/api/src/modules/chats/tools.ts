import { prisma } from '@radikal/db';
import {
  competitorAnalyzer,
  imageGenerator,
  newsAggregator,
  trendingFinder,
  contentEvaluator,
  websiteAnalyzer,
  marketDetector,
} from '../ai-services/index.js';
import { memoryService } from '../memory/service.js';
import {
  generateBrandStrategy,
  generateMonthlyAudit,
  generateCompetitionReport,
  generateUnifiedReport,
} from '../reports/generators.js';

export const CHAT_TOOLS = [
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
    function: {
      name: 'generate_image',
      description:
        'Genera una imagen. Úsalo cuando el usuario pide generar/crear contenido visual.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'] },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
            enum: ['post', 'campaign', 'strategy', 'report', 'content_improvement', 'competitor_response', 'news_reaction'],
          },
        },
        required: ['title', 'why', 'kind'],
      },
    },
  },
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
    function: {
      name: 'generate_report',
      description:
        'Genera un reporte estratégico. Tipos: "brand_strategy" (estrategia de marca), "monthly_audit" (auditoría mensual), "competition" (competencia de un competidor), "unified" (análisis completo cruzando marca+competidores+noticias+tendencias).',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['brand_strategy', 'monthly_audit', 'competition', 'unified'],
          },
          competitor_id: {
            type: 'string',
            description: 'Solo para type=competition. ID del competidor.',
          },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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
];

export interface ToolExecContext {
  userId: string;
  projectId: string | null;
  chatId: string;
}

export interface ToolExecResult {
  summary: string;
  data?: unknown;
  error?: string;
}

/**
 * Execute a tool call. Failures never throw — they are returned as `error`
 * so the LLM receives a textual explanation and can keep streaming.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecContext,
): Promise<ToolExecResult> {
  try {
    switch (name) {
      case 'analyze_competitor': {
        const competitorName = String(args.competitor_name ?? '').trim();
        if (!competitorName) return { summary: 'competitor_name vacío', error: 'missing_arg' };
        if (!ctx.projectId)
          return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
        const { result } = await competitorAnalyzer.analyze({
          query: competitorName,
          userId: ctx.userId,
          projectId: ctx.projectId,
        });
        const top = result.competitors.slice(0, 5).map((c) => `- ${c.name}: ${c.summary ?? c.url ?? ''}`);
        return {
          summary: `Análisis de "${competitorName}" completado. ${result.competitors.length} hallazgos.`,
          data: {
            competitors: result.competitors.slice(0, 5),
            insights: result.insights.slice(0, 5),
            preview: top.join('\n'),
          },
        };
      }
      case 'generate_image': {
        const prompt = String(args.prompt ?? '').trim();
        if (!prompt) return { summary: 'prompt vacío', error: 'missing_arg' };
        const size = (args.size as '1024x1024' | '1792x1024' | '1024x1792') ?? '1024x1024';
        if (!ctx.projectId)
          return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
        const out = await imageGenerator.generate({
          prompt,
          size,
          userId: ctx.userId,
          projectId: ctx.projectId,
          variations: 1,
        });
        const first = out.variations[0];
        return {
          summary: first ? `Imagen generada: ${first.url}` : 'No se pudo generar la imagen.',
          data: first ? { url: first.url, assetId: first.assetId } : undefined,
        };
      }
      case 'search_news': {
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
      }
      case 'save_memory': {
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
      }
      case 'create_recommendation': {
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
            kind: kind as 'post' | 'campaign' | 'strategy' | 'report' | 'content_improvement' | 'competitor_response' | 'news_reaction',
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
      }
      case 'find_trends': {
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
          (t, i) => `${i + 1}. **${t.name}** [${t.momentum}] (relevancia ${t.relevance_score}/100): ${t.description}\n   → Acción sugerida: ${t.suggested_action}`,
        );
        return {
          summary: `${trends.length} tendencias detectadas para tu sector.`,
          data: { trends, preview: lines.join('\n') },
        };
      }
      case 'evaluate_content': {
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
      }
      case 'analyze_website': {
        const url = String(args.url ?? '').trim();
        if (!url) return { summary: 'url vacía', error: 'missing_arg' };
        const { result: webResult } = await websiteAnalyzer.analyze({
          url,
          userId: ctx.userId,
          projectId: ctx.projectId ?? undefined,
        });
        const info = webResult.detected_info;
        const lines: string[] = [];
        if (info.brand_name) lines.push(`Marca: ${info.brand_name}`);
        if (info.industry) lines.push(`Industria: ${info.industry}`);
        if (info.business_summary) lines.push(`Resumen: ${info.business_summary.slice(0, 200)}`);
        if (info.unique_value) lines.push(`Valor único: ${info.unique_value}`);
        if (webResult.logo_url) lines.push(`Logo detectado: ${webResult.logo_url}`);
        return {
          summary: `Sitio web "${url}" analizado. ${info.brand_name ? `Marca: ${info.brand_name}` : 'Info extraída.'}`,
          data: { detected_info: info, logo_url: webResult.logo_url, metadata: webResult.metadata },
        };
      }
      case 'detect_markets': {
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
      }
      case 'generate_report': {
        if (!ctx.projectId)
          return { summary: 'Este chat no tiene proyecto activo', error: 'no_project' };
        const reportType = String(args.type ?? 'brand_strategy');
        let report;
        switch (reportType) {
          case 'brand_strategy':
            report = await generateBrandStrategy({ userId: ctx.userId, projectId: ctx.projectId });
            break;
          case 'monthly_audit':
            report = await generateMonthlyAudit({ userId: ctx.userId, projectId: ctx.projectId });
            break;
          case 'competition': {
            const compId = String(args.competitor_id ?? '').trim();
            if (!compId) {
              const firstComp = await prisma.competitor.findFirst({
                where: { projectId: ctx.projectId, status: 'confirmed' },
              });
              if (!firstComp) return { summary: 'No hay competidores confirmados para generar reporte.', error: 'no_data' };
              report = await generateCompetitionReport({ userId: ctx.userId, projectId: ctx.projectId, competitorId: firstComp.id });
            } else {
              report = await generateCompetitionReport({ userId: ctx.userId, projectId: ctx.projectId, competitorId: compId });
            }
            break;
          }
          case 'unified':
            report = await generateUnifiedReport({ userId: ctx.userId, projectId: ctx.projectId });
            break;
          default:
            return { summary: `Tipo de reporte desconocido: ${reportType}`, error: 'invalid_type' };
        }
        return {
          summary: `Reporte "${report.title}" generado. IMPORTANTE: NO reproduzcas el contenido del reporte en tu respuesta. El contenido ya se muestra automáticamente en el panel lateral y en el card del chat. Responde SOLO con una frase breve (1-2 líneas) confirmando que el informe está listo y mencionando el botón "Abrir informe" del card. Por ejemplo: "Listo ✨ Tu informe de ${report.title} ya está disponible — tócalo en el card de abajo para verlo completo o descargarlo."`,
          data: {
            id: report.id,
            title: report.title,
            type: report.reportType,
            content: report.content ?? null,
            key_insights: report.keyInsights ?? [],
          },
        };
      }
      case 'get_competitor_data': {
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
          data: { competitors: allComps.map((c) => ({ id: c.id, name: c.name, website: c.website, engagement: c.engagementStats })), preview: summary.join('\n') },
        };
      }
      case 'get_brand_profile': {
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
            brand: bp ? {
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
            } : null,
          },
        };
      }
      default:
        return { summary: `Tool desconocido: ${name}`, error: 'unknown_tool' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[chat-tools] execute error', name, msg);
    return { summary: `Error ejecutando ${name}: ${msg}`, error: msg };
  }
}

/**
 * Legible name for UI chip.
 */
export function toolLabel(name: string): string {
  switch (name) {
    case 'analyze_competitor':
      return 'Analizando competidor';
    case 'generate_image':
      return 'Generando imagen';
    case 'search_news':
      return 'Buscando noticias';
    case 'save_memory':
      return 'Guardando memoria';
    case 'create_recommendation':
      return 'Creando recomendación';
    case 'find_trends':
      return 'Detectando tendencias';
    case 'evaluate_content':
      return 'Evaluando contenido';
    case 'analyze_website':
      return 'Analizando sitio web';
    case 'detect_markets':
      return 'Detectando mercados';
    case 'generate_report':
      return 'Generando reporte';
    case 'get_competitor_data':
      return 'Consultando competidores';
    case 'get_brand_profile':
      return 'Cargando perfil de marca';
    default:
      return name;
  }
}
