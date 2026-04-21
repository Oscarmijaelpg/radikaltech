import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok, paginated, buildPageMeta } from '../../lib/response.js';
import { NotFound, BadRequest } from '../../lib/errors.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { logAudit } from './audit-service.js';

export const usersAdminRouter = new Hono<{ Variables: AuthVariables }>();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  onboarded: z.enum(['true', 'false']).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'email', '-email']).default('-createdAt'),
});

function buildOrderBy(sort: string): Prisma.ProfileOrderByWithRelationInput {
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return { [key]: desc ? 'desc' : 'asc' } as Prisma.ProfileOrderByWithRelationInput;
}

function serializeUser(p: {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  onboardingCompleted: boolean;
  onboardingStep: string;
  avatarUrl: string | null;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  phone: string | null;
}) {
  return {
    id: p.id,
    email: p.email,
    full_name: p.fullName,
    role: p.role,
    onboarding_completed: p.onboardingCompleted,
    onboarding_step: p.onboardingStep,
    avatar_url: p.avatarUrl,
    language: p.language,
    phone: p.phone,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

usersAdminRouter.get('/', zValidator('query', listSchema), async (c) => {
  const q = c.req.valid('query');
  const where: Prisma.ProfileWhereInput = {};

  if (q.q) {
    where.OR = [
      { email: { contains: q.q, mode: 'insensitive' } },
      { fullName: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  if (q.role) where.role = q.role;
  if (q.onboarded) where.onboardingCompleted = q.onboarded === 'true';

  const [total, rows] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: buildOrderBy(q.sort),
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return c.json(paginated(rows.map(serializeUser), buildPageMeta(q.page, q.pageSize, total)));
});

usersAdminRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [profile, projects, chats, jobs, tokenAgg] = await Promise.all([
    prisma.profile.findUnique({ where: { id } }),
    prisma.project.count({ where: { userId: id } }),
    prisma.chat.count({ where: { userId: id } }),
    prisma.aiJob.count({ where: { userId: id } }),
    prisma.tokenUsage.aggregate({
      where: { userId: id },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
    }),
  ]);

  if (!profile) throw new NotFound('Usuario no encontrado');

  return c.json(
    ok({
      ...serializeUser(profile),
      counts: { projects, chats, jobs },
      token_usage_total: {
        prompt_tokens: tokenAgg._sum.promptTokens ?? 0,
        completion_tokens: tokenAgg._sum.completionTokens ?? 0,
        cost_usd: Number(tokenAgg._sum.costUsd ?? 0),
      },
    }),
  );
});

const updateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  full_name: z.string().min(1).max(200).optional(),
  language: z.string().min(2).max(10).optional(),
});

usersAdminRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const before = await prisma.profile.findUnique({ where: { id } });
  if (!before) throw new NotFound('Usuario no encontrado');

  const data: Prisma.ProfileUpdateInput = {};
  if (body.role !== undefined) data.role = body.role;
  if (body.full_name !== undefined) data.fullName = body.full_name;
  if (body.language !== undefined) data.language = body.language;

  if (Object.keys(data).length === 0) throw new BadRequest('Sin cambios');

  const updated = await prisma.profile.update({ where: { id }, data });

  if (body.role !== undefined && body.role !== before.role) {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { role: body.role },
    });
  }

  await logAudit(c, {
    action: 'user.update',
    targetType: 'profile',
    targetId: id,
    diff: { before: { role: before.role, fullName: before.fullName, language: before.language }, after: body },
  });

  return c.json(ok(serializeUser(updated)));
});

usersAdminRouter.post('/:id/force-logout', async (c) => {
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.auth.admin.signOut(id, 'global');
  if (error) throw new BadRequest(`No se pudo forzar logout: ${error.message}`);
  await logAudit(c, { action: 'user.force_logout', targetType: 'profile', targetId: id });
  return c.json(ok({ logged_out: true }));
});

usersAdminRouter.post('/:id/impersonate', async (c) => {
  const id = c.req.param('id');
  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) throw new NotFound('Usuario no encontrado');

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
  });
  if (error || !data?.properties?.action_link) {
    throw new BadRequest(`No se pudo generar magic link: ${error?.message ?? 'unknown'}`);
  }

  await logAudit(c, {
    action: 'user.impersonate',
    targetType: 'profile',
    targetId: id,
    metadata: { email: profile.email },
  });

  return c.json(
    ok({
      email: profile.email,
      actionLink: data.properties.action_link,
      expiresIn: '1h',
    }),
  );
});

usersAdminRouter.get('/:id/export', async (c) => {
  const id = c.req.param('id');
  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) throw new NotFound('Usuario no encontrado');

  const [projects, chats, messages, competitors, jobs, tokenUsage, reports, notifications] = await Promise.all([
    prisma.project.findMany({ where: { userId: id } }),
    prisma.chat.findMany({ where: { userId: id } }),
    prisma.message.findMany({ where: { userId: id } }),
    prisma.competitor.findMany({ where: { userId: id } }),
    prisma.aiJob.findMany({ where: { userId: id } }),
    prisma.tokenUsage.findMany({ where: { userId: id } }),
    prisma.report.findMany({ where: { userId: id } }),
    prisma.notification.findMany({ where: { userId: id } }),
  ]);

  await logAudit(c, { action: 'user.export', targetType: 'profile', targetId: id });

  return c.json(
    ok({
      exported_at: new Date().toISOString(),
      profile: serializeUser(profile),
      projects,
      chats,
      messages,
      competitors,
      jobs,
      token_usage: tokenUsage,
      reports,
      notifications,
    }),
  );
});

usersAdminRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const caller = c.get('user');
  if (caller.id === id) throw new BadRequest('No puedes eliminar tu propia cuenta desde aquí');

  const before = await prisma.profile.findUnique({ where: { id } });
  if (!before) throw new NotFound('Usuario no encontrado');

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new BadRequest(`No se pudo eliminar: ${error.message}`);
  await prisma.profile.deleteMany({ where: { id } });

  await logAudit(c, {
    action: 'user.delete',
    targetType: 'profile',
    targetId: id,
    diff: { email: before.email, fullName: before.fullName, role: before.role },
  });

  return c.json(ok({ deleted: true }));
});
