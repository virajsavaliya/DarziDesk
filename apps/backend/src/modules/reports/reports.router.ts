/**
 * Reports & Analytics Router
 *
 * Exposes 4 read-only tenant-scoped aggregation endpoints:
 * - GET /api/reports/revenue?from=&to=
 * - GET /api/reports/orders?from=&to=
 * - GET /api/reports/staff-performance?from=&to=
 * - GET /api/reports/fabric-consumption?from=&to=
 *
 * Strictly authorized for SHOP_OWNER only.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { authorize, UserRole } from '../../middleware/authorize';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  getRevenueReport,
  getOrdersReport,
  getStaffPerformanceReport,
  getFabricConsumptionReport,
  type DateRange,
} from './reports.service';

export const reportsRouter = Router();

// Strict security: Staff authentication + Tenant Context + Shop Owner Role Authorization
reportsRouter.use(
  authenticateStaff,
  requireTenantContext,
  authorize(UserRole.SHOP_OWNER),
  apiLimiter,
);

/**
 * Parses query params 'from' and 'to' into valid Date objects.
 * Defaults to: start of current month -> end of current day.
 */
function parseDateRange(req: Request): DateRange {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (typeof req.query.from === 'string' && req.query.from.trim()) {
    fromDate = new Date(req.query.from.trim());
    if (isNaN(fromDate.getTime())) {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  } else {
    // Default: 1st of current month
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (typeof req.query.to === 'string' && req.query.to.trim()) {
    toDate = new Date(req.query.to.trim());
    if (isNaN(toDate.getTime())) {
      toDate = new Date(now);
    }
  } else {
    toDate = new Date(now);
  }

  // Ensure 'to' covers end of the day if just a date string (YYYY-MM-DD) was provided
  if (
    typeof req.query.to === 'string' &&
    req.query.to.trim().length === 10 &&
    !req.query.to.includes('T')
  ) {
    toDate.setHours(23, 59, 59, 999);
  }

  return { from: fromDate, to: toDate };
}

// 1. GET /api/reports/revenue?from=&to=
reportsRouter.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const range = parseDateRange(req);
    const data = await getRevenueReport(tenantId, range);
    res.status(200).json({ data, range: { from: range.from.toISOString(), to: range.to.toISOString() } });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/reports/orders?from=&to=
reportsRouter.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const range = parseDateRange(req);
    const data = await getOrdersReport(tenantId, range);
    res.status(200).json({ data, range: { from: range.from.toISOString(), to: range.to.toISOString() } });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/reports/staff-performance?from=&to=
reportsRouter.get('/staff-performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const range = parseDateRange(req);
    const data = await getStaffPerformanceReport(tenantId, range);
    res.status(200).json({ data, range: { from: range.from.toISOString(), to: range.to.toISOString() } });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/reports/fabric-consumption?from=&to=
reportsRouter.get('/fabric-consumption', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const range = parseDateRange(req);
    const data = await getFabricConsumptionReport(tenantId, range);
    res.status(200).json({ data, range: { from: range.from.toISOString(), to: range.to.toISOString() } });
  } catch (err) {
    next(err);
  }
});
