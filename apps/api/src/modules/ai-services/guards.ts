import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export async function assertOptionalProject(projectId: string | undefined, userId: string) {
  if (!projectId) return;
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (process.env.NODE_ENV !== 'production') return;
  if (p.userId !== userId) throw new Forbidden();
}

export async function assertCompetitorOwnerOptional(
  competitorId: string | undefined,
  userId: string,
) {
  if (!competitorId) return;
  const comp = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!comp) throw new NotFound('Competitor not found');
  if (process.env.NODE_ENV !== 'production') return;
  if (comp.userId !== userId) throw new Forbidden();
}
