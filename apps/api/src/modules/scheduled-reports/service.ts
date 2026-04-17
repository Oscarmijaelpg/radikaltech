import {
  prisma,
  type ScheduledReport,
  type ScheduledReportFrequency,
  type ScheduledReportKind,
} from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import {
  generateBrandStrategy,
  generateMonthlyAudit,
  generateCompetitionReport,
} from '../reports/generators.js';

export function computeNextRun(
  frequency: ScheduledReportFrequency,
  from: Date = new Date(),
): Date {
  const d = new Date(from.getTime());
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

async function assertProjectOwner(projectId: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new NotFound('Project not found');
  if (p.userId !== userId) throw new Forbidden();
}

async function assertOwner(id: string, userId: string): Promise<ScheduledReport> {
  const r = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!r) throw new NotFound('Scheduled report not found');
  if (r.userId !== userId) throw new Forbidden();
  return r;
}

export const scheduledReportsService = {
  async list(userId: string, projectId: string): Promise<ScheduledReport[]> {
    await assertProjectOwner(projectId, userId);
    return prisma.scheduledReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(input: {
    userId: string;
    projectId: string;
    kind: ScheduledReportKind;
    frequency: ScheduledReportFrequency;
    title: string;
    config?: Record<string, unknown>;
  }): Promise<ScheduledReport> {
    await assertProjectOwner(input.projectId, input.userId);
    const nextRunAt = computeNextRun(input.frequency, new Date());
    return prisma.scheduledReport.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        kind: input.kind,
        frequency: input.frequency,
        title: input.title,
        config: (input.config ?? {}) as object,
        nextRunAt,
      },
    });
  },

  async update(
    id: string,
    userId: string,
    patch: {
      enabled?: boolean;
      frequency?: ScheduledReportFrequency;
      config?: Record<string, unknown>;
      title?: string;
    },
  ): Promise<ScheduledReport> {
    await assertOwner(id, userId);
    const data: Record<string, unknown> = {};
    if (patch.enabled !== undefined) data.enabled = patch.enabled;
    if (patch.frequency) {
      data.frequency = patch.frequency;
      data.nextRunAt = computeNextRun(patch.frequency, new Date());
    }
    if (patch.config !== undefined) data.config = patch.config;
    if (patch.title !== undefined) data.title = patch.title;
    return prisma.scheduledReport.update({ where: { id }, data });
  },

  async remove(id: string, userId: string): Promise<void> {
    await assertOwner(id, userId);
    await prisma.scheduledReport.delete({ where: { id } });
  },

  async runNow(id: string, userId: string): Promise<ScheduledReport> {
    const sr = await assertOwner(id, userId);
    await executeScheduledReport(sr);
    return prisma.scheduledReport.findUniqueOrThrow({ where: { id } });
  },
};

export async function executeScheduledReport(sr: ScheduledReport): Promise<void> {
  const config = (sr.config ?? {}) as Record<string, unknown>;
  try {
    let reportId: string | null = null;
    let reportTitle = sr.title;

    if (sr.kind === 'brand_monthly') {
      const r = await generateBrandStrategy({
        userId: sr.userId,
        projectId: sr.projectId,
      });
      reportId = r.id;
      reportTitle = r.title;
    } else if (sr.kind === 'competition_weekly') {
      const competitorId =
        typeof config.competitor_id === 'string' ? config.competitor_id : null;
      if (competitorId) {
        try {
          const r = await generateCompetitionReport({
            userId: sr.userId,
            projectId: sr.projectId,
            competitorId,
          });
          reportId = r.id;
          reportTitle = r.title;
        } catch (err) {
          logger.warn({ err, srId: sr.id }, 'competition report generation failed');
        }
      } else {
        // Fallback to monthly audit if no competitor specified
        const r = await generateMonthlyAudit({
          userId: sr.userId,
          projectId: sr.projectId,
        });
        reportId = r.id;
        reportTitle = r.title;
      }
    } else if (sr.kind === 'news_digest') {
      // No dedicated news generator — fallback to monthly audit
      const r = await generateMonthlyAudit({
        userId: sr.userId,
        projectId: sr.projectId,
      });
      reportId = r.id;
      reportTitle = r.title;
    } else {
      // custom
      const r = await generateMonthlyAudit({
        userId: sr.userId,
        projectId: sr.projectId,
      });
      reportId = r.id;
      reportTitle = r.title;
    }

    await prisma.notification.create({
      data: {
        userId: sr.userId,
        projectId: sr.projectId,
        kind: 'report_ready',
        title: `Nuevo reporte: ${reportTitle}`,
        body: `Tu reporte programado "${sr.title}" está listo.`,
        actionUrl: reportId ? `/reports?id=${reportId}` : '/reports',
      },
    });

    const now = new Date();
    await prisma.scheduledReport.update({
      where: { id: sr.id },
      data: {
        lastRunAt: now,
        nextRunAt: computeNextRun(sr.frequency, now),
      },
    });
  } catch (err) {
    logger.error({ err, srId: sr.id }, 'scheduled report execution failed');
    // Still advance nextRunAt so we don't get stuck
    const now = new Date();
    await prisma.scheduledReport
      .update({
        where: { id: sr.id },
        data: { lastRunAt: now, nextRunAt: computeNextRun(sr.frequency, now) },
      })
      .catch(() => undefined);
  }
}

let running = false;

export async function runScheduledReportsTick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const due = await prisma.scheduledReport.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      take: 25,
    });
    if (due.length === 0) return;
    logger.info({ count: due.length }, 'scheduled-reports tick: executing');
    for (const sr of due) {
      await executeScheduledReport(sr);
    }
  } catch (err) {
    logger.error({ err }, 'scheduled-reports tick failed');
  } finally {
    running = false;
  }
}

let tickHandle: NodeJS.Timeout | null = null;

export function startScheduledReportsLoop(intervalMs: number = 5 * 60 * 1000) {
  if (tickHandle) return;
  logger.info({ intervalMs }, 'starting scheduled-reports loop');
  // Fire once shortly after boot
  setTimeout(() => {
    void runScheduledReportsTick();
  }, 10_000);
  tickHandle = setInterval(() => {
    void runScheduledReportsTick();
  }, intervalMs);
}

export function stopScheduledReportsLoop() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}
