/**
 * Staff Dashboard Router.
 *
 * All routes require authenticateStaff + requireTenantContext.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import type { StaffJwtPayload } from '../../lib/jwt';
import { ListStaffOrdersQuerySchema } from './staff.schema';
import {
  getStaffOrders,
  getStaffOrderById,
  getStaffDailySummary,
} from './staff.service';

export const staffRouter = Router();
staffRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// GET /api/staff/me/orders — personal task queue
// ---------------------------------------------------------------------------
staffRouter.get('/me/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const query = ListStaffOrdersQuerySchema.parse(req.query);

    const result = await getStaffOrders(tenantId, auth.sub, auth.role, query);
    res.status(200).json({ data: result.orders, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/me/orders/:id — single order detail with staff ownership enforcement
// ---------------------------------------------------------------------------
staffRouter.get('/me/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const order = await getStaffOrderById(tenantId, req.params.id, auth.sub, auth.role);
    res.status(200).json({ data: order });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/me/summary — daily task summary widget metrics
// ---------------------------------------------------------------------------
staffRouter.get('/me/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const summary = await getStaffDailySummary(tenantId, auth.sub, auth.role);
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
});
