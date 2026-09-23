/**
 * Tenant Context Middleware.
 *
 * Enforces strict multi-tenant isolation and secure Super Admin Support Session access.
 *
 * SECURITY GUARANTEES:
 * 1. ZERO trust in client-supplied tenant headers (e.g. `x-tenant-id` is strictly ignored).
 * 2. For SHOP_OWNER / STAFF: tenantId is derived EXCLUSIVELY from the cryptographically
 *    verified JWT (res.locals.auth.tenantId).
 * 3. For SUPER_ADMIN: Global Super Admin cannot access tenant-scoped routes without
 *    an active, server-validated Support Session passed via `x-support-session-token`.
 *    If the session scope is READ_ONLY, any mutation (POST/PUT/PATCH/DELETE) is blocked.
 * 4. Tenant lifecycle status is enforced: suspended tenants reject staff logins/actions.
 */

import type { RequestHandler } from 'express';
import type { StaffJwtPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { validateSupportSessionToken } from '../modules/admin/supportSession.service';
import { SupportSessionScope } from '@prisma/client';

export const requireTenantContext: RequestHandler = async (req, res, next) => {
  const auth = res.locals.auth as StaffJwtPayload | undefined;

  if (!auth) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Super Admin Support Session Handling
    // -------------------------------------------------------------------------
    if (auth.role === 'SUPER_ADMIN') {
      const supportToken = req.headers['x-support-session-token'] as string | undefined;

      if (!supportToken) {
        res.status(403).json({
          error: {
            message: 'Super Admin tenant-scoped operations require an active Support Session. Provide x-support-session-token header.',
            code: 'SUPPORT_SESSION_REQUIRED',
          },
        });
        return;
      }

      const session = await validateSupportSessionToken(supportToken);
      if (!session) {
        res.status(403).json({
          error: {
            message: 'Support session is invalid, expired, or revoked.',
            code: 'SUPPORT_SESSION_INVALID',
          },
        });
        return;
      }

      // Enforce Scope: READ_ONLY blocks mutations
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
      if (isMutation && session.scope === SupportSessionScope.READ_ONLY) {
        res.status(403).json({
          error: {
            message: 'Active support session is READ_ONLY. Modifying tenant data requires explicit READ_WRITE support scope.',
            code: 'SUPPORT_READ_ONLY',
          },
        });
        return;
      }

      res.locals.tenantId = session.tenantId;
      res.locals.supportSessionId = session.id;
      res.locals.supportScope = session.scope;
      next();
      return;
    }

    // -------------------------------------------------------------------------
    // 2. Normal Tenant Request (SHOP_OWNER / STAFF)
    // -------------------------------------------------------------------------
    const resolvedTenantId = auth.tenantId;

    if (!resolvedTenantId) {
      res.status(401).json({
        error: {
          message: 'No tenant associated with user token',
          code: 'TENANT_NOT_FOUND',
        },
      });
      return;
    }

    // Verify tenant exists and check lifecycle state
    const tenant = await prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
      select: { id: true, isActive: true, lifecycleState: true },
    });

    if (!tenant) {
      res.status(401).json({
        error: {
          message: 'Your shop session has expired or the shop was removed. Please sign in again.',
          code: 'TENANT_NOT_FOUND',
        },
      });
      return;
    }

    if (!tenant.isActive || tenant.lifecycleState === 'SUSPENDED') {
      res.status(403).json({
        error: {
          message: 'This shop has been suspended by platform administration. Please contact support.',
          code: 'TENANT_SUSPENDED',
        },
      });
      return;
    }

    res.locals.tenantId = resolvedTenantId;
    next();
  } catch (err) {
    next(err);
  }
};
