import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';

export interface CreateNotificationInput {
  userId: string;
  projectId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    try {
      return await prisma.notification.create({
        data: {
          userId: input.userId,
          projectId: input.projectId ?? null,
          kind: input.kind,
          title: input.title,
          body: input.body ?? null,
          actionUrl: input.actionUrl ?? null,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'failed to create notification');
      return null;
    }
  },

  async analysisComplete(userId: string, projectId: string, competitorName: string) {
    return this.create({
      userId,
      projectId,
      kind: 'analysis_complete',
      title: `Análisis de ${competitorName} completado`,
      body: 'Los datos de engagement y posts ya están disponibles.',
      actionUrl: '/memory?tab=competitors',
    });
  },

  async reportReady(userId: string, projectId: string, reportTitle: string, reportId: string) {
    return this.create({
      userId,
      projectId,
      kind: 'report_ready',
      title: `Reporte listo: ${reportTitle}`,
      body: 'Tu reporte estratégico ya está disponible para revisar.',
      actionUrl: '/reports',
    });
  },

  async recommendationsGenerated(userId: string, projectId: string, count: number) {
    return this.create({
      userId,
      projectId,
      kind: 'recommendation',
      title: `${count} nuevas sugerencias generadas`,
      body: 'Revisa las acciones recomendadas para tu marca.',
      actionUrl: '/recommendations',
    });
  },

  async trendDetected(userId: string, projectId: string, trendName: string) {
    return this.create({
      userId,
      projectId,
      kind: 'trend_alert',
      title: `Tendencia detectada: ${trendName}`,
      body: 'Una nueva tendencia relevante para tu sector.',
      actionUrl: '/recommendations',
    });
  },

  async contentEvaluated(userId: string, projectId: string, score: number) {
    return this.create({
      userId,
      projectId,
      kind: 'content_evaluated',
      title: `Contenido evaluado: ${score}/10`,
      body: 'Tu imagen fue evaluada por IA. Revisa el feedback.',
      actionUrl: '/content',
    });
  },

  async jobFailed(input: {
    userId: string;
    projectId?: string | null;
    jobKind: string;
    error?: string | null;
  }) {
    const meta = JOB_FAILURE_META[input.jobKind] ?? {
      title: 'Tarea de análisis fallida',
      body: 'Algo salió mal procesando esta tarea.',
      actionUrl: null,
    };
    const reason = (input.error ?? '').slice(0, 180);
    return this.create({
      userId: input.userId,
      projectId: input.projectId ?? null,
      kind: 'job_failed',
      title: meta.title,
      body: reason ? `${meta.body} Detalle: ${reason}` : meta.body,
      actionUrl: meta.actionUrl,
    });
  },
};

const JOB_FAILURE_META: Record<string, { title: string; body: string; actionUrl: string | null }> = {
  website_analyze: {
    title: 'No pudimos analizar tu sitio web',
    body: 'Revisa que la URL sea accesible y vuelve a intentarlo desde los ajustes del proyecto.',
    actionUrl: '/memory?tab=brand',
  },
  instagram_scrape: {
    title: 'No pudimos extraer tu Instagram',
    body: 'La cuenta puede ser privada o Instagram está limitando peticiones. Intenta de nuevo más tarde.',
    actionUrl: '/memory?tab=brand',
  },
  tiktok_scrape: {
    title: 'No pudimos extraer tu TikTok',
    body: 'La cuenta puede ser privada o TikTok está limitando peticiones. Intenta de nuevo más tarde.',
    actionUrl: '/memory?tab=brand',
  },
  brand_analyze: {
    title: 'Falló el análisis de marca',
    body: 'No pudimos completar el análisis automático de marca.',
    actionUrl: '/memory?tab=brand',
  },
  brand_synthesize: {
    title: 'Falló la síntesis de marca',
    body: 'No pudimos sintetizar la identidad automáticamente.',
    actionUrl: '/memory?tab=brand',
  },
  auto_competitor_detect: {
    title: 'No pudimos detectar competidores',
    body: 'La detección automática falló. Puedes añadirlos manualmente.',
    actionUrl: '/memory?tab=competitors',
  },
  competitor_analyze: {
    title: 'Falló el análisis del competidor',
    body: 'No pudimos completar el análisis de este competidor. Intenta de nuevo.',
    actionUrl: '/memory?tab=competitors',
  },
  competitor_narrative: {
    title: 'No pudimos interpretar al competidor',
    body: 'Los datos siguen disponibles. Puedes regenerar la interpretación en un momento.',
    actionUrl: '/memory?tab=competitors',
  },
  news_aggregate: {
    title: 'Falló la búsqueda de noticias',
    body: 'No pudimos recopilar noticias para tu sector ahora mismo.',
    actionUrl: '/news',
  },
  recommendations_generate: {
    title: 'Falló la generación de recomendaciones',
    body: 'No pudimos generar nuevas sugerencias. Intenta de nuevo en un momento.',
    actionUrl: '/recommendations',
  },
  image_generate: {
    title: 'Falló la generación de imagen',
    body: 'No pudimos crear la imagen solicitada.',
    actionUrl: '/content',
  },
  image_edit: {
    title: 'Falló la edición de imagen',
    body: 'No pudimos aplicar la edición solicitada.',
    actionUrl: '/content',
  },
};
