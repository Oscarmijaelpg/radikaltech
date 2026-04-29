import { prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { notificationService } from '../../notifications/service.js';
import { callOpenRouter } from './llm.js';

const BRAND_STRATEGY_TEMPERATURE = 0.4;
const SUMMARY_MIN_LINE_LEN = 40;
const SUMMARY_MAX_CHARS = 280;
const INSIGHT_MAX_CHARS = 200;
const MAX_INSIGHTS = 6;

export async function generateBrandStrategy(input: {
  userId: string;
  projectId: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error('Project not found');
  const brand = await prisma.brandProfile.findUnique({ where: { projectId: input.projectId } });

  const ctx = [
    `Proyecto: ${project.name}`,
    project.industry && `Industria: ${project.industry}`,
    project.businessSummary && `Negocio: ${project.businessSummary}`,
    project.idealCustomer && `Cliente ideal: ${project.idealCustomer}`,
    project.uniqueValue && `Valor único: ${project.uniqueValue}`,
    project.mainProducts && `Productos: ${project.mainProducts}`,
    brand?.essence && `Esencia: ${brand.essence}`,
    brand?.mission && `Misión: ${brand.mission}`,
    brand?.vision && `Visión: ${brand.vision}`,
    brand?.targetAudience && `Audiencia: ${brand.targetAudience}`,
    brand?.voiceTone && `Tono: ${brand.voiceTone}`,
    brand?.brandValues?.length && `Valores: ${brand.brandValues.join(', ')}`,
    brand?.keywords?.length && `Keywords: ${brand.keywords.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const system = `Eres un brand strategist senior. Respondes en markdown estructurado con 5 secciones numeradas: 1. Diagnóstico, 2. Objetivos, 3. Posicionamiento, 4. Iniciativas, 5. Métricas. Usa viñetas y sub-encabezados.`;
  const user = `Genera un informe de estrategia de marca accionable con base en:\n\n${ctx}`;
  let content = '';
  try {
    content = await callOpenRouter({ system, user, temperature: BRAND_STRATEGY_TEMPERATURE });
  } catch (err) {
    logger.warn({ err }, 'brand strategy generation failed, using fallback');
    content = `# Estrategia de marca: ${project.name}\n\nNo fue posible generar el informe automático.\n\n${ctx}`;
  }

  const summary =
    content
      .split('\n')
      .find((l) => l.trim().length > SUMMARY_MIN_LINE_LEN)
      ?.slice(0, SUMMARY_MAX_CHARS) ?? null;
  const keyInsights: string[] = [];
  const insightMatch = content.match(/(?:objetivos?|iniciativas?|métricas?)[\s\S]{0,800}/i);
  if (insightMatch) {
    const bullets = insightMatch[0].match(/^[-*]\s+(.+)$/gm) ?? [];
    keyInsights.push(
      ...bullets
        .slice(0, MAX_INSIGHTS)
        .map((b) => b.replace(/^[-*]\s+/, '').slice(0, INSIGHT_MAX_CHARS)),
    );
  }

  const report = await prisma.report.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      title: `Estrategia de marca — ${project.name}`,
      reportType: 'brand_strategy',
      content,
      summary,
      keyInsights,
      sourceData: {
        project: { id: project.id, name: project.name, industry: project.industry },
        brand_profile_id: brand?.id ?? null,
      } as object,
    },
  });
  void notificationService.reportReady(input.userId, input.projectId, report.title, report.id);
  return report;
}
