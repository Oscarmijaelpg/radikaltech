import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
export { assertProjectOwner } from '../../lib/guards.js';

export async function assertCompetitorOwner(id: string, userId: string) {
  const c = await prisma.competitor.findUnique({ where: { id } });
  if (!c) throw new NotFound('Competitor not found');
  if (c.userId !== userId) throw new Forbidden();
  return c;
}
