import { Hono } from 'hono';
import { requireAdmin, type AuthVariables } from '../../middleware/auth.js';
import { statsRouter } from './stats-routes.js';
import { usersAdminRouter } from './users-routes.js';
import { projectsAdminRouter } from './projects-routes.js';
import { jobsAdminRouter } from './jobs-routes.js';
import { providersAdminRouter } from './providers-routes.js';
import { moderationAdminRouter } from './moderation-routes.js';
import { broadcastAdminRouter } from './broadcast-routes.js';
import { flagsAdminRouter } from './flags-routes.js';
import { scheduledReportsAdminRouter } from './scheduled-reports-routes.js';
import { auditAdminRouter } from './audit-routes.js';
import { actionPricesAdminRouter } from './action-prices-routes.js';
import { systemConfigAdminRouter } from './system-config-routes.js';

export const adminRouter = new Hono<{ Variables: AuthVariables }>();

adminRouter.use('*', requireAdmin);

adminRouter.route('/stats', statsRouter);
adminRouter.route('/users', usersAdminRouter);
adminRouter.route('/projects', projectsAdminRouter);
adminRouter.route('/jobs', jobsAdminRouter);
adminRouter.route('/providers', providersAdminRouter);
adminRouter.route('/moderation', moderationAdminRouter);
adminRouter.route('/broadcast', broadcastAdminRouter);
adminRouter.route('/flags', flagsAdminRouter);
adminRouter.route('/scheduled-reports', scheduledReportsAdminRouter);
adminRouter.route('/audit', auditAdminRouter);
adminRouter.route('/action-prices', actionPricesAdminRouter);
adminRouter.route('/system-config', systemConfigAdminRouter);
