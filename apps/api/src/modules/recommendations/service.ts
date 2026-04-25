import { prisma, type Recommendation, RecommendationStatus, RecommendationKind } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

async function assertProjectOwner(projectId: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (p.userId !== userId) throw new Forbidden();
}

async function assertRecOwner(id: string, userId: string): Promise<Recommendation> {
  const r = await prisma.recommendation.findUnique({ where: { id } });
  if (!r) throw new NotFound('Recommendation not found');
  if (r.userId !== userId) throw new Forbidden();
  return r;
}

export interface ListFilters {
  status?: RecommendationStatus;
  kind?: RecommendationKind;
}

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const recommendationsService = {
  async list(userId: string, projectId: string, filters?: ListFilters): Promise<Recommendation[]> {
    await assertProjectOwner(projectId, userId);
    const where: {
      projectId: string;
      status?: RecommendationStatus;
      kind?: RecommendationKind;
    } = { projectId };
    if (filters?.status) where.status = filters.status;
    if (filters?.kind) where.kind = filters.kind;
    const items = await prisma.recommendation.findMany({
      where,
      orderBy: [{ generatedAt: 'desc' }],
    });
    // Secondary sort by impact
    return items.sort((a, b) => {
      const ia = IMPACT_ORDER[a.impact] ?? 9;
      const ib = IMPACT_ORDER[b.impact] ?? 9;
      if (ia !== ib) return ia - ib;
      return b.generatedAt.getTime() - a.generatedAt.getTime();
    });
  },

  async getById(id: string, userId: string): Promise<Recommendation> {
    return assertRecOwner(id, userId);
  },

  async updateStatus(
    id: string,
    userId: string,
    status: RecommendationStatus,
  ): Promise<Recommendation> {
    await assertRecOwner(id, userId);
    const data: { status: RecommendationStatus; completedAt?: Date | null } = { status };
    if (status === 'completed') data.completedAt = new Date();
    return prisma.recommendation.update({ where: { id }, data });
  },

  async addNote(id: string, userId: string, note: string | null): Promise<Recommendation> {
    await assertRecOwner(id, userId);
    return prisma.recommendation.update({
      where: { id },
      data: { userNotes: note },
    });
  },

  async markAsCompleted(id: string, userId: string): Promise<Recommendation> {
    await assertRecOwner(id, userId);
    return prisma.recommendation.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  },

  async deleteRecommendation(id: string, userId: string): Promise<void> {
    await assertRecOwner(id, userId);
    await prisma.recommendation.delete({ where: { id } });
  },
};
