import { prisma } from '../../lib/prisma';
import { SubscriptionStatus, SubscriptionBillingCycle, Prisma, PrismaClient } from '@prisma/client';

/**
 * Backfills any existing Tenant that has zero TenantSubscription rows
 * by assigning them the default TRIAL subscription plan.
 */
export async function backfillUnsubscribedTenants(
  customPrisma: PrismaClient | any = prisma,
  options: { trialDays?: number } = {},
) {
  const trialDays = options.trialDays ?? 14;

  // 1. Resolve or create the default TRIAL plan
  let defaultPlan = await customPrisma.subscriptionPlan.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!defaultPlan) {
    defaultPlan = await customPrisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  if (!defaultPlan) {
    defaultPlan = await customPrisma.subscriptionPlan.create({
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

  // 2. Query all tenants that have zero subscriptions
  const unsubscribedTenants = await customPrisma.tenant.findMany({
    where: {
      subscriptions: {
        none: {},
      },
    },
  });

  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const results: Array<{ tenantId: string; subscriptionId: string }> = [];

  for (const tenant of unsubscribedTenants) {
    const sub = await customPrisma.tenantSubscription.create({
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
    results.push({ tenantId: tenant.id, subscriptionId: sub.id });
  }

  return {
    backfilledCount: results.length,
    defaultPlan: {
      id: defaultPlan.id,
      name: defaultPlan.name,
      maxStaffAccounts: defaultPlan.maxStaffAccounts,
      maxOrdersPerMonth: defaultPlan.maxOrdersPerMonth,
      maxSmsCredits: defaultPlan.maxSmsCredits,
    },
    results,
  };
}

// Standalone execution entrypoint
if (process.argv[1] && process.argv[1].endsWith('backfillSubscriptions.ts')) {
  backfillUnsubscribedTenants()
    .then((res) => {
      console.log(
        `[BACKFILL SUCCESS] Assigned default TRIAL plan (${res.defaultPlan.name}) to ${res.backfilledCount} tenant(s).`,
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error('[BACKFILL ERROR]', err);
      process.exit(1);
    });
}
