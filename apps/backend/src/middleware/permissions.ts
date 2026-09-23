/**
 * Fine-grained Permission Authorization Middleware.
 *
 * Requirements:
 * - Permissions do NOT rely on static JWT claims as the authoritative source of truth.
 * - Live permissions are evaluated from server-side database state with a fast, auto-invalidated cache.
 * - Any permission change or authzVersion increment takes effect immediately.
 * - SHOP_OWNER possesses all tenant permissions.
 */

import type { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import type { StaffJwtPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// Canonical Permissions Catalogue
export const Permissions = {
  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_ASSIGN: 'orders.assign',
  ORDERS_TRANSITION: 'orders.transition',
  ORDERS_CANCEL: 'orders.cancel',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',

  // Measurements
  MEASUREMENTS_VIEW: 'measurements.view',
  MEASUREMENTS_CREATE: 'measurements.create',
  MEASUREMENTS_EDIT: 'measurements.edit',

  // Fabrics
  FABRICS_VIEW: 'fabrics.view',
  FABRICS_PURCHASE: 'fabrics.purchase',
  FABRICS_ADJUST: 'fabrics.adjust',
  FABRICS_CONSUME: 'fabrics.consume',

  // Invoices & Billing
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',

  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_RECORD: 'payments.record',
  PAYMENTS_REFUND: 'payments.refund',

  // Reports
  REPORTS_VIEW: 'reports.view',

  // Staff Administration
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_EDIT: 'staff.edit',
  STAFF_DISABLE: 'staff.disable',

  // Shop Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
} as const;

interface CachedUserAuthz {
  permissions: Set<string>;
  authzVersion: number;
  role: UserRole;
  isActive: boolean;
  expiresAt: number;
}

const authzCache = new Map<string, CachedUserAuthz>();
const CACHE_TTL_MS = 30_000; // 30 seconds max TTL; invalidated immediately on user update

/**
 * Explicitly invalidates the cached permissions for a user and increments authzVersion in DB.
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  authzCache.delete(userId);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { authzVersion: { increment: 1 } },
    });
  } catch (err) {
    // In test or race conditions if user already deleted
  }
}

/**
 * Retrieves the authoritative, live permissions for a user from database / cache.
 */
export async function getUserEffectivePermissions(userId: string): Promise<CachedUserAuthz | null> {
  const now = Date.now();
  const cached = authzCache.get(userId);

  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      authzVersion: true,
      permissions: true,
    },
  });

  if (!user || !user.isActive) {
    authzCache.delete(userId);
    return null;
  }

  const authzData: CachedUserAuthz = {
    permissions: new Set(user.permissions || []),
    authzVersion: user.authzVersion,
    role: user.role,
    isActive: user.isActive,
    expiresAt: now + CACHE_TTL_MS,
  };

  authzCache.set(userId, authzData);
  return authzData;
}

/**
 * Returns a middleware requiring the authenticated user to possess the specified permission(s).
 */
export function requirePermission(...requiredPermissions: string[]): RequestHandler {
  return async (_req, res, next) => {
    const auth = res.locals.auth as StaffJwtPayload | undefined;

    if (!auth) {
      res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // 1. SHOP_OWNER has blanket permissions over their tenant workspace
    if (auth.role === UserRole.SHOP_OWNER) {
      next();
      return;
    }

    // 2. SUPER_ADMIN operating under Support Session
    if (auth.role === UserRole.SUPER_ADMIN) {
      // Super Admin support session already had its scope checked in requireTenantContext
      next();
      return;
    }

    // 3. STAFF User: evaluate server-side permissions
    const effective = await getUserEffectivePermissions(auth.sub);

    if (!effective || !effective.isActive) {
      res.status(403).json({
        error: {
          message: 'User account is inactive or authorization record not found.',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    for (const perm of requiredPermissions) {
      if (!effective.permissions.has(perm)) {
        res.status(403).json({
          error: {
            message: `Action requires permission: '${perm}'`,
            code: 'PERMISSION_DENIED',
          },
        });
        return;
      }
    }

    next();
  };
}
