import { prisma } from '../../lib/prisma';
import {
  SubscriptionStatus,
  SubscriptionBillingCycle,
  UserRole,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import type {
  CreatePlanInput,
  UpdatePlanInput,
  ChangePlanInput,
  RecordSubscriptionPaymentInput,
  AdminTenantsQueryInput,
} from './subscription.schema';

// ---------------------------------------------------------------------------
// 1. Subscription Plan CRUD (Super Admin)
// ---------------------------------------------------------------------------

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthly: 'asc' },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}

/**
 * Public-safe plan listing — no auth required.
 *
 * Returns ONLY the 8 marketing fields:
 *   id, name, priceMonthly, priceYearly,
 *   maxStaffAccounts, maxOrdersPerMonth, features, isDefault
 *
 * Explicitly excludes:
 *   - maxSmsCredits      (internal operational metric)
 *   - _count.subscriptions (reveals how many tenants use this plan — tenant data)
 *   - isActive           (internal admin concern)
 *   - createdAt/updatedAt (not relevant for marketing)
 *
 * Only active plans are shown (inactive/archived plans are not marketed).
 */
export async function listPublicPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
    select: {
      id: true,
      name: true,
      priceMonthly: true,
      priceYearly: true,
      maxStaffAccounts: true,
      maxOrdersPerMonth: true,
      features: true,
      isDefault: true,
    },
  });
  // Convert Decimal to string for JSON serialization consistency
  return plans.map((p) => ({
    ...p,
    priceMonthly: p.priceMonthly.toString(),
    priceYearly: p.priceYearly.toString(),
  }));
}



export async function getPlanById(id: string) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });
  if (!plan) throw new NotFoundError('Subscription plan');
  return plan;
}

