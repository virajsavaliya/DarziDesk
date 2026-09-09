/**
 * User (Staff/Owner) management service.
 *
 * All operations that read or write tenant-scoped user data go through
 * withTenantContext(), which:
 *   1. Opens a Prisma transaction
 *   2. Sets SET LOCAL app.tenant_id = '<tenantId>' (RLS layer 2)
 *   3. The WHERE clause in every query also filters by tenantId (RLS layer 1)
 *
 * CRITICAL: tenantId is always sourced from res.locals.auth.tenantId (JWT).
 * It is passed as a parameter to these functions by the router — never
 * read from req.body, req.query, or req.headers inside this file.
 */

import argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { prisma, withTenantContext } from '../../lib/prisma';
import { ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { checkEntitlement } from '../subscriptions/entitlement.service';
import type { SafeUser } from '../auth/auth.service';
import type { CreateStaffInput, SetActiveInput } from '../auth/auth.schema';

function toSafeUser(user: {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isActive: boolean;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    tenantId: user.tenantId,
    isActive: user.isActive,
  };
}

// ---------------------------------------------------------------------------
// List staff in a tenant
// ---------------------------------------------------------------------------

export async function listStaff(tenantId: string): Promise<SafeUser[]> {
  const users = await withTenantContext(tenantId, (tx) =>
    tx.user.findMany({
      where: { tenantId }, // Layer 1: app-level filter
      // Layer 2: RLS USING policy enforces tenant_id = app.tenant_id in Postgres
      orderBy: { createdAt: 'desc' },
    }),
  );
  return users.map(toSafeUser);
}

// ---------------------------------------------------------------------------
// Get single staff member
// ---------------------------------------------------------------------------

export async function getStaffMember(
  userId: string,
  tenantId: string,
): Promise<SafeUser> {
  const user = await withTenantContext(tenantId, (tx) =>
    tx.user.findFirst({
      where: { id: userId, tenantId }, // Both layers active
    }),
  );

  if (!user) {
    // Return 404 regardless of whether the user doesn't exist or belongs to
    // another tenant — revealing the difference would aid enumeration
    throw new NotFoundError('User');
  }

  return toSafeUser(user);
}

// ---------------------------------------------------------------------------
// Create staff member (by Shop Owner)
// ---------------------------------------------------------------------------

export async function createStaffMember(
  callerTenantId: string,
  data: CreateStaffInput,
): Promise<SafeUser> {
  // Enforce staff accounts entitlement for this tenant's subscription plan
  await checkEntitlement(callerTenantId, 'STAFF');

  // Check email uniqueness within tenant before hashing (cheap check first)
  const existing = await prisma.user.findFirst({
    where: { tenantId: callerTenantId, email: data.email },
  });
  if (existing) {
    throw new ConflictError('A staff member with this email already exists in your shop');
  }

  const passwordHash = await argon2.hash(data.password);

  const user = await withTenantContext(callerTenantId, (tx) =>
    tx.user.create({
      data: {
        // tenantId ALWAYS comes from the caller's JWT — never from data
        tenantId: callerTenantId,
        email: data.email,
        passwordHash,
        role: UserRole.STAFF, // Owner cannot elevate a new user to OWNER via this endpoint
        firstName: data.firstName,
        lastName: data.lastName,
      },
    }),
  );

  return toSafeUser(user);
}

// ---------------------------------------------------------------------------
// Activate / deactivate staff member
// ---------------------------------------------------------------------------

export async function setStaffActive(
  userId: string,
  tenantId: string,
  data: SetActiveInput,
): Promise<SafeUser> {
  // Verify the user belongs to this tenant first
  const existing = await withTenantContext(tenantId, (tx) =>
    tx.user.findFirst({ where: { id: userId, tenantId } }),
  );

  if (!existing) {
    throw new NotFoundError('User');
  }

  // Prevent owner from deactivating themselves
  if (existing.role === UserRole.SHOP_OWNER && !data.isActive) {
    throw new ForbiddenError('Cannot deactivate the shop owner account');
  }

  const user = await withTenantContext(tenantId, (tx) =>
    tx.user.update({
      where: { id: userId },
      data: { isActive: data.isActive },
    }),
  );

  return toSafeUser(user);
}
