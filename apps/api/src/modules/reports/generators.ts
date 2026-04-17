import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

async function callOpenRouter(options: {
  system: string;
  user: string;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    return '# Resumen\n\nGeneración automática no disponible: falta configurar OPENROUTER_API_KEY.';
  }
  const body: Record<string, unknown> = {
    model: 'openai/gpt-4o-mini',
    temperature: options.temperature ?? 0.4,
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ],
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.WEB_URL,
      'X-Title': 'Radikal',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

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
    content = await callOpenRouter({ system, user, temperature: 0.4 });
  } catch (err) {
    logger.warn({ err }, 'brand strategy generation failed, using fallback');
    content = `# Estrategia de marca: ${project.name}\n\nNo fue posible generar el informe automático.\n\n${ctx}`;
  }

  const summary = content.split('\n').find((l) => l.trim().length > 40)?.slice(0, 280) ?? null;
  const keyInsights: string[] = [];
  const insightMatch = content.match(/(?:objetivos?|iniciativas?|métricas?)[\s\S]{0,800}/i);
  if (insightMatch) {
    const bullets = insightMatch[0].match(/^[-*]\s+(.+)$/gm) ?? [];
    keyInsights.push(...bullets.slice(0, 6).map((b) => b.replace(/^[-*]\s+/, '').slice(0, 200)));
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

export async function generateMonthlyAudit(input: {
  userId: string;
  projectId: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error('Project not found');

  const since = new Date();
  since.setDate(since.getDate() - 30);

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
  const user = `Proyecto: ${project.name}\nPeriodo: últimos 30 días\nMétricas:\n${JSON.stringify(counters, null, 2)}`;

  let content = '';
  try {
    content = await callOpenRouter({ system, user, temperature: 0.4 });
  } catch (err) {
    logger.warn({ err }, 'monthly audit generation failed, using fallback');
    content = `# Auditoría mensual — ${project.name}\n\n- Chats creados: ${chats}\n- Assets subidos: ${assets}\n- Reportes: ${reportsCount}\n- Jobs IA: ${jobs}\n- Mensajes: ${messages}`;
  }

  const summary = `Últimos 30 días: ${chats} chats, ${assets} assets, ${reportsCount} reportes, ${messages} mensajes.`;
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

export async function generateCompetitionReport(input: {
  userId: string;
  projectId: string;
  competitorId: string;
}) {
  const competitor = await prisma.competitor.findUnique({
    where: { id: input.competitorId },
  });
  if (!competitor || competitor.projectId !== input.projectId) {
    throw new Error('Competitor not found');
  }

  const posts = await prisma.socialPost.findMany({
    where: { competitorId: input.competitorId },
    orderBy: { postedAt: 'desc' },
    take: 30,
  });

  const totals = posts.reduce(
    (acc, p) => {
      acc.likes += p.likes ?? 0;
      acc.comments += p.comments ?? 0;
      acc.views += p.views ?? 0;
      acc.shares += p.shares ?? 0;
      return acc;
    },
    { likes: 0, comments: 0, views: 0, shares: 0 },
  );

  const analysis = (competitor.analysisData ?? {}) as Record<string, unknown>;

  const lines: string[] = [];
  lines.push(`# Análisis de competencia: ${competitor.name}`);
  lines.push('');
  if (competitor.website) lines.push(`**Sitio web:** ${competitor.website}`);
  lines.push(`**Posts analizados:** ${posts.length}`);
  lines.push('');
  lines.push('## Métricas agregadas (últimos posts)');
  lines.push(`- Likes: ${totals.likes}`);
  lines.push(`- Comentarios: ${totals.comments}`);
  lines.push(`- Vistas: ${totals.views}`);
  lines.push(`- Compartidos: ${totals.shares}`);
  lines.push('');

  if (Array.isArray(analysis.insights) && (analysis.insights as unknown[]).length > 0) {
    lines.push('## Insights del análisis');
    for (const ins of analysis.insights as unknown[]) {
      if (typeof ins === 'string') lines.push(`- ${ins}`);
    }
    lines.push('');
  }

  if (Array.isArray(analysis.competitors) && (analysis.competitors as unknown[]).length > 0) {
    lines.push('## Benchmark');
    for (const c of analysis.competitors as Array<Record<string, unknown>>) {
      const name = typeof c.name === 'string' ? c.name : '—';
      const summary = typeof c.summary === 'string' ? c.summary : '';
      lines.push(`### ${name}`);
      if (summary) lines.push(summary);
      if (Array.isArray(c.strengths)) {
        lines.push('**Fortalezas:**');
        for (const s of c.strengths as unknown[]) {
          if (typeof s === 'string') lines.push(`- ${s}`);
        }
      }
      if (Array.isArray(c.weaknesses)) {
        lines.push('**Debilidades:**');
        for (const w of c.weaknesses as unknown[]) {
          if (typeof w === 'string') lines.push(`- ${w}`);
        }
      }
      lines.push('');
    }
  }

  if (posts.length > 0) {
    lines.push('## Posts destacados');
    const top = [...posts]
      .sort((a, b) => (b.likes ?? 0) + (b.comments ?? 0) - ((a.likes ?? 0) + (a.comments ?? 0)))
      .slice(0, 5);
    for (const p of top) {
      lines.push(
        `- [${p.platform}] ${p.caption?.slice(0, 120) ?? '(sin caption)'} — ${p.likes} likes, ${p.comments} comentarios`,
      );
    }
  }

  const content = lines.join('\n');
  const summary = `Análisis de ${competitor.name}: ${posts.length} posts, ${totals.likes} likes totales.`;
  const keyInsights: string[] = Array.isArray(analysis.insights)
    ? ((analysis.insights as unknown[]).filter((x): x is string => typeof x === 'string')).slice(0, 6)
    : [];

  const report = await prisma.report.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      title: `Competencia — ${competitor.name}`,
      reportType: 'competition',
      content,
      summary,
      keyInsights,
      sourceData: {
        competitor_id: competitor.id,
        competitor_name: competitor.name,
        totals,
        post_count: posts.length,
        analysis,
      } as object,
    },
  });
  return report;
}

