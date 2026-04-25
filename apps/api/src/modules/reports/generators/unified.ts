import { prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { callOpenRouter, clip } from './llm.js';

const UNIFIED_TEMPERATURE = 0.4;
const MAX_COMPETITORS = 8;
const MAX_SOCIAL_POSTS = 20;
const MAX_SOCIAL_POSTS_IN_PROMPT = 12;
const MAX_NEWS_REPORTS = 5;
const MAX_NEWS_ITEMS_PER_REPORT = 4;
const MAX_NEWS_ITEMS_TOTAL = 10;
const MAX_RECOMMENDATIONS = 10;
const MAX_MEMORIES = 10;
const MAX_ASSETS = 10;
const MAX_SCHEDULED_POSTS = 20;
const MAX_CONTEXT_CHARS = 6000;
const SUMMARY_MIN_LINE_LEN = 40;
const SUMMARY_MAX_CHARS = 280;
const INSIGHT_MAX_CHARS = 200;
const MAX_INSIGHTS = 8;

export async function generateUnifiedReport(input: {
  userId: string;
  projectId: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error('Project not found');

  const [
    brand,
    competitors,
    socialPosts,
    newsReports,
    recommendations,
    memories,
    scheduledPosts,
    assets,
  ] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { projectId: input.projectId } }),
    prisma.competitor.findMany({
      where: { projectId: input.projectId, status: 'confirmed' },
      take: MAX_COMPETITORS,
    }),
    prisma.socialPost.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ likes: 'desc' }],
      take: MAX_SOCIAL_POSTS,
    }),
    prisma.report.findMany({
      where: { projectId: input.projectId, reportType: 'news' },
      orderBy: { createdAt: 'desc' },
      take: MAX_NEWS_REPORTS,
    }),
    prisma.recommendation.findMany({
      where: { projectId: input.projectId, status: { in: ['new', 'saved', 'in_progress'] } },
      take: MAX_RECOMMENDATIONS,
    }),
    prisma.memory.findMany({
      where: { projectId: input.projectId, category: { not: 'chat_summary' } },
      orderBy: { updatedAt: 'desc' },
      take: MAX_MEMORIES,
    }),
    prisma.scheduledPost.findMany({
      where: {
        projectId: input.projectId,
        status: 'scheduled',
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: MAX_SCHEDULED_POSTS,
    }),
    prisma.contentAsset.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ASSETS,
    }),
  ]);

  const parts: string[] = [];

  parts.push(`MARCA: ${project.companyName ?? project.name}
Industria: ${project.industry ?? project.industryCustom ?? 'N/A'}
Negocio: ${clip(project.businessSummary, 400)}
Valor único: ${clip(project.uniqueValue, 200)}
Productos: ${clip(project.mainProducts, 200)}
Cliente ideal: ${clip(project.idealCustomer, 200)}`);

  if (brand) {
    parts.push(`IDENTIDAD:
Tono: ${clip(brand.voiceTone, 150)}
Esencia: ${clip(brand.essence, 200)}
Misión: ${clip(brand.mission, 150)}
Visión: ${clip(brand.vision, 150)}
Valores: ${(brand.brandValues ?? []).slice(0, 6).join(', ')}
Audiencia: ${clip(brand.targetAudience, 200)}
Keywords: ${(brand.keywords ?? []).slice(0, 8).join(', ')}`);
  }

  if (competitors.length > 0) {
    const cLines = competitors.map((c) => {
      const stats = (c.engagementStats as Record<string, unknown> | null) ?? {};
      return `- ${c.name} | avg_likes=${stats.avg_likes ?? '?'} avg_eng=${stats.avg_engagement ?? '?'} posts=${stats.total_posts ?? '?'}${c.notes ? ` | ${clip(c.notes, 100)}` : ''}`;
    });
    parts.push(`COMPETIDORES (${competitors.length}):\n${cLines.join('\n')}`);
  }

  if (socialPosts.length > 0) {
    const pLines = socialPosts
      .slice(0, MAX_SOCIAL_POSTS_IN_PROMPT)
      .map(
        (p) =>
          `- ${p.platform} | likes=${p.likes} comments=${p.comments} views=${p.views} | ${clip(p.caption, 100)}`,
      );
    parts.push(`TOP POSTS COMPETIDORES:\n${pLines.join('\n')}`);
  }

  if (newsReports.length > 0) {
    const nItems: string[] = [];
    for (const r of newsReports.slice(0, 3)) {
      const sd = r.sourceData as { items?: Array<{ title?: string }> } | null;
      const items = Array.isArray(sd?.items) ? sd!.items!.slice(0, MAX_NEWS_ITEMS_PER_REPORT) : [];
      for (const it of items) {
        if (it.title) nItems.push(`- ${clip(it.title, 160)}`);
      }
    }
    if (nItems.length > 0)
      parts.push(`NOTICIAS RECIENTES:\n${nItems.slice(0, MAX_NEWS_ITEMS_TOTAL).join('\n')}`);
  }

  if (recommendations.length > 0) {
    const rLines = recommendations.map(
      (r) => `- [${r.impact}] ${r.title} (${r.kind}/${r.status})`,
    );
    parts.push(`RECOMENDACIONES ACTIVAS:\n${rLines.join('\n')}`);
  }

  if (memories.length > 0) {
    const mLines = memories.map(
      (m) => `- [${m.category}] ${m.key ? `${m.key}: ` : ''}${clip(m.value, 150)}`,
    );
    parts.push(`MEMORIA DEL PROYECTO:\n${mLines.join('\n')}`);
  }

  parts.push(`CALENDARIO: ${scheduledPosts.length} posts agendados. Assets totales: ${assets.length}`);

  const context = parts.join('\n\n').slice(0, MAX_CONTEXT_CHARS);

  const system = `Eres un director de estrategia de marca senior. Generas un ANÁLISIS INTEGRAL 360° que cruza TODA la información disponible: marca, competidores, noticias, tendencias, contenido, recomendaciones activas, y memoria del proyecto.

Estructura obligatoria (markdown):
1. **Resumen Ejecutivo** (3-5 frases de alto impacto)
2. **Diagnóstico de Marca** (fortalezas, debilidades con datos)
3. **Panorama Competitivo** (comparativas con métricas reales)
4. **Contexto de Mercado** (noticias y tendencias relevantes)
5. **Análisis de Contenido** (qué funciona, qué no, gaps)
6. **Oportunidades Detectadas** (cruces entre competidores+noticias+marca)
7. **Plan de Acción** (5-8 acciones priorizadas por impacto)
8. **Métricas de Seguimiento** (KPIs sugeridos)

REGLAS:
- Cita datos REALES del contexto, nunca inventes métricas.
- Cada oportunidad debe nombrar qué datos la respaldan.
- El plan de acción debe ser ESPECÍFICO para esta marca, no genérico.
- Usa viñetas y sub-encabezados para facilitar lectura.`;

  const user = `CONTEXTO COMPLETO DEL PROYECTO:\n\n${context}`;

  let content = '';
  try {
    content = await callOpenRouter({ system, user, temperature: UNIFIED_TEMPERATURE });
  } catch (err) {
    logger.warn({ err }, 'unified report generation failed, using fallback');
    content = `# Análisis Integral 360° — ${project.companyName ?? project.name}\n\nNo fue posible generar el informe automático. Datos disponibles:\n\n${context}`;
  }

  const summaryLine =
    content
      .split('\n')
      .find((l) => l.trim().length > SUMMARY_MIN_LINE_LEN)
      ?.slice(0, SUMMARY_MAX_CHARS) ?? null;
  const keyInsightsArr: string[] = [];
  const bulletMatches = content.match(/^[-*]\s+(.+)$/gm) ?? [];
  keyInsightsArr.push(
    ...bulletMatches
      .slice(0, MAX_INSIGHTS)
      .map((b) => b.replace(/^[-*]\s+/, '').slice(0, INSIGHT_MAX_CHARS)),
  );

  const unifiedReport = await prisma.report.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      title: `Análisis 360° — ${project.companyName ?? project.name} — ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      reportType: 'general',
      content,
      summary: summaryLine,
      keyInsights: keyInsightsArr,
      sourceData: {
        type: 'unified_360',
        competitors_count: competitors.length,
        posts_analyzed: socialPosts.length,
        news_reports: newsReports.length,
        recommendations_active: recommendations.length,
        memories_used: memories.length,
      } as object,
    },
  });

  return unifiedReport;
}
