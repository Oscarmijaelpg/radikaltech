import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { brandSynthesizer } from '../ai-services/index.js';
import { brandHistoryService } from './history-service.js';

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

export interface UpsertBrandInput {
  project_id: string;
  tone?: string;
  voice?: string;
  values?: string[];
  audience?: string;
  visual?: string;
  summary?: string;
}

function mapBrandInput(input: Omit<UpsertBrandInput, 'project_id'>) {
  const data: Record<string, unknown> = {};
  if (input.tone !== undefined || input.voice !== undefined) {
    data.voiceTone = [input.tone, input.voice].filter(Boolean).join(' / ') || undefined;
  }
  if (input.values !== undefined) data.brandValues = input.values;
  if (input.audience !== undefined) data.targetAudience = input.audience;
  if (input.visual !== undefined) data.visualDirection = input.visual;
  if (input.summary !== undefined) data.essence = input.summary;
  return data;
}

export const brandService = {
  async getByProject(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.brandProfile.findUnique({ where: { projectId } });
  },

  async upsert(userId: string, input: UpsertBrandInput) {
    await assertProjectOwner(input.project_id, input.project_id ? userId : userId);
    const { project_id, ...rest } = input;
    const mapped = mapBrandInput(rest);
    const existing = await prisma.brandProfile.findUnique({ where: { projectId: project_id } });
    const updated = await prisma.brandProfile.upsert({
      where: { projectId: project_id },
      create: { projectId: project_id, userId, ...mapped },
      update: mapped,
    });
    try {
      await brandHistoryService.snapshotIfChanged({
        projectId: project_id,
        userId,
        snapshotType: 'brand_profile',
        previous: existing as unknown as Record<string, unknown> | null,
        current: updated as unknown as Record<string, unknown>,
      });
    } catch {
      /* best-effort */
    }
    return updated;
  },

  async acceptSuggestion(
    userId: string,
    input: { project_id: string; field: 'color_palette' },
  ) {
    await assertProjectOwner(input.project_id, userId);
    const existing = await prisma.brandProfile.findUnique({ where: { projectId: input.project_id } });
    if (!existing) throw new NotFound('Brand profile not found');
    const data: Record<string, unknown> = {};
    if (input.field === 'color_palette') {
      data.colorPalette = existing.colorPaletteSuggested ?? null;
    }
    const updated = await prisma.brandProfile.update({
      where: { projectId: input.project_id },
      data,
    });
    try {
      await brandHistoryService.snapshotIfChanged({
        projectId: input.project_id,
        userId,
        snapshotType: 'palette',
        previous: existing as unknown as Record<string, unknown>,
        current: updated as unknown as Record<string, unknown>,
      });
    } catch {
      /* ignore */
    }
    return updated;
  },

  async generate(userId: string, projectId: string) {
    const project = await assertProjectOwner(projectId, userId);
    const socials = await prisma.socialAccount.findMany({ where: { projectId } });
    const synthesized = await brandSynthesizer.synthesize({
      project,
      socialAccounts: socials.map((s) => ({
        platform: s.platform,
        source: s.source ?? 'none',
        url: s.url,
        manual_description: s.manualDescription,
      })),
      userId,
    });
    const mapped: Record<string, unknown> = {
      voiceTone: `${synthesized.tone} / ${synthesized.voice}`,
      brandValues: synthesized.values,
      keywords: synthesized.keywords ?? [],
      targetAudience: synthesized.audience.segments.join(', '),
      essence: synthesized.summary,
      mission: synthesized.mission ?? null,
      vision: synthesized.vision ?? null,
      competitiveAdvantage: synthesized.competitive_advantage ?? null,
      visualDirection: synthesized.visual.direction ?? null,
      colorPalette: synthesized.visual.palette.length > 0 ? synthesized.visual.palette : null,
      aiGenerated: true,
    };
    const existing = await prisma.brandProfile.findUnique({ where: { projectId } });
    const updated = await prisma.brandProfile.upsert({
      where: { projectId },
      create: { projectId, userId, ...mapped },
      update: mapped,
    });
    try {
      await brandHistoryService.snapshotIfChanged({
        projectId,
        userId,
        snapshotType: 'identity_change',
        previous: existing as unknown as Record<string, unknown> | null,
        current: updated as unknown as Record<string, unknown>,
      });
    } catch {
      /* ignore */
    }
    return updated;
  },
};
