import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from './errors.js';

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Proyecto no encontrado');
  if (project.userId !== userId) throw new Forbidden('No eres el propietario del proyecto');
  return project;
}
