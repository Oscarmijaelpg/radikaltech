import { prisma, Prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { embeddingsService } from '../ai-services/embeddings.js';

function indexMemoryFireAndForget(memoryId: string, text: string) {
  // Never block callers on embeddings; swallow everything.
  void embeddingsService.indexMemory(memoryId, text).catch(() => {});
}

export type MemoryCategory = 'brand' | 'products' | 'customers' | 'saved_chats' | 'custom' | string;

export interface CreateMemoryInput {
  project_id: string;
  category: MemoryCategory;
  key?: string | null;
  value: string;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateMemoryInput {
  category?: MemoryCategory;
  key?: string | null;
  value?: string;
  metadata?: Record<string, unknown> | null;
}

async function assertProjectOwner(projectId: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (p.userId !== userId) throw new Forbidden();
  return p;
}

async function assertMemoryOwner(id: string, userId: string) {
  const m = await prisma.memory.findUnique({ where: { id } });
  if (!m) throw new NotFound('Memory not found');
  if (m.projectId) {
    const p = await prisma.project.findUnique({ where: { id: m.projectId } });
    if (!p || p.userId !== userId) throw new Forbidden();
  } else if (m.userId !== userId) {
    throw new Forbidden();
  }
  return m;
}

export const memoryService = {
  async list(userId: string, projectId: string, category?: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.memory.findMany({
      where: { projectId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, input: CreateMemoryInput) {
    await assertProjectOwner(input.project_id, userId);
    const memory = await prisma.memory.create({
      data: {
        projectId: input.project_id,
        userId,
        category: input.category,
        key: input.key ?? '',
        value: input.value,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    const textToEmbed = [memory.key, memory.value].filter(Boolean).join(': ');
    indexMemoryFireAndForget(memory.id, textToEmbed);
    return memory;
  },

  async update(id: string, userId: string, input: UpdateMemoryInput) {
    await assertMemoryOwner(id, userId);
    const data: Prisma.MemoryUpdateInput = {};
    if (input.category !== undefined) data.category = input.category;
    if (input.key !== undefined) data.key = input.key ?? '';
    if (input.value !== undefined) data.value = input.value;
    if (input.metadata !== undefined) {
      data.metadata = (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined;
    }
    const updated = await prisma.memory.update({ where: { id }, data });
    if (input.value !== undefined || input.key !== undefined) {
      const textToEmbed = [updated.key, updated.value].filter(Boolean).join(': ');
      indexMemoryFireAndForget(updated.id, textToEmbed);
    }
    return updated;
  },

  async remove(id: string, userId: string) {
    await assertMemoryOwner(id, userId);
    await prisma.memory.delete({ where: { id } });
    return { deleted: true };
  },

  async getBrand(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.brandProfile.findUnique({ where: { projectId } });
  },
};
