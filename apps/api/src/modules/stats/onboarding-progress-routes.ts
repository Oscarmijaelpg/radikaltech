import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { prisma } from '@radikal/db';

const querySchema = z.object({
  project_id: z.string().uuid(),
});

export interface OnboardingTaskDef {
  id: string;
  points: number;
}

export const ONBOARDING_TASKS: OnboardingTaskDef[] = [
  { id: 'complete_identity', points: 20 },
  { id: 'upload_logo', points: 15 },
  { id: 'first_competitor', points: 15 },
  { id: 'first_chat', points: 10 },
  { id: 'first_image', points: 15 },
  { id: 'first_report', points: 10 },
  { id: 'first_recommendation', points: 10 },
  { id: 'schedule_post', points: 10 },
];

export const LEVELS = [
  { minPoints: 0, label: 'Aprendiz', emoji: '🌱' },
  { minPoints: 25, label: 'Explorador', emoji: '🔎' },
  { minPoints: 50, label: 'Constructor', emoji: '🛠️' },
  { minPoints: 75, label: 'Estratega', emoji: '🎯' },
  { minPoints: 100, label: 'Embajador', emoji: '🏆' },
];

function levelFor(points: number) {
  let current = LEVELS[0]!;
  for (const l of LEVELS) {
    if (points >= l.minPoints) current = l;
  }
  return current;
}

export interface OnboardingProgress {
  has_brand: boolean;
  has_business_summary: boolean;
  has_logo: boolean;
  competitors_count: number;
  chats_count: number;
  generated_images_count: number;
  reports_count: number;
  recommendations_count: number;
  scheduled_posts_count: number;
  total_points: number;
  level: { label: string; emoji: string };
  completed_tasks: string[];
  next_task_id: string | null;
}

export const onboardingProgressRouter = new Hono<{ Variables: AuthVariables }>();

onboardingProgressRouter.get(
  '/onboarding-progress',
  zValidator('query', querySchema),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('query');

    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) throw new NotFound('Project not found');
    if (process.env.NODE_ENV === 'production' && project.userId !== user.id) throw new Forbidden();

    const [brand, logoAsset, competitorsCount, chatsCount, imagesCount, reportsCount, recsCount, scheduledCount] =
      await Promise.all([
        prisma.brandProfile.findUnique({ where: { projectId: project_id } }),
        prisma.contentAsset.findFirst({
          where: { projectId: project_id, tags: { has: 'logo' } },
          select: { id: true },
        }),
        prisma.competitor.count({ where: { projectId: project_id, userId: user.id } }),
        prisma.chat.count({ where: { projectId: project_id, userId: user.id } }),
        prisma.contentAsset.count({
          where: {
            projectId: project_id,
            userId: user.id,
            OR: [{ tags: { has: 'generated' } }, { tags: { has: 'ai-generated' } }],
          },
        }),
        prisma.report.count({ where: { projectId: project_id, userId: user.id } }),
        prisma.recommendation.count({ where: { projectId: project_id, userId: user.id } }),
        prisma.scheduledPost.count({ where: { projectId: project_id, userId: user.id } }),
      ]);

    const hasBrand = !!brand;
    const hasBusinessSummary = !!project.businessSummary && project.businessSummary.trim().length > 0;
    const hasLogo = !!logoAsset;

    const completionMap: Record<string, boolean> = {
      complete_identity: hasBrand && hasBusinessSummary,
      upload_logo: hasLogo,
      first_competitor: competitorsCount > 0,
      first_chat: chatsCount > 0,
      first_image: imagesCount > 0,
      first_report: reportsCount > 0,
      first_recommendation: recsCount > 0,
      schedule_post: scheduledCount > 0,
    };

    const completed: string[] = [];
    let points = 0;
    let nextTaskId: string | null = null;
    for (const task of ONBOARDING_TASKS) {
      if (completionMap[task.id]) {
        completed.push(task.id);
        points += task.points;
      } else if (!nextTaskId) {
        nextTaskId = task.id;
      }
    }

    const level = levelFor(points);

    const payload: OnboardingProgress = {
      has_brand: hasBrand,
      has_business_summary: hasBusinessSummary,
      has_logo: hasLogo,
      competitors_count: competitorsCount,
      chats_count: chatsCount,
      generated_images_count: imagesCount,
      reports_count: reportsCount,
      recommendations_count: recsCount,
      scheduled_posts_count: scheduledCount,
      total_points: points,
      level: { label: level.label, emoji: level.emoji },
      completed_tasks: completed,
      next_task_id: nextTaskId,
    };

    return c.json(ok(payload));
  },
);
