/**
 * Tenant context middleware.
 *
 * Copies tenantId from the verified JWT payload (res.locals.auth) into
 * res.locals.tenantId. Route handlers and services read from res.locals.tenantId.
 *
 * SECURITY GUARANTEE:
 * The tenant context is sourced EXCLUSIVELY from res.locals.auth, which is
 * set only by the authenticate* middleware after signature verification.
 * There is no code path from request body / query / headers to tenantId.
 *
 * Must run AFTER authenticateStaff. Customer routes do not use this middleware
 * because customers have no tenant in their JWT — their tenant context is
 * determined per-operation via ShopCustomerLink.
 */

import type { RequestHandler } from 'express';
import type { StaffJwtPayload } from '../lib/jwt';

/**
 * Sets res.locals.tenantId from the authenticated staff JWT.
 * - SHOP_OWNER / STAFF: tenantId is set to their shop's ID.
 * - SUPER_ADMIN: tenantId is set to null (allows cross-tenant access).
 */
export const requireTenantContext: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as StaffJwtPayload | undefined;

  if (!auth) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }

  // Explicitly copy from JWT payload — req.body/query/headers are NOT read here
  res.locals.tenantId = auth.tenantId; // null for SUPER_ADMIN, string for others

  next();
};
