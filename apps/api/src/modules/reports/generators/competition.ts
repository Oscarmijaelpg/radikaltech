import { prisma } from '@radikal/db';

const COMPETITION_POSTS_LIMIT = 30;
const TOP_POSTS_LIMIT = 5;
const CAPTION_MAX_CHARS = 120;
const MAX_INSIGHTS = 6;

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
    take: COMPETITION_POSTS_LIMIT,
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
      .slice(0, TOP_POSTS_LIMIT);
    for (const p of top) {
      lines.push(
        `- [${p.platform}] ${p.caption?.slice(0, CAPTION_MAX_CHARS) ?? '(sin caption)'} — ${p.likes} likes, ${p.comments} comentarios`,
      );
    }
  }

  const content = lines.join('\n');
  const summary = `Análisis de ${competitor.name}: ${posts.length} posts, ${totals.likes} likes totales.`;
  const keyInsights: string[] = Array.isArray(analysis.insights)
    ? (analysis.insights as unknown[])
        .filter((x): x is string => typeof x === 'string')
        .slice(0, MAX_INSIGHTS)
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
