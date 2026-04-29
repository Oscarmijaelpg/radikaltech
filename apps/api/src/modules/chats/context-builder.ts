import { prisma } from '@radikal/db';
import { embeddingsService } from '../ai-services/embeddings.js';

const CONTEXT_MAX_CHARS = 4500;
const RECENT_COMPETITORS = 3;
const RECENT_CHAT_SUMMARIES = 10;
const RECENT_RECOMMENDATIONS = 5;
const RECENT_REPORTS = 3;
const UPCOMING_POSTS = 5;
const UPCOMING_POSTS_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEMANTIC_MEMORIES_LIMIT = 3;
const SEMANTIC_MEMORIES_THRESHOLD = 0.75;
const MEMORY_BLEND_MIN = 3;
const MEMORY_SLOTS_TOTAL = 5;

const STOPWORDS = new Set([
  'para',
  'como',
  'pero',
  'porque',
  'cuando',
  'donde',
  'entonces',
  'sobre',
  'entre',
  'todo',
  'todos',
  'esta',
  'este',
  'estos',
  'estas',
  'eso',
  'esa',
  'ese',
  'muy',
  'más',
  'mas',
  'menos',
  'también',
  'tambien',
  'tanto',
  'hacer',
  'hace',
  'hacia',
  'nuestro',
  'nuestra',
  'vuestro',
  'vuestra',
  'cuál',
  'cual',
  'cuáles',
  'cuales',
  'puede',
  'pueden',
  'quiero',
  'quieres',
  'debería',
  'deberia',
  'tengo',
  'tiene',
  'tienen',
  'estar',
  'estoy',
  'están',
  'estan',
  'fueron',
  'fueras',
  'siendo',
  'hasta',
  'desde',
  'otros',
  'otras',
  'algún',
  'algun',
  'alguna',
  'alguno',
  'ningún',
  'ningun',
  'ninguna',
  'puedo',
  'sabes',
  'decir',
  'bueno',
  'buena',
  'malo',
  'mala',
  'mejor',
  'peor',
  'cosa',
  'cosas',
]);

function extractKeywords(text: string, max = 5): string[] {
  const clean = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of clean) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

function clip(text: string | null | undefined, max: number): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export interface BuildContextInput {
  chatId: string;
  userId: string;
  projectId: string | null;
  agentId: string;
  userMessage: string;
}

export class ChatContextBuilder {
  private readonly maxChars = CONTEXT_MAX_CHARS;

