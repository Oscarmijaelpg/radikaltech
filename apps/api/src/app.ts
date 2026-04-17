import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { requireAuth, type AuthVariables } from './middleware/auth.js';

import { healthRouter } from './modules/health/routes.js';
import { usersRouter } from './modules/users/routes.js';
import { projectsRouter } from './modules/projects/routes.js';
import { onboardingRouter } from './modules/onboarding/routes.js';
import { socialAccountsRouter } from './modules/social-accounts/routes.js';
import { brandRouter } from './modules/brand/routes.js';
import { brandHistoryRouter } from './modules/brand/history-routes.js';
import { objectivesRouter } from './modules/objectives/routes.js';
import { memoryRouter } from './modules/memory/routes.js';
import { competitorsRouter } from './modules/competitors/routes.js';
import { chatsRouter } from './modules/chats/routes.js';
import { aiServicesRouter } from './modules/ai-services/routes.js';
import { jobsRouter } from './modules/jobs/routes.js';
import { contentRouter } from './modules/content/routes.js';
import { reportsRouter } from './modules/reports/routes.js';
import { statsRouter } from './modules/stats/routes.js';
import { schedulerRouter } from './modules/scheduler/routes.js';
import { recommendationsRouter } from './modules/recommendations/routes.js';
import { scheduledReportsRouter } from './modules/scheduled-reports/routes.js';
import { notificationsRouter } from './modules/notifications/routes.js';

export function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.use('*', corsMiddleware);
  app.use('*', loggerMiddleware);

  app.onError(errorHandler);

  // Public
  app.route('/api/v1/health', healthRouter);

  // Protected
  const api = new Hono<{ Variables: AuthVariables }>();
  api.use('*', requireAuth);
  api.route('/users', usersRouter);
  api.route('/projects', projectsRouter);
  api.route('/onboarding', onboardingRouter);
  api.route('/social-accounts', socialAccountsRouter);
  api.route('/brand/history', brandHistoryRouter);
  api.route('/brand', brandRouter);
  api.route('/objectives', objectivesRouter);
  api.route('/memory', memoryRouter);
  api.route('/competitors', competitorsRouter);
  api.route('/chats', chatsRouter);
  api.route('/ai', aiServicesRouter);
  api.route('/ai-services', aiServicesRouter);
  api.route('/jobs', jobsRouter);
  api.route('/content', contentRouter);
  api.route('/reports', reportsRouter);
  api.route('/stats', statsRouter);
  api.route('/scheduled-posts', schedulerRouter);
  api.route('/recommendations', recommendationsRouter);
  api.route('/scheduled-reports', scheduledReportsRouter);
  api.route('/notifications', notificationsRouter);

  app.route('/api/v1', api);

  app.notFound((c) => {
    const request_id = c.get('request_id') as string | undefined;
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' }, request_id },
      404,
    );
  });

  return app;
}

export const app = createApp();
