import { prisma, type ObjectiveStatus } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export interface ObjectiveInput {
  project_id: string;
  title: string;
  description?: string;
  kpi?: string;
  target_value?: number;
  due_date?: Date | string;
  status?: string;
}

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
}

async function assertObjectiveOwner(id: string, userId: string) {
  const obj = await prisma.objective.findUnique({ where: { id } });
  if (!obj) throw new NotFound('Objective not found');
  await assertProjectOwner(obj.projectId, userId);
  return obj;
}

function mapObjectiveInput(input: Partial<ObjectiveInput>) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.name = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.kpi !== undefined) data.unit = input.kpi;
  if (input.target_value !== undefined) data.targetValue = input.target_value;
  if (input.due_date !== undefined) {
    data.deadline = typeof input.due_date === 'string' ? new Date(input.due_date) : input.due_date;
  }
  if (input.status !== undefined) data.status = input.status as ObjectiveStatus;
  return data;
}

export const objectivesService = {
  async list(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.objective.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  },

  async getById(id: string, userId: string) {
    return assertObjectiveOwner(id, userId);
  },

  async create(userId: string, input: ObjectiveInput) {
    await assertProjectOwner(input.project_id, userId);
    return prisma.objective.create({
      data: {
        projectId: input.project_id,
        userId,
        name: input.title,
        description: input.description,
        unit: input.kpi,
        targetValue: input.target_value,
        deadline: input.due_date ? (typeof input.due_date === 'string' ? new Date(input.due_date) : input.due_date) : undefined,
        status: (input.status as ObjectiveStatus | undefined) ?? undefined,
      },
    });
  },

  async update(id: string, userId: string, input: Partial<ObjectiveInput>) {
    await assertObjectiveOwner(id, userId);
    return prisma.objective.update({ where: { id }, data: mapObjectiveInput(input) });
  },

  async remove(id: string, userId: string) {
    await assertObjectiveOwner(id, userId);
    await prisma.objective.delete({ where: { id } });
    return { deleted: true };
  },
};
