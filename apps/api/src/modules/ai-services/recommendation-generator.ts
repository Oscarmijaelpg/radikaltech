import { prisma, Prisma, type Recommendation, RecommendationKind, RecommendationImpact } from '@radikal/db';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { NotFound, Forbidden, BadRequest } from '../../lib/errors.js';
import { embeddingsService } from './embeddings.js';

export interface GenerateRecommendationsInput {
  projectId: string;
  userId: string;
}

const VALID_KINDS: RecommendationKind[] = [
  'post',
  'campaign',
  'strategy',
  'report',
  'content_improvement',
  'competitor_response',
  'news_reaction',
];
const VALID_IMPACT: RecommendationImpact[] = ['high', 'medium', 'low'];
const VALID_ACTION_KINDS = [
  'navigate_image_gen',
  'navigate_chat',
  'create_scheduled_post',
  'open_competitor',
  'generate_report',
  'open_news',
  'custom',
] as const;

interface RawRecommendation {
  kind?: string;
  title?: string;
  why?: string;
  action_label?: string;
  action_kind?: string;
  action_payload?: Record<string, unknown>;
  impact?: string;
  sources?: Array<{
    type?: string;
    id?: string;
    title?: string;
    url?: string;
  }>;
}

function clampStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function trimContext(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

export class RecommendationGenerator {
  async generate(input: GenerateRecommendationsInput): Promise<Recommendation[]> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== input.userId) throw new Forbidden();

    // 1. Fetch context in parallel
    const [
      brandProfile,
      competitors,
      socialPosts,
      newsReports,
      scheduledPosts,
      lowQualityAssets,
      chatSummaries,
      brandInsights,
      ideas,
    ] = await Promise.all([
      prisma.brandProfile.findUnique({ where: { projectId: input.projectId } }),
      prisma.competitor.findMany({
        where: { projectId: input.projectId, status: 'confirmed' },
        take: 8,
      }),
      prisma.socialPost.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ likes: 'desc' }],
        take: 15,
      }),
      prisma.report.findMany({
        where: { projectId: input.projectId, reportType: 'news' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.scheduledPost.findMany({
        where: {
          projectId: input.projectId,
          status: 'scheduled',
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20,
      }),
      prisma.contentAsset.findMany({
        where: {
          projectId: input.projectId,
          aestheticScore: { lt: 6, not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.memory.findMany({
        where: { projectId: input.projectId, category: 'chat_summary' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.memory.findMany({
        where: { projectId: input.projectId, category: 'brand_insight' },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      prisma.memory.findMany({
        where: { projectId: input.projectId, category: 'idea' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    // 2. Build compact context (~4000 chars)
    const parts: string[] = [];
    parts.push(
      `MARCA:\n- Nombre: ${project.companyName ?? project.name}\n- Industria: ${project.industry ?? project.industryCustom ?? 'N/A'}\n- Resumen: ${clampStr(project.businessSummary, 400)}\n- Valor único: ${clampStr(project.uniqueValue, 200)}\n- Productos: ${clampStr(project.mainProducts, 200)}`,
    );

    if (brandProfile) {
      parts.push(
        `BRAND_PROFILE:\n- Voz/Tono: ${clampStr(brandProfile.voiceTone, 200)}\n- Valores: ${(brandProfile.brandValues ?? []).slice(0, 6).join(', ')}\n- Audiencia: ${clampStr(brandProfile.targetAudience, 200)}\n- Dirección visual: ${clampStr(brandProfile.visualDirection, 200)}`,
      );
    }

    if (competitors.length > 0) {
      const cList = competitors
        .slice(0, 6)
        .map((c) => {
          const stats = (c.engagementStats as Record<string, unknown> | null) ?? null;
          const avgLikes = stats && typeof stats.avg_likes === 'number' ? stats.avg_likes : null;
          return `- [id=${c.id}] ${c.name}${avgLikes ? ` (avg likes ${avgLikes})` : ''}${c.notes ? ` — ${clampStr(c.notes, 120)}` : ''}`;
        })
        .join('\n');
      parts.push(`COMPETIDORES:\n${cList}`);
    }

    if (socialPosts.length > 0) {
      const pList = socialPosts
        .slice(0, 10)
        .map(
          (p) =>
            `- ${p.platform} likes=${p.likes} comments=${p.comments}: ${clampStr(p.caption ?? '', 140)}`,
        )
        .join('\n');
      parts.push(`TOP_POSTS_COMPETIDORES:\n${pList}`);
    }

    if (newsReports.length > 0) {
      const nItems: string[] = [];
      for (const r of newsReports.slice(0, 3)) {
        const sd = r.sourceData as { items?: Array<{ title?: string; url?: string }> } | null;
        const items = Array.isArray(sd?.items) ? sd!.items!.slice(0, 3) : [];
        for (const it of items) {
          if (it.title) nItems.push(`- ${clampStr(it.title, 160)} [${it.url ?? ''}]`);
        }
      }
      if (nItems.length > 0) parts.push(`NOTICIAS_RECIENTES:\n${nItems.slice(0, 8).join('\n')}`);
    }

    if (scheduledPosts.length > 0) {
      parts.push(
        `CALENDARIO (14d): ${scheduledPosts.length} posts agendados. Próximos: ${scheduledPosts
          .slice(0, 5)
          .map((p) => p.scheduledAt.toISOString().slice(0, 10))
          .join(', ')}`,
      );
    } else {
      parts.push(`CALENDARIO (14d): 0 posts agendados. Hay huecos importantes.`);
    }

    if (lowQualityAssets.length > 0) {
      const a = lowQualityAssets
        .slice(0, 4)
        .map((x) => `- [id=${x.id}] score=${x.aestheticScore?.toString() ?? '?'}: ${clampStr(x.aiDescription ?? '', 100)}`)
        .join('\n');
      parts.push(`ASSETS_BAJO_SCORE:\n${a}`);
    }

    if (chatSummaries.length > 0) {
      const m = chatSummaries
        .slice(0, 4)
        .map((s) => `- ${clampStr(s.value, 200)}`)
        .join('\n');
      parts.push(`MEMORIA_CHATS:\n${m}`);
    }

    if (brandInsights.length > 0) {
      const bi = brandInsights
        .slice(0, 6)
        .map((s) => `- ${s.key ? `${s.key}: ` : ''}${clampStr(s.value, 180)}`)
        .join('\n');
      parts.push(`INSIGHTS_DE_MARCA (guardados por el usuario en chats):\n${bi}`);
    }

    if (ideas.length > 0) {
      const id = ideas
        .slice(0, 4)
        .map((s) => `- ${s.key ? `${s.key}: ` : ''}${clampStr(s.value, 180)}`)
        .join('\n');
      parts.push(`IDEAS_GUARDADAS:\n${id}`);
    }

    // Competitor gaps: detect content/format gaps
    if (competitors.length > 0 && socialPosts.length > 0) {
      const compFormats = new Set<string>();
      const compDays = new Set<number>();
      for (const p of socialPosts) {
        if (p.postType) compFormats.add(p.postType);
        if (p.postedAt) compDays.add(new Date(p.postedAt).getDay());
      }
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const emptyDays = allDays.filter((d) => !compDays.has(d)).map((d) => dayNames[d]);
      const gapLines: string[] = [];
      if (emptyDays.length > 0) {
        gapLines.push(`- Días sin competencia: ${emptyDays.join(', ')} (oportunidad para diferenciarse)`);
      }
      gapLines.push(`- Formatos que usan competidores: ${[...compFormats].join(', ')}`);
      if (gapLines.length > 0) {
        parts.push(`GAPS_COMPETITIVOS:\n${gapLines.join('\n')}`);
      }
    }

    const context = trimContext(parts.join('\n\n'), 5000);

    // 3. LLM call
    if (!env.OPENROUTER_API_KEY) {
      throw new BadRequest('OPENROUTER_API_KEY not configured');
    }

    const systemPrompt = `Eres un estratega de marca senior. Tienes el contexto completo de una marca y debes proponer 6-12 RECOMENDACIONES ACCIONABLES ordenadas por impacto.

Cada recomendación debe:
- Basarse en datos concretos del contexto (menciona qué dato la dispara).
- Proponer UNA acción clara y medible (no vaguedad).
- Ser específica de ESTA marca, no genérica.

Tipos de recomendación:
- post: "genera un post sobre X tema con Y referencias"
- campaign: "lanza campaña de 3-5 piezas sobre Z"
- content_improvement: "mejora el asset actual con aesthetic bajo"
- competitor_response: "tu competidor X está haciendo Y, considera hacer Z para diferenciarte"
- news_reaction: "hay una noticia relevante [N], responde con contenido antes que la competencia"
- strategy: "ajusta tu estrategia de publicación según patrón detectado"
- report: "genera reporte completo de X"

Devuelve SOLO JSON con { recommendations: [{ kind, title, why, action_label, action_kind, action_payload, impact, sources }] }.

action_kind puede ser: "navigate_image_gen" (payload { prompt, size, use_brand_palette }), "navigate_chat" (payload { agent_id, initial_message }), "create_scheduled_post" (payload { platforms, caption, scheduled_at_hint }), "open_competitor" (payload { competitor_id }), "generate_report" (payload { type, topic? }), "open_news" (payload { topic }), "custom" (payload libre).

sources: array de objetos { type: "news"|"competitor"|"brand"|"asset"|"memory", id?, title, url? } — las referencias que hicieron nacer la recomendación.

impact: "high" si responde a algo urgente/con data fuerte, "medium" normal, "low" nice-to-have.

Devuelve 6-12 recomendaciones.`;

    const userPrompt = `CONTEXTO DEL PROYECTO:

${context}

Devuelve SOLO JSON válido con la estructura pedida.`;

    let raw: { recommendations?: RawRecommendation[] } = {};
    try {
      const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.WEB_URL,
          'X-Title': 'Radikal',
        },
        body: JSON.stringify({
          model: LLM_MODELS.chat.openrouter,
          response_format: { type: 'json_object' },
          temperature: 0.5,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const text = await res.text();
        logger.error({ status: res.status, text: text.slice(0, 300) }, 'openrouter recommendation failed');
        throw new BadRequest('AI provider error');
      }
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content ?? '{}';
      raw = JSON.parse(content);
    } catch (err) {
      logger.error({ err }, 'recommendation generator failed during LLM call');
      throw err instanceof Error ? err : new BadRequest('AI generation failed');
    }

    const rawList = Array.isArray(raw.recommendations) ? raw.recommendations : [];
    if (rawList.length === 0) {
      logger.warn('recommendation generator returned 0 items');
      return [];
    }

    // 4. Validate + prepare
    const toCreate = rawList
      .map((r): Prisma.RecommendationUncheckedCreateInput | null => {
        const kind = VALID_KINDS.includes(r.kind as RecommendationKind)
          ? (r.kind as RecommendationKind)
          : null;
        const title = clampStr(r.title, 300).trim();
        const why = clampStr(r.why, 1000).trim();
        const actionLabel = clampStr(r.action_label, 120).trim();
        const actionKind =
          typeof r.action_kind === 'string' &&
          (VALID_ACTION_KINDS as readonly string[]).includes(r.action_kind)
            ? r.action_kind
            : 'custom';
        if (!kind || !title || !why || !actionLabel) return null;
        const impact = VALID_IMPACT.includes(r.impact as RecommendationImpact)
          ? (r.impact as RecommendationImpact)
          : 'medium';
        const sources = Array.isArray(r.sources)
          ? r.sources
              .filter((s) => s && typeof s === 'object')
              .slice(0, 8)
              .map((s) => ({
                type: String(s.type ?? 'brand'),
                id: s.id ? String(s.id) : undefined,
                title: s.title ? clampStr(s.title, 200) : undefined,
                url: s.url ? clampStr(s.url, 500) : undefined,
              }))
          : [];
        return {
          projectId: input.projectId,
          userId: input.userId,
          kind,
          title,
          why,
          actionLabel,
          actionKind,
          actionPayload:
            r.action_payload && typeof r.action_payload === 'object'
              ? (r.action_payload as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          impact,
          sources: sources as unknown as Prisma.InputJsonValue,
          status: 'new',
        };
      })
      .filter((x): x is Prisma.RecommendationUncheckedCreateInput => x !== null)
      .slice(0, 12);

    if (toCreate.length === 0) return [];

    // 5. Dismiss prior 'new' recommendations for this project
    await prisma.recommendation.updateMany({
      where: { projectId: input.projectId, status: 'new' },
      data: { status: 'dismissed' },
    });

    // 6. Insert new ones (return full rows)
    const created: Recommendation[] = [];
    for (const data of toCreate) {
      try {
        const rec = await prisma.recommendation.create({ data });
        created.push(rec);
      } catch (err) {
        logger.warn({ err }, 'failed to persist recommendation');
      }
    }
    logger.info({ projectId: input.projectId, count: created.length }, 'recommendations generated');
    if (created.length > 0) {
      try {
        const { notificationService } = await import('../notifications/service.js');
        void notificationService.recommendationsGenerated(input.userId, input.projectId, created.length);
      } catch {}
    }
    return created;
  }
}
