import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { brandService } from './service.js';

const upsertSchema = z.object({
  project_id: z.string().uuid(),
  tone: z.string().max(200).optional(),
  voice: z.string().max(200).optional(),
  values: z.array(z.string()).optional(),
  audience: z.string().optional(),
  visual: z.string().optional(),
  summary: z.string().max(4000).optional(),
});

const generateSchema = z.object({ project_id: z.string().uuid() });
const listQuerySchema = z.object({ project_id: z.string().uuid() });
const acceptSuggestionSchema = z.object({
  project_id: z.string().uuid(),
  field: z.enum(['color_palette']),
});

export const brandRouter = new Hono<{ Variables: AuthVariables }>();

brandRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  return c.json(ok(await brandService.getByProject(project_id, user.id)));
});

brandRouter.put('/', zValidator('json', upsertSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await brandService.upsert(user.id, body)));
});

brandRouter.post('/generate', zValidator('json', generateSchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('json');
  return c.json(ok(await brandService.generate(user.id, project_id)));
});

brandRouter.post(
  '/accept-suggestion',
  zValidator('json', acceptSuggestionSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');
    return c.json(ok(await brandService.acceptSuggestion(user.id, body)));
  },
);
