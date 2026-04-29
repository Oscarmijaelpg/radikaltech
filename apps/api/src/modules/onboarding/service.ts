import { prisma, type Prisma } from '@radikal/db';
import { z } from 'zod';
import { BadRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import {
  instagramScraper,
  tiktokScraper,
  websiteAnalyzer,
  brandOrchestrator,
  parseInstagramHandle,
  parseTikTokHandle,
} from '../ai-services/index.js';

// --- Step schemas (alineados con el frontend @radikal/shared) ---

const companyStepSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(120),
  industry_custom: z.string().max(120).nullish(),
  website_source: z.enum(['url', 'manual', 'none']).default('none'),
  website_url: z.string().url().nullish(),
  website_manual_description: z.string().max(4000).nullish(),
  business_summary: z.string().max(4000).nullish(),
  ideal_customer: z.string().max(2000).nullish(),
  unique_value: z.string().max(2000).nullish(),
  main_products: z.string().max(2000).nullish(),
  additional_context: z.string().max(4000).nullish(),
});

const socialAccountSchema = z
  .object({
    platform: z.enum([
      'instagram',
      'tiktok',
      'linkedin',
      'youtube',
      'facebook',
      'x',
      'threads',
      'pinterest',
      'other',
    ]),
    platform_custom: z.string().max(80).nullish(),
    source: z.enum(['url', 'manual', 'none']).default('none'),
    url: z.string().url().nullish(),
    handle: z.string().max(120).nullish(),
    manual_description: z.string().max(4000).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.source === 'url' && !v.url) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'url required when source=url' });
    }
    if (v.source === 'manual' && (!v.manual_description || v.manual_description.trim().length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['manual_description'],
        message: 'manual_description must be at least 10 chars when source=manual',
      });
    }
  });

const socialsStepSchema = z.object({
  accounts: z.array(socialAccountSchema).default([]),
});

const brandStepSchema = z.object({
  tone_of_voice: z.string().nullish(),
  personality: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  target_audience: z.string().nullish(),
  brand_story: z.string().nullish(),
  keywords: z.array(z.string()).optional(),
  forbidden_words: z.array(z.string()).optional(),
  color_palette: z.array(z.string()).optional(),
  fonts: z.array(z.string()).optional(),
  logo_url: z.string().url().nullish(),
});

const objectivesStepSchema = z.object({
  objectives: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).nullish(),
        priority: z.number().int().min(0).optional(),
        target_date: z.string().datetime({ offset: true }).nullish(),
      }),
    )
    .default([]),
});

export const stepBodySchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('company'), data: companyStepSchema }),
  z.object({ step: z.literal('socials'), data: socialsStepSchema }),
  z.object({ step: z.literal('brand'), data: brandStepSchema }),
  z.object({ step: z.literal('objectives'), data: objectivesStepSchema }),
]);

export type StepBody = z.infer<typeof stepBodySchema>;

function mapToPrismaStep(
  step: 'company' | 'socials' | 'brand' | 'objectives' | 'complete',
): 'welcome' | 'company' | 'socials' | 'brand' | 'objectives' | 'completed' {
  if (step === 'complete') return 'completed';
  return step;
}

// --- Helpers ---
async function getOrCreateDefaultProject(userId: string) {
  let project = await prisma.project.findFirst({
    where: { userId, isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { userId, name: 'Mi proyecto', isDefault: true },
    });
  }
  return project;
}

