import { prisma } from '../../lib/prisma';
import { UserRole, SubscriptionStatus, TenantLifecycleState } from '@prisma/client';
import { EntitlementError } from '../../lib/errors';
import { isFeatureEnabled } from '../admin/featureFlag.service';

/**
 * Checks whether a tenant is entitled to create a given resource (STAFF or ORDER).
 *
 * Enforces:
 * 1. Tenant lifecycleState (must not be SUSPENDED, CANCELLED, or ARCHIVED).
 * 2. Subscription active status (blocks order and staff creation if PAST_DUE, EXPIRED, or CANCELLED).
 * 3. maxStaffAccounts limit for the tenant's current plan.
 * 4. maxOrdersPerMonth limit within the current billing period.
 *
 * If limits are reached or status is invalid, throws an EntitlementError.
 */
export async function checkEntitlement(
  tenantId: string,
  resource: 'STAFF' | 'ORDER',
): Promise<void> {
  // 0. Verify tenant lifecycle state
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { lifecycleState: true, suspensionReason: true, name: true },
  });

  if (!tenant) {
    throw new EntitlementError('Tenant not found', 'TENANT_NOT_FOUND');
  }

  if (tenant.lifecycleState === TenantLifecycleState.SUSPENDED) {
    throw new EntitlementError(
      `Tenant account is suspended: ${tenant.suspensionReason || 'Contact platform support.'}`,
      'TENANT_SUSPENDED',
    );
  }

  if (
    tenant.lifecycleState === TenantLifecycleState.CANCELLED ||
    tenant.lifecycleState === TenantLifecycleState.ARCHIVED
  ) {
    throw new EntitlementError(
      `Tenant account is ${tenant.lifecycleState.toLowerCase()}. Operations are restricted.`,
      'TENANT_INACTIVE',
    );
  }

  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  // Fail-closed: Every tenant must have a valid subscription record.
  if (!subscription) {
    throw new EntitlementError(
      'No subscription found for tenant. Action blocked.',
      'SUBSCRIPTION_NOT_FOUND',
    );
  }

  // 1. Check inactive subscription status
  if (
    subscription.status === SubscriptionStatus.PAST_DUE ||
    subscription.status === SubscriptionStatus.EXPIRED ||
    subscription.status === SubscriptionStatus.CANCELLED
  ) {
    if (resource === 'ORDER') {
      throw new EntitlementError(
        `Subscription is ${subscription.status}. Cannot create new orders.`,
        'SUBSCRIPTION_INACTIVE',
      );
    }
    if (resource === 'STAFF') {
      throw new EntitlementError(
        `Subscription is ${subscription.status}. Cannot add new staff accounts.`,
        'SUBSCRIPTION_INACTIVE',
      );
    }
  }

  // Check period expiration if date passed
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
    if (resource === 'ORDER') {
      throw new EntitlementError(
        'Subscription period has expired. Cannot create new orders.',
        'SUBSCRIPTION_EXPIRED',
      );
    }
  }

  // 2. Resource Limit Checks
  if (resource === 'STAFF') {
    const staffCount = await prisma.user.count({
      where: {
        tenantId,
        role: UserRole.STAFF,
      },
    });

    if (staffCount >= subscription.plan.maxStaffAccounts) {
      throw new EntitlementError(
        `Staff limit reached (${staffCount}/${subscription.plan.maxStaffAccounts}) for your ${subscription.plan.name} plan`,
      );
    }
  }

  if (resource === 'ORDER') {
    const orderCount = await prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd,
        },
      },
    });

    if (orderCount >= subscription.plan.maxOrdersPerMonth) {
      throw new EntitlementError(
        `Monthly order limit reached (${orderCount}/${subscription.plan.maxOrdersPerMonth}) for your ${subscription.plan.name} plan`,
      );
    }
  }
}

/**
 * Checks whether a tenant is entitled to a specific feature flag or subscription capability.
 */
export async function tenantCan(tenantId: string, featureKey: string): Promise<boolean> {
  // Check tenant lifecycle first
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { lifecycleState: true },
  });

  if (!tenant || tenant.lifecycleState === TenantLifecycleState.SUSPENDED || tenant.lifecycleState === TenantLifecycleState.ARCHIVED) {
    return false;
  }

  // Check relational feature flag service (global or tenant override)
  const isEnabled = await isFeatureEnabled(featureKey, tenantId);
  if (isEnabled) return true;

  // Next check plan features if present in Plan JSON
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  if (subscription.plan && subscription.plan.features) {
    const features = subscription.plan.features as Record<string, boolean>;
    if (features[featureKey] === true) {
      return true;
    }
  }

  return false;
}

/**
 * Returns current usage versus plan limit for a given limit key.
 */
export async function tenantLimit(
  tenantId: string,
  limitKey: 'maxStaffAccounts' | 'maxOrdersPerMonth',
): Promise<{ current: number; max: number; allowed: boolean }> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  if (!subscription) {
    return { current: 0, max: 0, allowed: false };
  }

  if (limitKey === 'maxStaffAccounts') {
    const current = await prisma.user.count({
      where: { tenantId, role: UserRole.STAFF },
    });
    const max = subscription.plan.maxStaffAccounts;
    return { current, max, allowed: current < max };
  }

  if (limitKey === 'maxOrdersPerMonth') {
    const current = await prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd,
        },
      },
    });
    const max = subscription.plan.maxOrdersPerMonth;
    return { current, max, allowed: current < max };
  }

  return { current: 0, max: 0, allowed: false };
}

