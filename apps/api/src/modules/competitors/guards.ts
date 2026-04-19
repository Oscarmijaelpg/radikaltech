import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

export async function assertCompetitorOwner(id: string, userId: string) {
  const c = await prisma.competitor.findUnique({ where: { id } });
  if (!c) throw new NotFound('Competitor not found');
  if (c.userId !== userId) throw new Forbidden();
  return c;
}