  async build(input: BuildContextInput): Promise<string> {
    if (!input.projectId) return '';

    const [project, brand, competitors, summaries, recentRecs, recentReports, scheduledPosts] = await Promise.all([
      prisma.project.findUnique({
        where: { id: input.projectId },
        select: {
          companyName: true,
          name: true,
          industry: true,
          industryCustom: true,
          businessSummary: true,
          uniqueValue: true,
          idealCustomer: true,
        },
      }),
      prisma.brandProfile.findUnique({
        where: { projectId: input.projectId },
        select: {
          essence: true,
          voiceTone: true,
          targetAudience: true,
          brandValues: true,
          mission: true,
          vision: true,
        },
      }),
      prisma.competitor.findMany({
        where: { projectId: input.projectId, status: 'confirmed' },
        select: { name: true, notes: true, analysisData: true, engagementStats: true },
        orderBy: { createdAt: 'desc' },
        take: RECENT_COMPETITORS,
      }),
      prisma.memory.findMany({
        where: {
          projectId: input.projectId,
          category: 'chat_summary',
        },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_CHAT_SUMMARIES,
      }),
      prisma.recommendation.findMany({
        where: { projectId: input.projectId, status: { in: ['new', 'saved', 'in_progress'] } },
        orderBy: { generatedAt: 'desc' },
        take: RECENT_RECOMMENDATIONS,
        select: { title: true, kind: true, impact: true, status: true },
      }),
      prisma.report.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_REPORTS,
        select: { title: true, reportType: true, createdAt: true, summary: true },
      }),
      prisma.scheduledPost.findMany({
        where: {
          projectId: input.projectId,
          status: 'scheduled',
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + UPCOMING_POSTS_WINDOW_DAYS * DAY_MS),
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: UPCOMING_POSTS,
        select: { scheduledAt: true, platforms: true, caption: true },
      }),
    ]);

    if (!project) return '';

    // --- Memory retrieval: semantic first, keyword fallback, blend if sparse ---
    let memories: Array<{ category: string; value: string; key: string }> = [];
    const semantic = await embeddingsService
      .findSimilarMemories({
        projectId: input.projectId,
        query: input.userMessage,
        limit: SEMANTIC_MEMORIES_LIMIT,
        threshold: SEMANTIC_MEMORIES_THRESHOLD,
      })
      .catch(() => []);
    if (semantic.length > 0) {
      memories = semantic.map((m) => ({ category: m.category, value: m.value, key: m.key }));
    }

    if (memories.length < MEMORY_BLEND_MIN) {
      const keywords = extractKeywords(input.userMessage);
      const slotsLeft = MEMORY_SLOTS_TOTAL - memories.length;
      const seen = new Set(memories.map((m) => `${m.key}|${m.value}`));
      let keywordHits: Array<{ category: string; value: string; key: string }> = [];
      if (keywords.length > 0) {
        keywordHits = await prisma.memory.findMany({
          where: {
            projectId: input.projectId,
            category: { not: 'chat_summary' },
            OR: keywords.flatMap((k) => [
              { value: { contains: k, mode: 'insensitive' as const } },
              { key: { contains: k, mode: 'insensitive' as const } },
            ]),
          },
          select: { category: true, value: true, key: true },
          orderBy: { updatedAt: 'desc' },
          take: slotsLeft + 2,
        });
      }
      if (keywordHits.length === 0 && memories.length === 0) {
        keywordHits = await prisma.memory.findMany({
          where: { projectId: input.projectId, category: { not: 'chat_summary' } },
          select: { category: true, value: true, key: true },
          orderBy: { updatedAt: 'desc' },
          take: slotsLeft,
        });
      }
      for (const m of keywordHits) {
        const key = `${m.key}|${m.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        memories.push(m);
        if (memories.length >= 5) break;
      }
    }

    // Filter chat_summary by agent_id in metadata
    const agentSummaries = summaries
      .filter((s) => {
        const meta = s.metadata as { agent_id?: string } | null;
        return meta?.agent_id === input.agentId;
      })
      .slice(0, 3);

    const sections: string[] = [];

    const brandLines: string[] = [];
    const projName = project.companyName || project.name;
    if (projName) brandLines.push(`Proyecto: ${projName}`);
    const industry = project.industry || project.industryCustom;
    if (industry) brandLines.push(`Industria: ${industry}`);
    if (project.businessSummary) brandLines.push(`Negocio: ${clip(project.businessSummary, 400)}`);
    if (project.uniqueValue) brandLines.push(`Valor único: ${clip(project.uniqueValue, 300)}`);
    if (project.idealCustomer) brandLines.push(`Cliente ideal: ${clip(project.idealCustomer, 300)}`);
    if (brandLines.length > 0) {
      sections.push(`=== CONTEXTO DE LA MARCA ===\n${brandLines.join('\n')}`);
    }

    if (brand) {
      const idLines: string[] = [];
      if (brand.voiceTone) idLines.push(`Tono: ${clip(brand.voiceTone, 200)}`);
      if (brand.essence) idLines.push(`Esencia: ${clip(brand.essence, 300)}`);
      if (brand.targetAudience) idLines.push(`Audiencia: ${clip(brand.targetAudience, 300)}`);
      if (brand.brandValues && brand.brandValues.length > 0) {
        idLines.push(`Valores: ${brand.brandValues.join(', ')}`);
      }
      if (brand.mission) idLines.push(`Misión: ${clip(brand.mission, 200)}`);
      if (brand.vision) idLines.push(`Visión: ${clip(brand.vision, 200)}`);
      if (idLines.length > 0) {
        sections.push(`=== IDENTIDAD DE MARCA ===\n${idLines.join('\n')}`);
      }
    }

    if (memories.length > 0) {
      const memLines = memories.map(
        (m) => `- [${m.category}] ${m.key ? `${m.key}: ` : ''}${clip(m.value, 200)}`,
      );
      sections.push(`=== MEMORIAS RELEVANTES ===\n${memLines.join('\n')}`);
    }

    if (agentSummaries.length > 0) {
      const sumLines = agentSummaries.map((s) => `- ${clip(s.value, 300)}`);
      sections.push(
        `=== CONVERSACIONES PREVIAS ===\n(Resumen de chats anteriores con este mismo agente)\n${sumLines.join('\n')}`,
      );
    }

    if (competitors.length > 0) {
      const compLines = competitors.map((c) => {
        let summary = '';
        if (c.analysisData && typeof c.analysisData === 'object') {
          const ad = c.analysisData as Record<string, unknown>;
          const candidate =
            (typeof ad.summary === 'string' && ad.summary) ||
            (typeof ad.description === 'string' && ad.description) ||
            (typeof ad.positioning === 'string' && ad.positioning) ||
            '';
          summary = candidate;
        }
        if (!summary && c.notes) summary = c.notes;
        const stats = c.engagementStats as Record<string, unknown> | null;
        const avgEng = stats && typeof stats.avg_engagement === 'number' ? ` (eng.avg=${Math.round(stats.avg_engagement as number)})` : '';
        return `- ${c.name}${avgEng}${summary ? `: ${clip(summary, 180)}` : ''}`;
      });
      sections.push(`=== COMPETIDORES PRINCIPALES ===\n${compLines.join('\n')}`);
    }

    if (recentRecs.length > 0) {
      const recLines = recentRecs.map(
        (r) => `- [${r.impact}/${r.status}] ${r.title} (${r.kind})`,
      );
      sections.push(`=== RECOMENDACIONES ACTIVAS ===\n${recLines.join('\n')}`);
    }

    if (recentReports.length > 0) {
      const repLines = recentReports.map(
        (r) => `- ${r.title} (${r.reportType}, ${new Date(r.createdAt).toLocaleDateString('es')})${r.summary ? `: ${clip(r.summary, 120)}` : ''}`,
      );
      sections.push(`=== REPORTES RECIENTES ===\n${repLines.join('\n')}`);
    }

    if (scheduledPosts.length > 0) {
      const postLines = scheduledPosts.map(
        (p) => `- ${new Date(p.scheduledAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} en ${(p.platforms ?? []).join(',') || 'general'}: ${clip(p.caption, 80)}`,
      );
      sections.push(`=== CALENDARIO (14d) ===\n${postLines.join('\n')}`);
    } else {
      sections.push(`=== CALENDARIO (14d) ===\nSin posts agendados en los próximos 14 días.`);
    }

    if (sections.length === 0) return '';

    const footer =
      '(Usa esta información como contexto. NO menciones que tienes contexto externo; respondes como si ya conocieras la marca.)';

    let result = `${sections.join('\n\n')}\n\n${footer}`;
    if (result.length > this.maxChars) {
      result = `${result.slice(0, this.maxChars - 1)}…`;
    }
    return result;
  }
}
