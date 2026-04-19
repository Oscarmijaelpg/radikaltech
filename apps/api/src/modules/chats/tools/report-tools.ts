import { prisma } from '@radikal/db';
import {
  generateBrandStrategy,
  generateCompetitionReport,
  generateMonthlyAudit,
  generateUnifiedReport,
} from '../../reports/generators/index.js';
import type { ToolDefinition } from './types.js';

export const generateReportTool: ToolDefinition = {
  schema: {
    type: 'function',
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
  label: 'Generando reporte',
  async execute(args, ctx) {
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
          if (!firstComp)
            return {
              summary: 'No hay competidores confirmados para generar reporte.',
              error: 'no_data',
            };
          report = await generateCompetitionReport({
            userId: ctx.userId,
            projectId: ctx.projectId,
            competitorId: firstComp.id,
          });
        } else {
          report = await generateCompetitionReport({
            userId: ctx.userId,
            projectId: ctx.projectId,
            competitorId: compId,
          });
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
  },
};
