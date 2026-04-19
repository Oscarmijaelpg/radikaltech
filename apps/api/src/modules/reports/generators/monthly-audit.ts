import { prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { callOpenRouter } from './llm.js';

const AUDIT_WINDOW_DAYS = 30;
const AUDIT_TEMPERATURE = 0.4;

export async function generateMonthlyAudit(input: {
  userId: string;
  projectId: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error('Project not found');

  const since = new Date();
  since.setDate(since.getDate() - AUDIT_WINDOW_DAYS);

  const [chats, assets, reportsCount, jobs, messages] = await Promise.all([
    prisma.chat.count({ where: { projectId: input.projectId, createdAt: { gte: since } } }),
    prisma.contentAsset.count({
      where: { projectId: input.projectId, createdAt: { gte: since } },
    }),
    prisma.report.count({ where: { projectId: input.projectId, createdAt: { gte: since } } }),
    prisma.aiJob.count({ where: { projectId: input.projectId, createdAt: { gte: since } } }),
    prisma.message.count({
      where: { chat: { projectId: input.projectId }, createdAt: { gte: since } },
    }),
  ]);

  const counters = {
    chats_created: chats,
    assets_uploaded: assets,
    reports_generated: reportsCount,
    ai_jobs_executed: jobs,
    messages_exchanged: messages,
    period: { from: since.toISOString(), to: new Date().toISOString() },
  };

  const system = `Eres un analista de operaciones. Devuelves un markdown con: 1) Resumen ejecutivo del mes, 2) Actividad por tipo, 3) Observaciones/tendencias, 4) Recomendaciones para el próximo mes.`;
  const user = `Proyecto: ${project.name}\nPeriodo: últimos ${AUDIT_WINDOW_DAYS} días\nMétricas:\n${JSON.stringify(counters, null, 2)}`;

  let content = '';
  try {
    content = await callOpenRouter({ system, user, temperature: AUDIT_TEMPERATURE });
  } catch (err) {
    logger.warn({ err }, 'monthly audit generation failed, using fallback');
    content = `# Auditoría mensual — ${project.name}\n\n- Chats creados: ${chats}\n- Assets subidos: ${assets}\n- Reportes: ${reportsCount}\n- Jobs IA: ${jobs}\n- Mensajes: ${messages}`;
  }

  const summary = `Últimos ${AUDIT_WINDOW_DAYS} días: ${chats} chats, ${assets} assets, ${reportsCount} reportes, ${messages} mensajes.`;
  const keyInsights = [
    `${chats} chats creados`,
    `${assets} assets subidos`,
    `${reportsCount} reportes generados`,
    `${jobs} análisis ejecutados`,
    `${messages} mensajes intercambiados`,
  ];

  const report = await prisma.report.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      title: `Auditoría mensual — ${new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}`,
      reportType: 'monthly_audit',
      content,
      summary,
      keyInsights,
      sourceData: counters as object,
    },
  });
  return report;
}
