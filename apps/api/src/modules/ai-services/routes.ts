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
import { logger } from '../../lib/logger.js';
import { aiRateLimits } from '../../middleware/rate-limit.js';
import { ACTION_KEYS, withCredits } from '../../lib/credits.js';
import { creditService } from '../credits/service.js';
import { assertCompetitorOwnerOptional, assertOptionalProject } from './guards.js';
import { captionRequestSchema, handleGenerateCaption } from './caption-handler.js';

const rlAnalyzeWebsite = aiRateLimits.default('analyze-website');
const rlAnalyzeCompetitor = aiRateLimits.default('analyze-competitor');
const rlSynthesizeBrand = aiRateLimits.default('synthesize-brand');
const rlEvaluateContent = aiRateLimits.default('evaluate-content');
const rlScrapeInstagram = aiRateLimits.default('scrape-instagram');
const rlScrapeTiktok = aiRateLimits.default('scrape-tiktok');
const rlDetectCompetitors = aiRateLimits.default('detect-competitors');
const rlDetectMarkets = aiRateLimits.default('detect-markets');
const rlAnalyzeImage = aiRateLimits.default('analyze-image');
const rlGenerateCaption = aiRateLimits.default('generate-caption');
const rlDetectTrends = aiRateLimits.default('detect-trends');

export const aiServicesRouter = new Hono<{ Variables: AuthVariables }>();

