import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import {
  websiteAnalyzer,
  competitorAnalyzer,
  newsAggregator,
  brandSynthesizer,
  contentEvaluator,
  imageGenerator,
  instagramScraper,
  tiktokScraper,
  imageAnalyzer,
  brandOrchestrator,
  autoCompetitorDetector,
  marketDetector,
  trendingFinder,
  parseInstagramHandle,
  parseTikTokHandle,
} from './index.js';
import { prisma, Prisma } from '@radikal/db';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { aiRateLimits } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';

const rlAnalyzeWebsite = aiRateLimits.default('analyze-website');
const rlAnalyzeCompetitor = aiRateLimits.default('analyze-competitor');
const rlSynthesizeBrand = aiRateLimits.default('synthesize-brand');
const rlEvaluateContent = aiRateLimits.default('evaluate-content');
const rlScrapeInstagram = aiRateLimits.default('scrape-instagram');
const rlScrapeTiktok = aiRateLimits.default('scrape-tiktok');
const rlDetectCompetitors = aiRateLimits.default('detect-competitors');
const rlDetectMarkets = aiRateLimits.default('detect-markets');
const rlAnalyzeImage = aiRateLimits.default('analyze-image');

async function assertOptionalProject(projectId: string | undefined, userId: string) {
  if (!projectId) return;
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (p.userId !== userId) throw new Forbidden();
}

export const aiServicesRouter = new Hono<{ Variables: AuthVariables }>();

