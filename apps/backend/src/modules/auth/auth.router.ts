/**
 * Auth router.
 *
 * Public routes — no authentication required.
 * Rate limited per the three-tier config in rateLimiter.ts.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';
import {
  RegisterTenantSchema,
  LoginStaffSchema,
  RegisterCustomerSchema,
  LoginCustomerSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
} from './auth.schema';
import {
  registerTenant,
  loginStaff,
  registerCustomer,
  loginCustomer,
} from './auth.service';
import {
  requestPasswordReset,
  confirmPasswordReset,
} from './passwordReset.service';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register/tenant
// ---------------------------------------------------------------------------
authRouter.post(
  '/register/tenant',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = RegisterTenantSchema.parse(req.body);
      const result = await registerTenant(data);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/login/staff
// ---------------------------------------------------------------------------
authRouter.post(
  '/login/staff',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = LoginStaffSchema.parse(req.body);
      const result = await loginStaff(data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/register/customer
// ---------------------------------------------------------------------------
authRouter.post(
  '/register/customer',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = RegisterCustomerSchema.parse(req.body);
      const result = await registerCustomer(data);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/login/customer
// ---------------------------------------------------------------------------
authRouter.post(
  '/login/customer',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = LoginCustomerSchema.parse(req.body);
      const result = await loginCustomer(data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/password-reset/request
// ---------------------------------------------------------------------------
authRouter.post(
  '/password-reset/request',
  passwordResetLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = PasswordResetRequestSchema.parse(req.body);
      await requestPasswordReset(data);
      // Always 200 — same response whether email exists or not
      res.status(200).json({
        data: {
          message:
            'If that email address is registered, you will receive reset instructions.',
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/password-reset/confirm
// ---------------------------------------------------------------------------
authRouter.post(
  '/password-reset/confirm',
  passwordResetLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = PasswordResetConfirmSchema.parse(req.body);
      await confirmPasswordReset(data);
      res.status(200).json({ data: { message: 'Password updated successfully.' } });
    } catch (err) {
      next(err);
    }
  },
);
