import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { projectsService } from './service.js';
import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { marketDetector, websiteAnalyzer } from '../ai-services/index.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  industry: z.string().max(120).optional(),
  website: z.string().url().optional(),
  instagram_url: z.string().url().optional(),
  company_name: z.string().max(200).optional(),
  industry_custom: z.string().max(200).optional(),
  business_summary: z.string().max(4000).optional(),
  ideal_customer: z.string().max(4000).optional(),
  unique_value: z.string().max(4000).optional(),
  main_products: z.string().max(4000).optional(),
  additional_context: z.string().max(4000).optional(),
});

const updateSchema = createSchema.partial();

export const projectsRouter = new Hono<{ Variables: AuthVariables }>();

projectsRouter.get('/', async (c) => {
  const user = c.get('user');
  return c.json(ok(await projectsService.list(user.id)));
});

projectsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await projectsService.create(user.id, body)), 201);
});

projectsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await projectsService.getById(c.req.param('id'), user.id)));
});

projectsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await projectsService.update(c.req.param('id'), user.id, body)));
});

projectsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await projectsService.remove(c.req.param('id'), user.id)));
});

projectsRouter.post('/:id/set-default', async (c) => {
  const user = c.get('user');
  return c.json(ok(await projectsService.setDefault(c.req.param('id'), user.id)));
});

projectsRouter.patch(
  '/:id/markets',
  zValidator(
    'json',
    z.object({
      text: z.string().max(5000).optional(),
      countries: z.array(z.string()).max(200).optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== user.id) throw new Forbidden();
    const body = c.req.valid('json');
    const marketText = body.text ?? body.countries?.join(', ') ?? null;
    const updated = await prisma.project.update({
      where: { id },
      data: {
        operatingCountries: marketText,
        operatingCountriesSuggested: null,
      },
    });
    return c.json(
      ok({
        id: updated.id,
        operating_countries: updated.operatingCountries,
        operating_countries_suggested: updated.operatingCountriesSuggested,
      }),
    );
  },
);

projectsRouter.post('/:id/detect-markets', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== user.id) throw new Forbidden();
  let markdown = '';
  if (project.websiteUrl) {
    try {
      const wa = await websiteAnalyzer.analyze({
        url: project.websiteUrl,
        userId: user.id,
        projectId: id,
      });
      markdown = wa.result.pages?.[0]?.excerpt ?? '';
    } catch {}
  }
  const res = await marketDetector.detect({
    projectId: id,
    userId: user.id,
    websiteMarkdown: markdown,
  });
  if (res.countries.length > 0) {
    await prisma.project.update({
      where: { id },
      data: { operatingCountriesSuggested: res.countries.join(', ') },
    });
  }
  return c.json(ok(res));
});

projectsRouter.get('/:id/social-stats', async (c) => {
  const user = c.get('user');
  const res = await projectsService.getSocialStats(c.req.param('id'), user.id);
  return c.json(ok(res));
});

projectsRouter.get('/:id/social-posts', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const posts = await projectsService.getSocialPosts(c.req.param('id'), user.id, limit);
  // Manual serialization to match competitor posts structure
  const serialized = posts.map(p => ({
    id: p.id,
    post_url: p.postUrl,
    caption: p.caption,
    likes: p.likes,
    comments: p.comments,
    views: p.views,
    platform: String(p.platform),
    image_url: p.imageUrl,
    posted_at: p.postedAt?.toISOString() ?? null,
  }));
  return c.json(ok(serialized));
});