aiServicesRouter.post(
  '/analyze-website',
  rlAnalyzeWebsite,
  zValidator('json', z.object({ url: z.string().url(), project_id: z.string().uuid().optional() })),
  async (c) => {
    const user = c.get('user');
    const { url, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.websiteAnalyze, metadata: { url, project_id } },
      () => websiteAnalyzer.analyze({ url, userId: user.id, projectId: project_id }),
    );
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/analyze-competitor',
  rlAnalyzeCompetitor,
  zValidator(
    'json',
    z.object({ query: z.string().min(1), project_id: z.string().uuid().optional() }),
  ),
  async (c) => {
    const user = c.get('user');
    const { query, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.competitorAnalyze, metadata: { query, project_id } },
      () => competitorAnalyzer.analyze({ query, userId: user.id, projectId: project_id }),
    );
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
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.brandSynthesize, metadata: { project_id } },
      () =>
        brandSynthesizer.synthesize({
          project,
          socialAccounts: socials.map((s) => ({
            platform: s.platform,
            source: s.source ?? 'none',
            url: s.url,
            manual_description: s.manualDescription,
          })),
          userId: user.id,
        }),
    );
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
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.contentEvaluate, metadata: { asset_id } },
      () => contentEvaluator.evaluate({ assetId: asset_id, userId: user.id }),
    );
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/aggregate-news',
  aiRateLimits.aggregateNews,
  zValidator(
    'json',
    z.object({ topic: z.string().min(1), project_id: z.string().uuid().optional() }),
  ),
  async (c) => {
    const user = c.get('user');
    const { topic, project_id } = c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.newsAggregate, metadata: { topic, project_id } },
      () => newsAggregator.aggregate({ topic, userId: user.id, projectId: project_id }),
    );
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
      mode: z.enum(['creative', 'referential']).optional().default('creative'),
      project_id: z.string().uuid().optional(),
      reference_asset_ids: z.array(z.string().uuid()).max(6).optional(),
      use_brand_palette: z.boolean().optional().default(true),
      variations: z.number().int().min(1).max(4).optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { prompt, size, style, mode, project_id, reference_asset_ids, use_brand_palette, variations } =
      c.req.valid('json');
    await assertOptionalProject(project_id, user.id);
    const res = await withCredits(
      {
        userId: user.id,
        actionKey: ACTION_KEYS.imageGenerate,
        metadata: { project_id, variations: variations ?? 1 },
      },
      () =>
        imageGenerator.generate({
          prompt,
          size,
          style,
          mode: mode as 'creative' | 'referential' | undefined,
          userId: user.id,
          projectId: project_id,
          referenceAssetIds: reference_asset_ids,
          useBrandPalette: use_brand_palette,
          variations,
        }),
    );
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
    const res = await withCredits(
      {
        userId: user.id,
        actionKey: ACTION_KEYS.imageEdit,
        metadata: { source_asset_id, project_id },
      },
      () =>
        imageGenerator.edit({
          sourceAssetId: source_asset_id,
          editInstruction: edit_instruction,
          userId: user.id,
          projectId: project_id,
        }),
    );
    return c.json(ok(res));
  },
);

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
    const result = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.imageAnalyze, metadata: { asset_id } },
      () => imageAnalyzer.analyze(asset.assetUrl),
    );
    if (result) {
      const prev = (asset.metadata as Record<string, unknown> | null) ?? {};
      // Save to metadata.visual_analysis (for structured data) AND ai_description (for modal display)
      const narrative = (result as Record<string, unknown>).full_narrative as string | undefined;
      await prisma.contentAsset.update({
        where: { id: asset.id },
        data: {
          metadata: { ...prev, visual_analysis: result } as unknown as Prisma.InputJsonValue,
          aiDescription: narrative || result.description || null,
        },
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

    // Cobro upfront. El orquestador maneja su propio AiJob internamente.
    // Si el background job falla, hacemos refund en el catch.
    const charge = await creditService.charge({
      userId: user.id,
      actionKey: ACTION_KEYS.brandAnalyze,
      metadata: { project_id },
    });

    void (async () => {
      try {
        await brandOrchestrator.analyze({
          projectId: project_id,
          userId: user.id,
        });
      } catch (err) {
        logger.error({ err, project_id }, 'background brand analysis failed');
        try {
          await creditService.refund({
            transactionId: charge.transactionId,
            reason: `brand.analyze fallido: ${err instanceof Error ? err.message : 'error'}`,
          });
        } catch (refundErr) {
          logger.warn({ err: refundErr }, '[credits] refund failed for brand.analyze');
        }
      }
    })();

    return c.json(ok({ status: 'running', message: 'Análisis de marca iniciado en segundo plano' }));
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

    const res = await withCredits(
      {
        userId: user.id,
        actionKey: ACTION_KEYS.instagramScrape,
        metadata: { handle: parsed, project_id, competitor_id },
      },
      () =>
        instagramScraper.scrape({
          handle: parsed,
          userId: user.id,
          projectId: project_id,
          competitorId: competitor_id,
        }),
    );
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

    const res = await withCredits(
      {
        userId: user.id,
        actionKey: ACTION_KEYS.tiktokScrape,
        metadata: { handle: parsed, project_id, competitor_id },
      },
      () =>
        tiktokScraper.scrape({
          handle: parsed,
          userId: user.id,
          projectId: project_id,
          competitorId: competitor_id,
        }),
    );
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

    // Cobro al instante; si la pipeline falla después, el void() refunda.
    // Fire-and-forget: la pipeline tarda 20-25s con Firecrawl + embeddings, así que
    // el cliente se quedaría esperando. Creamos un AiJob (en detector.detect), el
    // banner global lo muestra y useActiveJobs refresca /competitors cuando termina.
    const charge = await creditService.charge({
      userId: user.id,
      actionKey: ACTION_KEYS.autoCompetitorDetect,
      metadata: { project_id },
    });

    void (async () => {
      try {
        await autoCompetitorDetector.detect({ projectId: project_id, userId: user.id });
      } catch (err) {
        try {
          await creditService.refund({
            transactionId: charge.transactionId,
            reason: `auto_competitor.detect fallo: ${err instanceof Error ? err.message : 'error'}`,
          });
        } catch (refundErr) {
          logger.warn(
            { err: refundErr, userId: user.id, project_id },
            '[credits] auto-refund failed for auto_competitor.detect',
          );
        }
      }
    })();

    return c.json(ok({ started: true, transactionId: charge.transactionId }));
  },
);

aiServicesRouter.post(
  '/generate-caption',
  rlGenerateCaption,
  zValidator('json', captionRequestSchema),
  async (c) => {
    const user = c.get('user');
    return withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.captionGenerate },
      () => handleGenerateCaption(c),
    );
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

    // El scrape interno del websiteAnalyzer no cobra por sí mismo —
    // el precio de market.detect cubre toda la operación.
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.marketDetect, metadata: { project_id } },
      async () => {
        let markdown = '';
        if (project.websiteUrl) {
          try {
            const wa = await websiteAnalyzer.analyze({
              url: project.websiteUrl,
              userId: user.id,
              projectId: project_id,
            });
            markdown = wa.result.pages?.[0]?.excerpt ?? '';
          } catch {
            /* ignore website scrape failure */
          }
        }
        const result = await marketDetector.detect({
          projectId: project_id,
          userId: user.id,
          websiteMarkdown: markdown,
        });
        if (result.countries.length > 0) {
          await prisma.project.update({
            where: { id: project_id },
            data: { operatingCountriesSuggested: result.countries.join(', ') },
          });
        }
        return result;
      },
    );
    return c.json(ok(res));
  },
);

aiServicesRouter.post(
  '/detect-trends',
  rlDetectTrends,
  zValidator('json', z.object({ project_id: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    const res = await withCredits(
      { userId: user.id, actionKey: ACTION_KEYS.trendsDetect, metadata: { project_id } },
      () => trendingFinder.detect({ projectId: project_id, userId: user.id }),
    );
    return c.json(ok(res));
  },
);
