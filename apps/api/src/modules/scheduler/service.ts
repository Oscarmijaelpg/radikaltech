import { prisma, Prisma } from '@radikal/db';
import type { ScheduledPostPlatform, ScheduledPostStatus } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { assertProjectOwner } from '../../lib/guards.js';

export interface ListFilter {
  status?: ScheduledPostStatus;
  from?: Date;
  to?: Date;
}

export interface CreateInput {
  userId: string;
  projectId: string;
  assetId?: string | null;
  platforms: ScheduledPostPlatform[];
  caption?: string | null;
  hashtags?: string[];
  scheduledAt: Date;
  notes?: string | null;
}

export interface UpdateInput {
  assetId?: string | null;
  platforms?: ScheduledPostPlatform[];
  caption?: string | null;
  hashtags?: string[];
  scheduledAt?: Date;
  notes?: string | null;
  status?: ScheduledPostStatus;
}

async function getOwned(id: string, userId: string) {
  const post = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!post) throw new NotFound('Scheduled post not found');
  if (post.userId !== userId) throw new Forbidden();
  return post;
}

export const schedulerService = {
  async list(userId: string, projectId: string, filters: ListFilter = {}) {
    await assertProjectOwner(projectId, userId);
    const where: Prisma.ScheduledPostWhereInput = { projectId, userId };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.scheduledAt = {};
      if (filters.from) (where.scheduledAt as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.scheduledAt as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.scheduledPost.findMany({ where, orderBy: { scheduledAt: 'asc' } });
  },

  async listUpcomingForUser(userId: string, limit = 5) {
    return prisma.scheduledPost.findMany({
      where: { userId, status: 'scheduled', scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  },

  async getById(id: string, userId: string) {
    return getOwned(id, userId);
  },

  async create(input: CreateInput) {
    await assertProjectOwner(input.projectId, input.userId);
    if (input.assetId) {
      const asset = await prisma.contentAsset.findUnique({ where: { id: input.assetId } });
      if (!asset || asset.userId !== input.userId) throw new Forbidden();
    }
    return prisma.scheduledPost.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        assetId: input.assetId ?? null,
        platforms: input.platforms,
        caption: input.caption ?? null,
        hashtags: input.hashtags ?? [],
        scheduledAt: input.scheduledAt,
        notes: input.notes ?? null,
      },
    });
  },

  async update(id: string, userId: string, patch: UpdateInput) {
    await getOwned(id, userId);
    const data: Prisma.ScheduledPostUpdateInput = {};
    if (patch.assetId !== undefined) data.assetId = patch.assetId;
    if (patch.platforms !== undefined) data.platforms = patch.platforms;
    if (patch.caption !== undefined) data.caption = patch.caption;
    if (patch.hashtags !== undefined) data.hashtags = patch.hashtags;
    if (patch.scheduledAt !== undefined) data.scheduledAt = patch.scheduledAt;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.status !== undefined) data.status = patch.status;
    return prisma.scheduledPost.update({ where: { id }, data });
  },

  async cancel(id: string, userId: string) {
    await getOwned(id, userId);
    return prisma.scheduledPost.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  },

  async markPublished(id: string, userId: string, externalIds?: Record<string, unknown>) {
    await getOwned(id, userId);
    return prisma.scheduledPost.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        externalIds: (externalIds ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async remove(id: string, userId: string) {
    await getOwned(id, userId);
    await prisma.scheduledPost.delete({ where: { id } });
    return { deleted: true };
  },
};
