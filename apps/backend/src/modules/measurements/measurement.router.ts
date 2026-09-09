/**
 * Measurement profiles router.
 *
 * Routes:
 * - Customer-nested measurement routes (/api/customers/:customerId/measurements)
 * - Profile-specific measurement routes (/api/measurements/:profileId/*)
 *
 * All routes require authenticateStaff + requireTenantContext.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  CreateMeasurementProfileSchema,
  CreateMeasurementVersionSchema,
} from './measurement.schema';
import {
  createMeasurementProfile,
  listProfilesForCustomer,
  getProfileWithHistory,
  addMeasurementVersion,
} from './measurement.service';
import type { StaffJwtPayload } from '../../lib/jwt';

export const customerMeasurementsRouter = Router({ mergeParams: true });
customerMeasurementsRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// GET /api/customers/:customerId/measurements — list profiles for this customer
customerMeasurementsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const { customerId } = req.params;
    const profiles = await listProfilesForCustomer(tenantId, customerId);
    res.status(200).json({ data: profiles });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers/:customerId/measurements — create new measurement profile
customerMeasurementsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const { customerId } = req.params;
    const data = CreateMeasurementProfileSchema.parse(req.body);
    const profile = await createMeasurementProfile(tenantId, customerId, auth.sub, data);
    res.status(201).json({ data: profile });
  } catch (err) {
    next(err);
  }
});

export const measurementsRouter = Router();
measurementsRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// GET /api/measurements/:profileId — get profile details + full immutable version history
measurementsRouter.get('/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const profile = await getProfileWithHistory(tenantId, req.params.profileId);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/measurements/:profileId/versions — create a new version (never overwrites previous values)
measurementsRouter.post('/:profileId/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = CreateMeasurementVersionSchema.parse(req.body);
    const newVersion = await addMeasurementVersion(tenantId, req.params.profileId, auth.sub, data);
    res.status(201).json({ data: newVersion });
  } catch (err) {
    next(err);
  }
});
