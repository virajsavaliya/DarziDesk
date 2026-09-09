/**
 * Role-based authorization middleware.
 *
 * Must be used AFTER authenticateStaff (which sets res.locals.auth).
 *
 * Usage:
 *   router.get('/staff-only', authenticateStaff, authorize(UserRole.SHOP_OWNER, UserRole.STAFF), handler)
 *   router.get('/owner-only', authenticateStaff, authorize(UserRole.SHOP_OWNER), handler)
 */

import type { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import type { StaffJwtPayload } from '../lib/jwt';

export { UserRole };

/**
 * Returns a middleware that allows only the specified roles.
 * Responds with 403 if the authenticated user's role is not in the list.
 */
export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    const auth = res.locals.auth as StaffJwtPayload | undefined;

    if (!auth) {
      // Should not happen if authenticate* middleware ran first, but defensive check
      res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    if (!allowedRoles.includes(auth.role)) {
      res.status(403).json({
        error: {
          message: `This action requires one of: ${allowedRoles.join(', ')}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}