export const onboardingService = {
  async getState(userId: string) {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    const project = await prisma.project.findFirst({
      where: { userId, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });

    const socials = project
      ? await prisma.socialAccount.findMany({ where: { projectId: project.id } })
      : [];
    const brand = project
      ? await prisma.brandProfile.findUnique({ where: { projectId: project.id } })
      : null;
    const objectives = project
      ? await prisma.objective.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    return {
      currentStep: profile?.onboardingStep ?? 'welcome',
      onboarding_completed: profile?.onboardingCompleted ?? false,
      data: {
        company: project
          ? {
              company_name: project.companyName ?? project.name,
              industry: project.industry ?? '',
              industry_custom: project.industryCustom,
              website_source: project.websiteSource ?? 'none',
              website_url: project.websiteUrl,
              website_manual_description: project.websiteManualDescription,
              business_summary: project.businessSummary,
              ideal_customer: project.idealCustomer,
              unique_value: project.uniqueValue,
              main_products: project.mainProducts,
              additional_context: project.additionalContext,
            }
          : null,
        socials: {
          accounts: socials.map((s) => ({
            platform: s.platform,
            platform_custom: s.platformCustom,
            source: s.source ?? 'none',
            url: s.url,
            handle: s.handle,
            manual_description: s.manualDescription,
          })),
        },
        brand: brand
          ? {
              tone_of_voice: brand.voiceTone,
              values: brand.brandValues,
              target_audience: brand.targetAudience,
              brand_story: brand.essence,
              keywords: brand.keywords,
            }
          : null,
        objectives: {
          objectives: objectives.map((o) => ({
            title: o.name,
            description: o.description,
            target_date: o.deadline?.toISOString() ?? null,
          })),
        },
      },
    };
  },

  async applyStep(userId: string, body: StepBody) {
    switch (body.step) {
      case 'company': {
        const d = body.data;
        const project = await getOrCreateDefaultProject(userId);
        const previousUrl = project.websiteUrl ?? null;
        const updated = await prisma.project.update({
          where: { id: project.id },
          data: {
            name: d.company_name,
            companyName: d.company_name,
            industry: d.industry,
            industryCustom: d.industry_custom ?? null,
            websiteSource: d.website_source,
            websiteUrl: d.website_url ?? null,
            websiteManualDescription: d.website_manual_description ?? null,
            businessSummary: d.business_summary ?? null,
            idealCustomer: d.ideal_customer ?? null,
            uniqueValue: d.unique_value ?? null,
            mainProducts: d.main_products ?? null,
            additionalContext: d.additional_context ?? null,
          },
        });
        await prisma.profile.update({
          where: { id: userId },
          data: { onboardingStep: mapToPrismaStep('socials') },
        });

        // Fire-and-forget website analysis if source=url and URL changed
        if (
          d.website_source === 'url' &&
          d.website_url &&
          d.website_url !== previousUrl
        ) {
          // Lanzamos el análisis profundo (hasta 30 páginas) en segundo plano
          void brandOrchestrator
            .analyze({ projectId: updated.id, userId })
            .catch((err) =>
              logger.warn({ err, url: d.website_url }, 'onboarding website auto-analyze failed'),
            );
        }

        return { project: updated, next_step: 'socials' as const };
      }

      case 'socials': {
        const project = await getOrCreateDefaultProject(userId);
        await prisma.socialAccount.deleteMany({ where: { projectId: project.id } });
        if (body.data.accounts.length) {
          await prisma.socialAccount.createMany({
            data: body.data.accounts.map((a) => {
              // Auto-extract handle from URL if not provided
              let handle = a.handle ?? null;
              if (!handle && a.url && a.platform === 'instagram') {
                handle = parseInstagramHandle(a.url);
              }
              return {
                projectId: project.id,
                userId,
                platform: a.platform,
                platformCustom: a.platform_custom ?? null,
                source: a.source,
                url: a.url ?? null,
                handle,
                manualDescription: a.manual_description ?? null,
              };
            }),
          });
        }
        await prisma.profile.update({
          where: { id: userId },
          data: { onboardingStep: mapToPrismaStep('brand') },
        });

        // Fire-and-forget scrape paralelo para instagram y tiktok con source=url
        const scrapes: Array<{ platform: string; handle: string; promise: Promise<unknown> }> = [];
        for (const a of body.data.accounts) {
          if (a.source !== 'url' || !a.url) continue;
          if (a.platform === 'instagram') {
            const handle = parseInstagramHandle(a.url);
            if (handle) {
              scrapes.push({
                platform: 'instagram',
                handle,
                promise: instagramScraper.scrape({ handle, userId, projectId: project.id }),
              });
            }
          } else if (a.platform === 'tiktok') {
            const handle = parseTikTokHandle(a.url);
            if (handle) {
              scrapes.push({
                platform: 'tiktok',
                handle,
                promise: tiktokScraper.scrape({ handle, userId, projectId: project.id }),
              });
            }
          }
        }
        if (scrapes.length > 0) {
          void Promise.allSettled(scrapes.map((s) => s.promise)).then((results) => {
            results.forEach((r, i) => {
              if (r.status === 'rejected') {
                const s = scrapes[i]!;
                logger.warn(
                  { err: r.reason, platform: s.platform, handle: s.handle },
                  'onboarding social auto-scrape failed',
                );
              }
            });
          });
        }

        return { count: body.data.accounts.length, next_step: 'brand' as const };
      }

      case 'brand': {
        const d = body.data;
        const project = await getOrCreateDefaultProject(userId);
        const payload: Prisma.BrandProfileUncheckedCreateInput = {
          projectId: project.id,
          userId,
          voiceTone: d.tone_of_voice?.trim() || null,
          brandValues: d.values ?? [],
          targetAudience: d.target_audience ?? null,
          essence: d.brand_story ?? null,
          keywords: d.keywords ?? [],
        };
        const brand = await prisma.brandProfile.upsert({
          where: { projectId: project.id },
          create: payload,
          update: {
            voiceTone: payload.voiceTone,
            brandValues: payload.brandValues,
            targetAudience: payload.targetAudience,
            essence: payload.essence,
            keywords: payload.keywords,
          },
        });
        await prisma.profile.update({
          where: { id: userId },
          data: { onboardingStep: mapToPrismaStep('objectives') },
        });
        return { brand, next_step: 'objectives' as const };
      }

      case 'objectives': {
        const project = await getOrCreateDefaultProject(userId);
        await prisma.objective.deleteMany({ where: { projectId: project.id } });
        if (body.data.objectives.length) {
          await prisma.objective.createMany({
            data: body.data.objectives.map((o) => ({
              projectId: project.id,
              userId,
              name: o.title,
              description: o.description ?? null,
              deadline: o.target_date ? new Date(o.target_date) : null,
            })),
          });
        }
        await prisma.profile.update({
          where: { id: userId },
          data: { onboardingStep: mapToPrismaStep('complete') },
        });
        return { count: body.data.objectives.length, next_step: 'complete' as const };
      }
    }

    throw new BadRequest('Unknown step');
  },

  async complete(userId: string) {
    return prisma.profile.update({
      where: { id: userId },
      data: { onboardingStep: 'completed', onboardingCompleted: true },
    });
  },
};
