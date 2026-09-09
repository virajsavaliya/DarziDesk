/**
 * Express type augmentation.
 *
 * Extends res.locals with our application-specific fields so all
 * middleware and route handlers get proper TypeScript types without casts.
 */

import type { UserRole } from '@prisma/client';

export interface StaffJwtPayload {
  sub: string;
  aud: 'darzi:staff';
  role: UserRole;
  /** null for SUPER_ADMIN; always present for SHOP_OWNER and STAFF */
  tenantId: string | null;
  iat: number;
  exp: number;
}

export interface CustomerJwtPayload {
  sub: string;
  aud: 'darzi:customer';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Locals {
      /** Set by authenticateStaff or authenticateCustomer middleware. */
      auth?: StaffJwtPayload | CustomerJwtPayload;
      /** Set by requireTenantContext middleware — always from JWT, never from client. */
      tenantId?: string | null;
    }
  }
}

// Make this a module (required for global augmentation to work)
export {};
