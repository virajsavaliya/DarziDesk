import { prisma } from '../../lib/prisma';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import { EntitlementError } from '../../lib/errors';

/**
 * Checks whether a tenant is entitled to create a given resource (STAFF or ORDER).
 *
 * Enforces:
 * 1. Subscription active status (blocks order and staff creation if PAST_DUE, EXPIRED, or CANCELLED).
 * 2. maxStaffAccounts limit for the tenant's current plan.
 * 3. maxOrdersPerMonth limit within the current billing period.
 *
 * If limits are reached, throws an EntitlementError with a specific message.
 */
export async function checkEntitlement(
  tenantId: string,
  resource: 'STAFF' | 'ORDER',
): Promise<void> {
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
