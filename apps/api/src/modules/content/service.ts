import { prisma, Prisma } from '@radikal/db';
import type { AssetType } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { assertProjectOwner } from '../../lib/guards.js';

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
  tags?: string | string[];
}

export const contentService = {
  async list(userId: string, projectId: string, filter: ListFilter = {}) {
    await assertProjectOwner(projectId, userId);
    const where: Prisma.ContentAssetWhereInput = { projectId, userId };
    if (filter.type) where.assetType = filter.type;
    if (filter.tags) {
      const tagList = Array.isArray(filter.tags) ? filter.tags : [filter.tags];
      where.tags = { hasEvery: tagList };
    }
    
    // Excluir assets de competidores por defecto, a menos que se pidan explícitamente
    const hasCompetitorTag = filter.tags && (Array.isArray(filter.tags) ? filter.tags.includes('competitor') : filter.tags === 'competitor');
    if (!hasCompetitorTag) {
      where.NOT = { tags: { has: 'competitor' } };
    }

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
    const asset = await prisma.contentAsset.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        assetUrl: input.asset_url,
        assetType: input.asset_type,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        tags: (input.metadata?.tags as string[]) ?? [],
      },
    });
    
    if (input.asset_type === 'image' && !input.metadata?.tags?.includes('generated')) {
      import('../ai-services/image-analyzer.js').then((m) => {
        m.imageAnalyzer.analyze(input.asset_url).catch(() => null);
      }).catch(() => null);
    }
    
    return asset;
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
