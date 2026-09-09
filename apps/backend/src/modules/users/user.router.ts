/**
 * Users router.
 *
 * All routes require:
 * - authenticateStaff   — verifies JWT, sets res.locals.auth
 * - requireTenantContext — copies tenantId from JWT to res.locals.tenantId
 *
 * The tenantId passed to service functions ALWAYS comes from
 * res.locals.auth.tenantId (the verified JWT). The request body is never
 * used as a source of tenant identity.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize, UserRole } from '../../middleware/authorize';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import { CreateStaffSchema, SetActiveSchema } from '../auth/auth.schema';
import {
  listStaff,
  getStaffMember,
  createStaffMember,
  setStaffActive,
} from './user.service';
import { getStaffById } from '../auth/auth.service';
import type { StaffJwtPayload } from '../../lib/jwt';

export const usersRouter = Router();

// Apply auth + tenant context to every route in this router
usersRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// GET /api/users/me — own profile (no role restriction)
// ---------------------------------------------------------------------------
usersRouter.get(
  '/me',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      const user = await getStaffById(auth.sub);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/users — list all staff in the shop (owner only)
// ---------------------------------------------------------------------------
usersRouter.get(
  '/',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const users = await listStaff(tenantId);
      res.status(200).json({ data: users });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/users/:userId — single staff member (owner only)
// ---------------------------------------------------------------------------
usersRouter.get(
  '/:userId',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const user = await getStaffMember(req.params.userId, tenantId);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/users — create staff member (owner only)
// ---------------------------------------------------------------------------
usersRouter.post(
  '/',
  authorize(UserRole.SHOP_OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const data = CreateStaffSchema.parse(req.body);
      const user = await createStaffMember(tenantId, data);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/users/:userId/active — activate/deactivate (owner only)
// ---------------------------------------------------------------------------
usersRouter.patch(
  '/:userId/active',
  authorize(UserRole.SHOP_OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const data = SetActiveSchema.parse(req.body);
      const user = await setStaffActive(req.params.userId, tenantId, data);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);