aiServicesRouter.post(
  '/analyze-website',
  rlAnalyzeWebsite,
  zValidator('json', z.object({ url: z.string().url(), project_id: z.string().uuid().optional() })),
  async (c) => {
    const user = c.get('user');
    const { url, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await websiteAnalyzer.analyze({ url, userId: user.id, projectId: project_id });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/analyze-competitor',
  rlAnalyzeCompetitor,
  zValidator('json', z.object({ query: z.string().min(1), project_id: z.string().uuid().optional() })),
  async (c) => {
    const user = c.get('user');
    const { query, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await competitorAnalyzer.analyze({ query, userId: user.id, projectId: project_id });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/synthesize-brand',
  rlSynthesizeBrand,
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    const socials = await prisma.socialAccount.findMany({ where: { projectId: project_id } });
    const res = await brandSynthesizer.synthesize({
      project,
      socialAccounts: socials.map((s) => ({
        platform: s.platform,
        source: s.source ?? 'none',
        url: s.url,
        manual_description: s.manualDescription,
      })),
      userId: user.id,
    });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/evaluate-content',
  rlEvaluateContent,
  zValidator('json', z.object({ asset_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { asset_id } = c.req.valid('json');
    const res = await contentEvaluator.evaluate({ assetId: asset_id, userId: user.id });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/aggregate-news',
  aiRateLimits.aggregateNews,
  zValidator('json', z.object({ topic: z.string().min(1), project_id: z.string().uuid().optional() })),
  async (c) => {
    const user = c.get('user');
    const { topic, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await newsAggregator.aggregate({ topic, userId: user.id, projectId: project_id });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/generate-image',
  aiRateLimits.generateImage,
  zValidator(
    'json',
    z.object({
      prompt: z.string().min(3).max(4000),
      size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
      style: z.enum(['vivid', 'natural']).optional(),
      project_id: z.string().uuid().optional(),
      reference_asset_ids: z.array(z.string().uuid()).max(6).optional(),
      use_brand_palette: z.boolean().optional().default(true),
      variations: z.number().int().min(1).max(4).optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { prompt, size, style, project_id, reference_asset_ids, use_brand_palette, variations } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await imageGenerator.generate({
      prompt,
      size,
      style,
      userId: user.id,
      projectId: project_id,
      referenceAssetIds: reference_asset_ids,
      useBrandPalette: use_brand_palette,
      variations,
    });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/edit-image',
  aiRateLimits.generateImage,
  zValidator(
    'json',
    z.object({
      source_asset_id: z.string().uuid(),
      edit_instruction: z.string().min(3).max(2000),
      project_id: z.string().uuid().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { source_asset_id, edit_instruction, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const source = await prisma.contentAsset.findUnique({ where: { id: source_asset_id } });
    if (!source) throw new NotFound('Asset not found');
    if (source.userId !== user.id) throw new Forbidden();
    const res = await imageGenerator.edit({
      sourceAssetId: source_asset_id,
      editInstruction: edit_instruction,
      userId: user.id,
      projectId: project_id,
    });
    return c.json(ok(res));
  },
);

async function assertCompetitorOwnerOptional(competitorId: string | undefined, userId: string) {
  if (!competitorId) return;
  const comp = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!comp) throw new NotFound('Competitor not found');
  if (comp.userId !== userId) throw new Forbidden();
}

aiServicesRouter.post(
  '/analyze-image',
  rlAnalyzeImage,
  zValidator('json', z.object({ asset_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { asset_id } = c.req.valid('json');
    const asset = await prisma.contentAsset.findUnique({ where: { id: asset_id } });
    if (!asset) throw new NotFound('Asset not found');
    if (asset.userId !== user.id) throw new Forbidden();
    const result = await imageAnalyzer.analyze(asset.assetUrl);
    if (result) {
      const prev = (asset.metadata as Record<string, unknown> | null) ?? {};
      await prisma.contentAsset.update({
        where: { id: asset.id },
        data: { metadata: { ...prev, visual_analysis: result } as unknown as Prisma.InputJsonValue },
      });
    }
    return c.json(ok({ asset_id, visual_analysis: result }));
  },
);

aiServicesRouter.post(
  '/analyze-brand',
  aiRateLimits.analyzeBrand,
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');

    // Crear placeholder running para que el polling lo detecte de inmediato
    const job = await prisma.aiJob.create({
      data: {
        kind: 'brand_analyze',
        status: 'running',
        input: { project_id } as unknown as Prisma.InputJsonValue,
        projectId: project_id,
        userId: user.id,
        startedAt: new Date(),
      },
    });

    // Fire-and-forget. El frontend ya hace polling con useActiveJobs y refresca
    // automáticamente las queries de marca/contenido cuando este job termina.
    void (async () => {
      try {
        const result = await brandOrchestrator.analyze({
          projectId: project_id,
          userId: user.id,
        });
        await prisma.aiJob.update({
          where: { id: job.id },
          data: {
            status: 'succeeded',
            output: result as unknown as Prisma.InputJsonValue,
            finishedAt: new Date(),
          },
        });
      } catch (err) {
        await prisma.aiJob
          .update({
            where: { id: job.id },
            data: { status: 'failed', error: String(err), finishedAt: new Date() },
          })
          .catch(() => {});
      }
    })();

    return c.json(ok({ jobId: job.id, status: 'running' }));
  },
);

aiServicesRouter.post(
  '/scrape-instagram',
  rlScrapeInstagram,
  zValidator(
    'json',
    z
      .object({
        handle: z.string().optional(),
        url: z.string().url().optional(),
        project_id: z.string().uuid(),
        competitor_id: z.string().uuid().optional(),
      })
      .refine((v) => !!(v.handle || v.url), { message: 'handle or url required' }),
  ),
  async (c) => {
    const user = c.get('user');
    const { handle, url, project_id, competitor_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    await assertCompetitorOwnerOptional(competitor_id, user.id);

    const parsed = parseInstagramHandle(handle ?? url ?? '');
    if (!parsed) throw new BadRequest('Invalid instagram handle or URL');

    const res = await instagramScraper.scrape({
      handle: parsed,
      userId: user.id,
      projectId: project_id,
      competitorId: competitor_id,
    });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/scrape-tiktok',
  rlScrapeTiktok,
  zValidator(
    'json',
    z
      .object({
        handle: z.string().optional(),
        url: z.string().url().optional(),
        project_id: z.string().uuid(),
        competitor_id: z.string().uuid().optional(),
      })
      .refine((v) => !!(v.handle || v.url), { message: 'handle or url required' }),
  ),
  async (c) => {
    const user = c.get('user');
    const { handle, url, project_id, competitor_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    await assertCompetitorOwnerOptional(competitor_id, user.id);

    const parsed = parseTikTokHandle(handle ?? url ?? '');
    if (!parsed) throw new BadRequest('Invalid tiktok handle or URL');

    const res = await tiktokScraper.scrape({
      handle: parsed,
      userId: user.id,
      projectId: project_id,
      competitorId: competitor_id,
    });
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/detect-competitors',
  rlDetectCompetitors,
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    const res = await autoCompetitorDetector.detect({ projectId: project_id, userId: user.id });
    return c.json(ok(res));
  },
);

const rlGenerateCaption = aiRateLimits.default('generate-caption');

const captionPlatformEnum = z.enum([
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'x',
  'threads',
  'pinterest',
  'youtube',
  'other',
]);

const PLATFORM_STYLE: Record<string, string> = {
  instagram: 'storytelling, emoji-friendly, CTAs',
  tiktok: 'directo, urgencia, tendencias',
  linkedin: 'profesional, valor tangible, hooks',
  facebook: 'conversacional, pregunta al final',
  x: 'punchy, <280 chars, hook fuerte',
  threads: 'conversacional, casual, hook corto',
  pinterest: 'inspiracional, descriptivo, keywords',
  youtube: 'hook fuerte, descripcion clara, CTA a ver',
  other: 'claro y conciso',
};

aiServicesRouter.post(
  '/generate-caption',
  rlGenerateCaption,
  zValidator(
    'json',
    z.object({
      asset_id: z.string().uuid().optional(),
      topic: z.string().max(500).optional(),
      platforms: z.array(captionPlatformEnum).min(1).max(9),
      tone: z.string().max(100).optional(),
      project_id: z.string().uuid().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { asset_id, topic, platforms, tone, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);

    if (!env.OPENROUTER_API_KEY) {
      throw new BadRequest('OPENROUTER_API_KEY no configurada');
    }

    // Asset description (if any)
    let assetDescription: string | null = null;
    if (asset_id) {
      const asset = await prisma.contentAsset.findUnique({ where: { id: asset_id } });
      if (asset) {
        if (asset.userId !== user.id) throw new Forbidden();
        const meta = (asset.metadata as Record<string, unknown> | null) ?? null;
        const visual = meta && typeof meta === 'object' ? (meta as Record<string, unknown>).visual_analysis : null;
        if (visual && typeof visual === 'object') {
          const desc = (visual as Record<string, unknown>).description;
          if (typeof desc === 'string') assetDescription = desc;
        }
        if (!assetDescription && asset.aiDescription) assetDescription = asset.aiDescription;
      }
    }

    // Brand context
    let companyName = 'la marca';
    let voiceTone = tone ?? '';
    let values: string[] = [];
    let targetAudience = '';
    if (project_id) {
      const [project, brandProfile] = await Promise.all([
        prisma.project.findUnique({ where: { id: project_id } }),
        prisma.brandProfile.findUnique({ where: { projectId: project_id } }),
      ]);
      if (project) {
        companyName = project.companyName ?? project.name ?? companyName;
      }
      if (brandProfile) {
        if (!voiceTone) voiceTone = brandProfile.voiceTone ?? '';
        values = brandProfile.brandValues ?? [];
        targetAudience = brandProfile.targetAudience ?? '';
      }
    }

    const subject = topic || assetDescription || 'Contenido de marca';
    const platformStyles = platforms.map((p) => `- ${p}: ${PLATFORM_STYLE[p] ?? PLATFORM_STYLE.other}`).join('\n');

    const system =
      'Eres un copywriter experto en redes sociales. Devuelves SOLO JSON válido, sin explicaciones.';
    const userPrompt = `Genera 3 variantes de caption en español para esta marca, para cada plataforma solicitada.

Marca: ${companyName}
Tono de marca: ${voiceTone || 'cercano, auténtico'}
Valores: ${values.slice(0, 6).join(', ') || 'N/A'}
Audiencia: ${targetAudience || 'general'}
Tema/imagen: ${subject}
Plataformas: ${platforms.join(', ')}

Por cada plataforma genera 3 captions DISTINTAS (corta/media/larga), cada una con:
- caption (sin hashtags al final, deja espacio para ellos)
- hashtags: 5-10 hashtags relevantes (sin #)
- emoji_suggested: 2-3 emojis sugeridos

Estilo específico por plataforma:
${platformStyles}

Devuelve SOLO JSON con esta forma exacta:
{ "per_platform": { "<platform>": { "variants": [{ "length": "short|medium|long", "caption": "...", "hashtags": ["tag1","tag2"], "emoji_suggested": ["✨","🔥"] }] } } }`;

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.8,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      throw new BadRequest(`OpenRouter error: ${r.status}`);
    }
    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequest('Respuesta IA inválida');
    }
    return c.json(ok(parsed));
  },
);

aiServicesRouter.post(
  '/detect-markets',
  rlDetectMarkets,
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    // Force a website scrape to get fresh markdown
    let markdown = '';
    if (project.websiteUrl) {
      try {
        const wa = await websiteAnalyzer.analyze({
          url: project.websiteUrl,
          userId: user.id,
          projectId: project_id,
        });
        markdown = wa.result.pages?.[0]?.excerpt ?? '';
      } catch {}
    }
    const res = await marketDetector.detect({
      projectId: project_id,
      userId: user.id,
      websiteMarkdown: markdown,
    });
    if (res.countries.length > 0) {
      await prisma.project.update({
        where: { id: project_id },
        data: { operatingCountriesSuggested: res.countries },
      });
    }
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/detect-trends',
  aiRateLimits.default('detect-trends'),
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    const res = await trendingFinder.detect({ projectId: project_id, userId: user.id });
    return c.json(ok(res));
  },
);
