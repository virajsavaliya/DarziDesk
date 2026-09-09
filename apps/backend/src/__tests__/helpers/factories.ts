/**
 * Test data factories — create realistic DB records for tests.
 *
 * All factories use the testPrisma client (connected to TEST_DATABASE_URL).
 * Passwords are hashed with argon2 using a fast cost factor for test speed.
 */

import argon2 from 'argon2';
import {
  UserRole,
  InteractionSource,
  GarmentType,
  MeasurementUnit,
  FitPreference,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  Prisma,
  type Tenant,
  type User,
  type Customer,
  type MeasurementProfile,
  type MeasurementProfileVersion,
} from '@prisma/client';
import { testPrisma } from '../setup';

// Use a lower cost factor in tests to avoid slowness (argon2 default is expensive)
const TEST_ARGON2_OPTIONS: argon2.Options = { timeCost: 2, memoryCost: 1024 };

export const TEST_PASSWORD = 'TestPass1!';

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export async function createTenant(
  overrides: Partial<{
    name: string;
    slug: string;
    isActive: boolean;
    timezone: string;
    withoutSubscription?: boolean;
    planId?: string;
  }> = {},
): Promise<Tenant> {
  const slug = overrides.slug ?? `shop-${Math.random().toString(36).slice(2, 8)}`;
  const tenant = await testPrisma.tenant.create({
    data: {
      name: overrides.name ?? 'Test Shop',
      slug,
      isActive: overrides.isActive ?? true,
      ...(overrides.timezone ? { timezone: overrides.timezone } : {}),
    },
  });

  if (!overrides.withoutSubscription) {
    let defaultPlan = await testPrisma.subscriptionPlan.findFirst({
      where: overrides.planId ? { id: overrides.planId } : { isDefault: true, isActive: true },
    });
    if (!defaultPlan) {
      defaultPlan = await testPrisma.subscriptionPlan.findFirst({
        where: overrides.planId ? { id: overrides.planId } : { isActive: true },
      });
    }
    if (!defaultPlan) {
      defaultPlan = await testPrisma.subscriptionPlan.create({
        data: {
          name: `Factory Plan ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          priceMonthly: new Prisma.Decimal('999.00'),
          priceYearly: new Prisma.Decimal('9999.00'),
          maxStaffAccounts: 20,
          maxOrdersPerMonth: 500,
          maxSmsCredits: 500,
          isActive: true,
          isDefault: true,
        },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await testPrisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: defaultPlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  return tenant;
}

// ---------------------------------------------------------------------------
// User (Staff / Owner)
// ---------------------------------------------------------------------------

export async function createUser(
  tenantId: string,
  overrides: Partial<{
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }> = {},
): Promise<User> {
  const password = overrides.password ?? TEST_PASSWORD;
  const passwordHash = await argon2.hash(password, TEST_ARGON2_OPTIONS);

  return testPrisma.user.create({
    data: {
      tenantId,
      email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.com`,
      passwordHash,
      role: overrides.role ?? UserRole.STAFF,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createOwner(
  tenantId: string,
  overrides: Partial<{ email: string }> = {},
): Promise<User> {
  return createUser(tenantId, { ...overrides, role: UserRole.SHOP_OWNER });
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export async function createCustomer(
  overrides: Partial<{
    phone: string;
    email: string | null;
    password: string | null;
    firstName: string;
    lastName: string;
  }> = {},
): Promise<Customer> {
  const password = overrides.password === undefined ? TEST_PASSWORD : overrides.password;
  const passwordHash = password ? await argon2.hash(password, TEST_ARGON2_OPTIONS) : null;
  const phone = overrides.phone ?? `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  return testPrisma.customer.create({
    data: {
      phone,
      email: overrides.email === undefined ? `customer-${Math.random().toString(36).slice(2)}@test.com` : overrides.email,
      passwordHash,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'Customer',
    },
  });
}

// ---------------------------------------------------------------------------
// ShopCustomerLink
// ---------------------------------------------------------------------------

export async function linkCustomerToTenant(
  tenantId: string,
  customerId: string,
  source: InteractionSource = InteractionSource.WALK_IN,
) {
  return testPrisma.shopCustomerLink.create({
    data: { tenantId, customerId, firstInteractionSource: source },
  });
}

// ---------------------------------------------------------------------------
// Measurement Profile & Versions
// ---------------------------------------------------------------------------

export async function createMeasurementProfile(
  tenantId: string,
  customerId: string,
  overrides: Partial<{
    name: string;
    garmentType: GarmentType;
    notes: string;
  }> = {},
): Promise<MeasurementProfile> {
  return testPrisma.measurementProfile.create({
    data: {
      tenantId,
      customerId,
      name: overrides.name ?? 'Self',
      garmentType: overrides.garmentType ?? GarmentType.SHIRT,
      notes: overrides.notes ?? 'Standard fit',
    },
  });
}

export async function createProfileVersion(
  tenantId: string,
  profileId: string,
  createdById: string,
  overrides: Partial<{
    versionNumber: number;
    isCurrent: boolean;
    values: Record<string, number | string>;
    unit: MeasurementUnit;
    fitPreference: FitPreference;
    fitNotes: string;
  }> = {},
): Promise<MeasurementProfileVersion> {
  return testPrisma.measurementProfileVersion.create({
    data: {
      tenantId,
      profileId,
      versionNumber: overrides.versionNumber ?? 1,
      isCurrent: overrides.isCurrent ?? true,
      values: overrides.values ?? { Chest: 40, Waist: 34, Length: 29 },
      unit: overrides.unit ?? MeasurementUnit.INCHES,
      fitPreference: overrides.fitPreference ?? FitPreference.REGULAR,
      fitNotes: overrides.fitNotes ?? 'Test fit',
      createdById,
    },
  });
}

// ---------------------------------------------------------------------------
// Fabric
// ---------------------------------------------------------------------------

export async function createFabricRecord(
  tenantId: string,
  overrides: Partial<{
    name: string;
    color: string;
    type: string;
    pricePerMeter: number | string;
    availableMeters: number | string;
    reservedMeters: number | string;
    lowStockThreshold: number | string;
    isArchived: boolean;
  }> = {},
) {
  return testPrisma.fabric.create({
    data: {
      tenantId,
      name: overrides.name ?? 'Italian Linen',
      color: overrides.color ?? 'Navy Blue',
      type: overrides.type ?? 'Linen',
      pricePerMeter: overrides.pricePerMeter ?? '450.00',
      availableMeters: overrides.availableMeters ?? '10.000',
      reservedMeters: overrides.reservedMeters ?? '0.000',
      lowStockThreshold: overrides.lowStockThreshold ?? '5.000',
      isArchived: overrides.isArchived ?? false,
    },
  });
}
