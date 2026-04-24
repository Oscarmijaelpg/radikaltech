import { prisma, Prisma } from '@radikal/db';
import type { AssetType } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export interface CreateAssetInput {
  userId: string;
  projectId: string;
  asset_url: string;
  asset_type: AssetType;
  metadata?: Record<string, unknown>;
}

export interface ListFilter {
  type?: AssetType;
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'score';
}

async function assertProjectOwner(projectId: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (p.userId !== userId) throw new Forbidden();
}

export const contentService = {
  async list(userId: string, projectId: string, filter: ListFilter = {}) {
    await assertProjectOwner(projectId, userId);
    const where: Prisma.ContentAssetWhereInput = { projectId, userId };
    if (filter.type) where.assetType = filter.type;

    const orderBy: Prisma.ContentAssetOrderByWithRelationInput =
      filter.sort === 'score'
        ? { aestheticScore: 'desc' }
        : { createdAt: 'desc' };

    const limit = Math.min(filter.limit ?? 50, 100);
    const offset = filter.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.contentAsset.findMany({ where, orderBy, take: limit, skip: offset }),
      prisma.contentAsset.count({ where }),
    ]);
    return { items, total, limit, offset };
  },

  async getById(id: string, userId: string) {
    const asset = await prisma.contentAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFound('Asset not found');
    if (asset.userId !== userId) throw new Forbidden();
    return asset;
  },

  async create(input: CreateAssetInput) {
    await assertProjectOwner(input.projectId, input.userId);
    return prisma.contentAsset.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        assetUrl: input.asset_url,
        assetType: input.asset_type,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        tags: [],
      },
    });
  },

  async remove(id: string, userId: string) {
    const asset = await prisma.contentAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFound('Asset not found');
    if (asset.userId !== userId) throw new Forbidden();
    await prisma.contentAsset.delete({ where: { id } });
    return { deleted: true };
  },

  async update(
    id: string,
    userId: string,
    patch: { tags?: string[]; ai_description?: string | null },
  ) {
    const asset = await prisma.contentAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFound('Asset not found');
    if (asset.userId !== userId) throw new Forbidden();

    const data: Prisma.ContentAssetUpdateInput = {};
    if (patch.tags !== undefined) data.tags = patch.tags;
    if (patch.ai_description !== undefined) data.aiDescription = patch.ai_description;

    return prisma.contentAsset.update({ where: { id }, data });
  },
};
