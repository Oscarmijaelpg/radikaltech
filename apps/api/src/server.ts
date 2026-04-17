import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startScheduledReportsLoop } from './modules/scheduled-reports/service.js';

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  const url = `http://localhost:${info.port}`;
  logger.info({ port: info.port, env: env.NODE_ENV }, `API listening at ${url}`);
  // eslint-disable-next-line no-console
  console.log(`[api] ready at ${url}/api/v1`);
  startScheduledReportsLoop();
});