export async function createPlan(input: CreatePlanInput) {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Plan with name "${input.name}" already exists`);
  }

  if (input.isDefault) {
    await prisma.subscriptionPlan.updateMany({
      data: { isDefault: false },
    });
  }

  return prisma.subscriptionPlan.create({
    data: {
      name: input.name,
      priceMonthly: new Prisma.Decimal(input.priceMonthly),
      priceYearly: new Prisma.Decimal(input.priceYearly),
      maxStaffAccounts: input.maxStaffAccounts,
      maxOrdersPerMonth: input.maxOrdersPerMonth,
      maxSmsCredits: input.maxSmsCredits,
      features: input.features,
      isActive: input.isActive,
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError('Subscription plan');

  if (input.name && input.name !== plan.name) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { name: input.name },
    });
    if (existing) {
      throw new ConflictError(`Plan with name "${input.name}" already exists`);
    }
  }

  if (input.isDefault) {
    await prisma.subscriptionPlan.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.priceMonthly !== undefined
        ? { priceMonthly: new Prisma.Decimal(input.priceMonthly) }
        : {}),
      ...(input.priceYearly !== undefined
        ? { priceYearly: new Prisma.Decimal(input.priceYearly) }
        : {}),
      ...(input.maxStaffAccounts !== undefined
        ? { maxStaffAccounts: input.maxStaffAccounts }
        : {}),
      ...(input.maxOrdersPerMonth !== undefined
        ? { maxOrdersPerMonth: input.maxOrdersPerMonth }
        : {}),
      ...(input.maxSmsCredits !== undefined
        ? { maxSmsCredits: input.maxSmsCredits }
        : {}),
      ...(input.features !== undefined ? { features: input.features } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// 2. Cross-Tenant Platform Tenant Management (Super Admin)
// ---------------------------------------------------------------------------

export async function listAdminTenants(query: AdminTenantsQueryInput) {
  const where: any = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
      _count: {
        select: {
          users: { where: { role: UserRole.STAFF, isActive: true } },
          orders: true,
        },
      },
    },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Map each tenant with subscription and current billing period usage
  const formatted = await Promise.all(
    tenants.map(async (tenant) => {
      const currentSub = tenant.subscriptions[0] || null;
      const periodStart = currentSub?.currentPeriodStart || startOfMonth;
      const periodEnd = currentSub?.currentPeriodEnd || now;

      // Count orders in current period
      const orderCountThisPeriod = await prisma.order.count({
        where: {
          tenantId: tenant.id,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        city: tenant.city,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        staffCount: tenant._count.users,
        totalOrdersCount: tenant._count.orders,
        orderCountThisPeriod,
        subscription: currentSub
          ? {
              id: currentSub.id,
              status: currentSub.status,
              billingCycle: currentSub.billingCycle,
              currentPeriodStart: currentSub.currentPeriodStart,
              currentPeriodEnd: currentSub.currentPeriodEnd,
              trialEndsAt: currentSub.trialEndsAt,
              plan: currentSub.plan,
            }
          : null,
      };
    }),
  );

  let filtered = formatted;
  if (query.status) {
    filtered = filtered.filter((t) => {
      if (query.status === 'SUSPENDED') return !t.isActive;
      return t.subscription?.status === query.status;
    });
  }

  if (query.plan) {
    filtered = filtered.filter(
      (t) => t.subscription?.plan.name.toLowerCase() === query.plan?.toLowerCase(),
    );
  }

  const offset = (query.page - 1) * query.limit;
  const paginated = filtered.slice(offset, offset + query.limit);

  return {
    data: paginated,
    total: filtered.length,
    page: query.page,
    limit: query.limit,
  };
}

export async function getAdminTenantDetail(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          payments: {
            orderBy: { recordedAt: 'desc' },
          },
        },
      },
      _count: {
        select: {
          users: { where: { role: UserRole.STAFF, isActive: true } },
          orders: true,
        },
      },
    },
  });

  if (!tenant) throw new NotFoundError('Tenant');

  const currentSub = tenant.subscriptions[0] || null;
  const now = new Date();
  const periodStart = currentSub?.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = currentSub?.currentPeriodEnd || now;

  const orderCountThisPeriod = await prisma.order.count({
    where: {
      tenantId: tenant.id,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      city: tenant.city,
      isActive: tenant.isActive,
      isListedOnMarketplace: tenant.isListedOnMarketplace,
      listingStatus: tenant.listingStatus,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      staffCount: tenant._count.users,
      totalOrdersCount: tenant._count.orders,
      orderCountThisPeriod,
    },
    currentSubscription: currentSub,
    subscriptionHistory: tenant.subscriptions,
  };
}

export async function changeTenantPlan(tenantId: string, input: ChangePlanInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new NotFoundError('Subscription plan');

  const latestSub = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  const billingCycle = input.billingCycle || latestSub?.billingCycle || SubscriptionBillingCycle.MONTHLY;

  if (input.effectiveImmediate || !latestSub) {
    const now = new Date();
    const periodEnd = new Date(
      now.getTime() + (billingCycle === SubscriptionBillingCycle.YEARLY ? 365 : 30) * 24 * 60 * 60 * 1000,
    );

    const updated = await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: input.planId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });

    return updated;
  } else {
    // Schedule change at renewal
    const updated = await prisma.tenantSubscription.update({
      where: { id: latestSub.id },
      data: {
        pendingPlanId: input.planId,
      },
      include: { plan: true },
    });

    return updated;
  }
}

export async function suspendTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: false },
  });

  const latestSub = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestSub) {
    await prisma.tenantSubscription.update({
      where: { id: latestSub.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  return { success: true, message: `Tenant "${tenant.name}" suspended successfully` };
}

export async function reactivateTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: true },
  });

  const latestSub = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestSub) {
    const now = new Date();
    const currentPeriodEnd =
      latestSub.currentPeriodEnd > now
        ? latestSub.currentPeriodEnd
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.tenantSubscription.update({
      where: { id: latestSub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd,
      },
    });
  }

  return { success: true, message: `Tenant "${tenant.name}" reactivated successfully` };
}

export async function recordSubscriptionPayment(
  tenantId: string,
  recordedByUserId: string | null,
  input: RecordSubscriptionPaymentInput,
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');

  let latestSub = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  // If no subscription exists, link to the first active plan
  if (!latestSub) {
    const defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    if (!defaultPlan) {
      throw new ValidationError('No subscription plans configured');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + input.extendMonths * 30 * 24 * 60 * 60 * 1000);
    latestSub = await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: defaultPlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  const now = new Date();
  const periodStart = latestSub.currentPeriodEnd > now ? latestSub.currentPeriodEnd : now;
  const periodEnd = new Date(
    periodStart.getTime() + input.extendMonths * 30 * 24 * 60 * 60 * 1000,
  );

  const payment = await prisma.tenantSubscriptionPayment.create({
    data: {
      subscriptionId: latestSub.id,
      tenantId,
      amount: new Prisma.Decimal(input.amount),
      paymentMethod: input.paymentMethod,
      referenceNote: input.referenceNote,
      periodStart,
      periodEnd,
      recordedByUserId,
    },
  });

  await prisma.tenantSubscription.update({
    where: { id: latestSub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: true },
  });

  return payment;
}

// ---------------------------------------------------------------------------
// 3. Platform Revenue & Subscription Health Metrics
// ---------------------------------------------------------------------------

export async function getPlatformRevenueSummary() {
  const [activeSubscriptions, totalTenants, payments] = await Promise.all([
    prisma.tenantSubscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        tenant: { isActive: true },
      },
      include: { plan: true },
    }),
    prisma.tenant.findMany({
      select: {
        id: true,
        isActive: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    }),
    prisma.tenantSubscriptionPayment.findMany({
      orderBy: { recordedAt: 'desc' },
      take: 15,
      include: {
        subscription: {
          include: {
            tenant: { select: { name: true, slug: true } },
            plan: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  let mrr = 0;
  let activePaidCount = 0;
  let trialCount = 0;
  let pastDueCount = 0;
  let churnCount = 0;

  for (const sub of activeSubscriptions) {
    if (sub.status === SubscriptionStatus.TRIAL) {
      trialCount++;
    } else {
      activePaidCount++;
      if (sub.billingCycle === SubscriptionBillingCycle.YEARLY) {
        mrr += Number(sub.plan.priceYearly) / 12;
      } else {
        mrr += Number(sub.plan.priceMonthly);
      }
    }
  }

  for (const t of totalTenants) {
    const st = t.subscriptions[0]?.status;
    if (!t.isActive || st === SubscriptionStatus.CANCELLED || st === SubscriptionStatus.EXPIRED) {
      churnCount++;
    } else if (st === SubscriptionStatus.PAST_DUE) {
      pastDueCount++;
    }
  }

  return {
    mrr: Number(mrr.toFixed(2)),
    arr: Number((mrr * 12).toFixed(2)),
    totalTenantsCount: totalTenants.length,
    activePaidTenantsCount: activePaidCount,
    trialTenantsCount: trialCount,
    pastDueTenantsCount: pastDueCount,
    churnedTenantsCount: churnCount,
    recentPayments: payments.map((p) => ({
      id: p.id,
      tenantName: p.subscription.tenant.name,
      planName: p.subscription.plan.name,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      referenceNote: p.referenceNote,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      recordedAt: p.recordedAt,
    })),
  };
}
