import { prisma, type SocialPlatform, type SocialSource } from '@radikal/db';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { instagramScraper, tiktokScraper, parseInstagramHandle, parseTikTokHandle } from '../ai-services/index.js';
import { logger } from '../../lib/logger.js';

export interface SocialAccountInput {
  project_id: string;
  platform: string;
  handle?: string;
  source: 'url' | 'manual';
  url?: string;
  manual_description?: string;
}

function validateSource(input: Pick<SocialAccountInput, 'source' | 'url' | 'manual_description'>) {
  if (input.source === 'url' && !input.url) {
    throw new BadRequest('url is required when source is "url"');
  }
  if (input.source === 'manual' && !input.manual_description) {
    throw new BadRequest('manual_description is required when source is "manual"');
  }
}

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) {
    throw new Forbidden('Not project owner');
  }
}

async function assertAccountOwner(id: string, userId: string) {
  const acc = await prisma.socialAccount.findUnique({ where: { id } });
  if (!acc) throw new NotFound('Social account not found');
  await assertProjectOwner(acc.projectId, userId);
  return acc;
}

export const socialAccountsService = {
  async listByProject(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.socialAccount.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, input: SocialAccountInput) {
    await assertProjectOwner(input.project_id, userId);
    validateSource(input);
    return prisma.socialAccount.create({
      data: {
        projectId: input.project_id,
        userId,
        platform: input.platform as SocialPlatform,
        source: input.source as SocialSource,
        url: input.url,
        handle: input.handle,
        manualDescription: input.manual_description,
      },
    });
  },

  async update(id: string, userId: string, input: Partial<SocialAccountInput>) {
    const existing = await assertAccountOwner(id, userId);
    const merged = {
      source: (input.source ?? existing.source) as 'url' | 'manual',
      url: input.url ?? existing.url ?? undefined,
      manual_description: input.manual_description ?? existing.manualDescription ?? undefined,
    };
    validateSource(merged);
    const data: Record<string, unknown> = {};
    if (input.platform !== undefined) data.platform = input.platform as SocialPlatform;
    if (input.source !== undefined) data.source = input.source as SocialSource;
    if (input.url !== undefined) data.url = input.url;
    if (input.handle !== undefined) data.handle = input.handle;
    if (input.manual_description !== undefined) data.manualDescription = input.manual_description;
    return prisma.socialAccount.update({ where: { id }, data });
  },

  async remove(id: string, userId: string) {
    await assertAccountOwner(id, userId);
    await prisma.socialAccount.delete({ where: { id } });
    return { deleted: true };
  },

  async syncProject(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    const accounts = await prisma.socialAccount.findMany({
      where: { projectId, isActive: true },
    });

    if (accounts.length === 0) {
      return { scheduled: 0, message: 'No active social accounts found for this project.' };
    }

    const scrapes: Array<{ platform: string; handle: string; promise: Promise<unknown> }> = [];
    for (const a of accounts) {
      let handle = a.handle;
      if (!handle && a.url) {
        if (a.platform === 'instagram') handle = parseInstagramHandle(a.url);
        if (a.platform === 'tiktok') handle = parseTikTokHandle(a.url);
      }
      if (!handle) continue;

      if (a.platform === 'instagram') {
        scrapes.push({
          platform: 'instagram',
          handle,
          promise: instagramScraper.scrape({ handle, userId, projectId }),
        });
      } else if (a.platform === 'tiktok') {
        scrapes.push({
          platform: 'tiktok',
          handle,
          promise: tiktokScraper.scrape({ handle, userId, projectId }),
        });
      }
    }

    if (scrapes.length > 0) {
      void Promise.allSettled(scrapes.map((s) => s.promise)).then((results) => {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            const s = scrapes[i]!;
            logger.warn(
              { err: r.reason, platform: s.platform, handle: s.handle, projectId },
              '[social-accounts.syncProject] auto-scrape failed',
            );
          }
        });
      });
    }

    return { scheduled: scrapes.length };
  },
};
