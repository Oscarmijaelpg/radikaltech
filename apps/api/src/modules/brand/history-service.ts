import { prisma, Prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { preferredChatEndpoint, preferredChatModel } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

async function assertHistoryOwner(id: string, userId: string) {
  const entry = await prisma.brandHistory.findUnique({ where: { id } });
  if (!entry) throw new NotFound('History entry not found');
  if (entry.userId !== userId) throw new Forbidden();
  return entry;
}

const TRACKED_FIELDS = [
  'voiceTone',
  'essence',
  'mission',
  'vision',
  'visualDirection',
  'colorPalette',
  'brandValues',
  'targetAudience',
  'competitiveAdvantage',
] as const;

type BrandSnapshot = Partial<Record<(typeof TRACKED_FIELDS)[number], unknown>> & {
  logoUrl?: string | null;
  [key: string]: unknown;
};

function pickSnapshot(brand: Record<string, unknown> | null | undefined): BrandSnapshot {
  if (!brand) return {};
  const out: BrandSnapshot = {};
  for (const f of TRACKED_FIELDS) {
    out[f] = brand[f] ?? null;
  }
  return out;
}

function hasSignificantChange(prev: BrandSnapshot, next: BrandSnapshot): boolean {
  for (const f of TRACKED_FIELDS) {
    const a = JSON.stringify(prev[f] ?? null);
    const b = JSON.stringify(next[f] ?? null);
    if (a !== b) return true;
  }
  return false;
}

async function generateChangeSummary(
  previous: BrandSnapshot,
  current: BrandSnapshot,
): Promise<string | null> {
  if (!env.OPENROUTER_API_KEY && !env.OPENAI_API_KEY) return null;
  const diffs: string[] = [];
  for (const f of TRACKED_FIELDS) {
    const a = JSON.stringify(previous[f] ?? null);
    const b = JSON.stringify(current[f] ?? null);
    if (a !== b) diffs.push(`- ${f}: ${a.slice(0, 140)} → ${b.slice(0, 140)}`);
  }
  if (diffs.length === 0) return null;

  try {
    const url = preferredChatEndpoint();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY}`,
    };
    if (env.OPENROUTER_API_KEY) {
      headers['HTTP-Referer'] = env.WEB_URL;
      headers['X-Title'] = 'Radikal';
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: preferredChatModel(),
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente que resume cambios de identidad de marca en 1-2 frases breves en español. Devuelve SOLO el texto, sin JSON.',
          },
          {
            role: 'user',
            content: `Resume en 1-2 frases los siguientes cambios en la identidad de marca:\n\n${diffs.join(
              '\n',
            )}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 500) : null;
  } catch (err) {
    logger.warn({ err }, 'brand history summary failed');
    return null;
  }
}

export const brandHistoryService = {
  async list(projectId: string, userId: string) {
    await assertProjectOwner(projectId, userId);
    return prisma.brandHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string, userId: string) {
    return assertHistoryOwner(id, userId);
  },

  async remove(id: string, userId: string) {
    await assertHistoryOwner(id, userId);
    await prisma.brandHistory.delete({ where: { id } });
    return { deleted: true };
  },

  /**
   * Crea un snapshot si hubo cambios significativos entre prev y next.
   * Usado por brandService.upsert/generate antes de guardar.
   */
  async snapshotIfChanged(params: {
    projectId: string;
    userId: string;
    snapshotType: 'brand_profile' | 'logo' | 'palette' | 'identity_change';
    previous: Record<string, unknown> | null;
    current: Record<string, unknown>;
  }) {
    const prev = pickSnapshot(params.previous);
    const curr = pickSnapshot(params.current);
    if (!hasSignificantChange(prev, curr)) return null;
    const summary = await generateChangeSummary(prev, curr);
    try {
      return await prisma.brandHistory.create({
        data: {
          projectId: params.projectId,
          userId: params.userId,
          snapshotType: params.snapshotType,
          previous: prev as unknown as Prisma.InputJsonValue,
          current: curr as unknown as Prisma.InputJsonValue,
          changeSummary: summary,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'failed to create brand history snapshot');
      return null;
    }
  },
};