function clip(text: string | null | undefined, max: number): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

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
      take: 8,
    }),
    prisma.socialPost.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ likes: 'desc' }],
      take: 20,
    }),
    prisma.report.findMany({
      where: { projectId: input.projectId, reportType: 'news' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.recommendation.findMany({
      where: { projectId: input.projectId, status: { in: ['new', 'saved', 'in_progress'] } },
      take: 10,
    }),
    prisma.memory.findMany({
      where: { projectId: input.projectId, category: { not: 'chat_summary' } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.scheduledPost.findMany({
      where: {
        projectId: input.projectId,
        status: 'scheduled',
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    }),
    prisma.contentAsset.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
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
    const pLines = socialPosts.slice(0, 12).map(
      (p) => `- ${p.platform} | likes=${p.likes} comments=${p.comments} views=${p.views} | ${clip(p.caption, 100)}`,
    );
    parts.push(`TOP POSTS COMPETIDORES:\n${pLines.join('\n')}`);
  }

  if (newsReports.length > 0) {
    const nItems: string[] = [];
    for (const r of newsReports.slice(0, 3)) {
      const sd = r.sourceData as { items?: Array<{ title?: string }> } | null;
      const items = Array.isArray(sd?.items) ? sd!.items!.slice(0, 4) : [];
      for (const it of items) {
        if (it.title) nItems.push(`- ${clip(it.title, 160)}`);
      }
    }
    if (nItems.length > 0) parts.push(`NOTICIAS RECIENTES:\n${nItems.slice(0, 10).join('\n')}`);
  }

  if (recommendations.length > 0) {
    const rLines = recommendations.map((r) => `- [${r.impact}] ${r.title} (${r.kind}/${r.status})`);
    parts.push(`RECOMENDACIONES ACTIVAS:\n${rLines.join('\n')}`);
  }

  if (memories.length > 0) {
    const mLines = memories.map((m) => `- [${m.category}] ${m.key ? `${m.key}: ` : ''}${clip(m.value, 150)}`);
    parts.push(`MEMORIA DEL PROYECTO:\n${mLines.join('\n')}`);
  }

  parts.push(`CALENDARIO: ${scheduledPosts.length} posts agendados. Assets totales: ${assets.length}`);

  const context = parts.join('\n\n').slice(0, 6000);

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
    content = await callOpenRouter({ system, user, temperature: 0.4 });
  } catch (err) {
    logger.warn({ err }, 'unified report generation failed, using fallback');
    content = `# Análisis Integral 360° — ${project.companyName ?? project.name}\n\nNo fue posible generar el informe automático. Datos disponibles:\n\n${context}`;
  }

  const summaryLine = content.split('\n').find((l) => l.trim().length > 40)?.slice(0, 280) ?? null;
  const keyInsightsArr: string[] = [];
  const bulletMatches = content.match(/^[-*]\s+(.+)$/gm) ?? [];
  keyInsightsArr.push(...bulletMatches.slice(0, 8).map((b) => b.replace(/^[-*]\s+/, '').slice(0, 200)));

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
