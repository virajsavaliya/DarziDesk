/**
 * Owner Dashboard Router.
 *
 * All routes:
 * - Require authenticateStaff + requireTenantContext
 * - Are restricted to SHOP_OWNER role (enforced in service layer)
 * - Are tenant-scoped via RLS
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import type { StaffJwtPayload } from '../../lib/jwt';
import {
  getOwnerDashboardSummary,
  getRecentOrders,
  getAttentionRequired,
  getRecentActivity,
} from './dashboard.service';

export const dashboardRouter = Router();
dashboardRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary — KPI totals for the Owner overview header
// ---------------------------------------------------------------------------
dashboardRouter.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const summary = await getOwnerDashboardSummary(tenantId, auth.role);
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/orders/recent — Latest 10 orders for the Recent Orders table
// ---------------------------------------------------------------------------
dashboardRouter.get('/orders/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);

    const orders = await getRecentOrders(tenantId, auth.role, limit);
    res.status(200).json({ data: orders });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/attention-required — Overdue + due-today orders + low-stock
// ---------------------------------------------------------------------------
dashboardRouter.get('/attention-required', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const attention = await getAttentionRequired(tenantId, auth.role);
    res.status(200).json({ data: attention });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/activity — Last 20 status log entries (activity feed)
// ---------------------------------------------------------------------------
dashboardRouter.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    const activity = await getRecentActivity(tenantId, auth.role, limit);
    res.status(200).json({ data: activity });
  } catch (err) {
    next(err);
  }
});
