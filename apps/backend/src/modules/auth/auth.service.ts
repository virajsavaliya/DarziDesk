/**
 * Authentication service.
 *
 * Handles tenant registration, staff login, customer registration,
 * and customer login. All password operations use argon2.
 *
 * Security notes:
 * - argon2.verify is used for password checking — never a string comparison.
 * - Login failure always returns AuthenticationError with the SAME generic
 *   message regardless of whether email or password is wrong. This prevents
 *   credential enumeration.
 * - Tenant + owner User creation is a single atomic transaction. If either
 *   fails, neither is committed.
 */

import argon2 from 'argon2';
import { UserRole, SubscriptionStatus, SubscriptionBillingCycle, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { signStaffToken, signCustomerToken } from '../../lib/jwt';
import { AuthenticationError, ConflictError, NotFoundError } from '../../lib/errors';
import type {
  RegisterTenantInput,
  LoginStaffInput,
  RegisterCustomerInput,
  LoginCustomerInput,
} from './auth.schema';

// ---------------------------------------------------------------------------
// Safe user shape — never expose passwordHash externally
// ---------------------------------------------------------------------------

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isActive: boolean;
}

export interface SafeCustomer {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
}

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

function toSafeCustomer(customer: {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
}): SafeCustomer {
  return {
    id: customer.id,
    phone: customer.phone,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
}

// ---------------------------------------------------------------------------
// Tenant registration
// ---------------------------------------------------------------------------

export async function registerTenant(
  data: RegisterTenantInput,
): Promise<{ token: string; user: SafeUser }> {
  // Check slug uniqueness (friendly error before hitting DB unique constraint)
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: data.slug },
  });
  if (existingTenant) {
    throw new ConflictError(`Shop slug '${data.slug}' is already taken`);
  }

  const passwordHash = await argon2.hash(data.ownerPassword);

  // Atomic: Tenant, User, and TenantSubscription are created in the same transaction
  const { tenant, user } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: data.shopName, slug: data.slug },
    });

    // Resolve or auto-seed the default TRIAL plan
    let defaultPlan = await tx.subscriptionPlan.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!defaultPlan) {
      defaultPlan = await tx.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
    }
    if (!defaultPlan) {
      defaultPlan = await tx.subscriptionPlan.create({
        data: {
          name: 'Starter Trial',
          priceMonthly: new Prisma.Decimal('999.00'),
          priceYearly: new Prisma.Decimal('9999.00'),
          maxStaffAccounts: 2,
          maxOrdersPerMonth: 20,
          maxSmsCredits: 50,
          features: ['2 Staff Accounts', '20 Orders/Month', '50 SMS Credits', 'Full Tailoring Suite'],
          isActive: true,
          isDefault: true,
        },
      });
    }

    const now = new Date();
    const trialDays = 14;
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: defaultPlan.id,
        status: SubscriptionStatus.TRIAL,
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: data.ownerEmail,
        passwordHash,
        role: UserRole.SHOP_OWNER,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    return { tenant, user };
  });

  const token = await signStaffToken({
    sub: user.id,
    role: user.role,
    tenantId: tenant.id,
  });

  return { token, user: toSafeUser(user) };
}

// ---------------------------------------------------------------------------
// Staff / Owner login
// ---------------------------------------------------------------------------

export async function loginStaff(
  data: LoginStaffInput,
): Promise<{ token: string; user: SafeUser }> {
  // Step 1: Check if this is a SUPER_ADMIN login (no tenant required)
  const superAdmin = await prisma.user.findFirst({
    where: { email: data.email, role: UserRole.SUPER_ADMIN, isActive: true },
  });

  if (superAdmin) {
    const valid = await argon2.verify(superAdmin.passwordHash, data.password);
    if (!valid) {
      throw new AuthenticationError();
    }
    const token = await signStaffToken({
      sub: superAdmin.id,
      role: superAdmin.role,
      tenantId: null,
    });
    return { token, user: toSafeUser(superAdmin) };
  }

  // Step 2: Resolve tenant from slug or tenantSlug
  const slug = data.slug || data.tenantSlug;
  if (!slug) {
    throw new AuthenticationError();
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });

  if (!tenant?.isActive) {
    // Generic error — don't reveal whether the slug exists
    throw new AuthenticationError();
  }

  // Step 3: Find user within that tenant (app-level scope — before RLS applies)
  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: data.email, isActive: true },
  });

  if (!user) {
    throw new AuthenticationError();
  }

  // Step 4: Verify password
  const valid = await argon2.verify(user.passwordHash, data.password);
  if (!valid) {
    throw new AuthenticationError();
  }

  const token = await signStaffToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });

  return { token, user: toSafeUser(user) };
}

// ---------------------------------------------------------------------------
// Customer registration
// ---------------------------------------------------------------------------

export async function registerCustomer(
  data: RegisterCustomerInput,
): Promise<{ token: string; customer: SafeCustomer }> {
  // Check phone uniqueness
  const existingPhone = await prisma.customer.findUnique({ where: { phone: data.phone } });
  if (existingPhone) {
    throw new ConflictError('An account with this phone number already exists');
  }

  // Check email uniqueness if provided
  if (data.email) {
    const existingEmail = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new ConflictError('An account with this email already exists');
    }
  }

  const passwordHash = await argon2.hash(data.password);

  const customer = await prisma.customer.create({
    data: {
      phone: data.phone,
      email: data.email ?? null,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });

  const token = await signCustomerToken({ sub: customer.id });

  return { token, customer: toSafeCustomer(customer) };
}

// ---------------------------------------------------------------------------
// Customer login
// ---------------------------------------------------------------------------

export async function loginCustomer(
  data: LoginCustomerInput,
): Promise<{ token: string; customer: SafeCustomer }> {
  const where = data.email ? { email: data.email } : { phone: data.phone! };
  const customer = await prisma.customer.findFirst({ where });

  if (!customer || !customer.passwordHash) {
    throw new AuthenticationError();
  }

  const valid = await argon2.verify(customer.passwordHash, data.password);
  if (!valid) {
    throw new AuthenticationError();
  }

  const token = await signCustomerToken({ sub: customer.id });

  return { token, customer: toSafeCustomer(customer) };
}

// ---------------------------------------------------------------------------
// Get current user (staff/owner — used by /api/users/me)
// ---------------------------------------------------------------------------

export async function getStaffById(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  return toSafeUser(user);
}

export async function getCustomerById(customerId: string): Promise<SafeCustomer> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Customer');
  return toSafeCustomer(customer);
}
