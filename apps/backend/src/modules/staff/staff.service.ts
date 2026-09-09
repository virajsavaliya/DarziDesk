/**
 * Staff Dashboard Service.
 *
 * Provides:
 * - Scoped order task queue (Staff member sees only their own assigned orders; Owner sees all)
 * - Detailed order view with linked measurements and valid next transitions
 * - Daily summary metrics computed using OrderStatusLog and Tenant timezone:
 *   - Completed Today (DELIVERED timestamp in OrderStatusLog within today's boundaries in tenant tz)
 *   - Pending Count (active non-delivered, non-cancelled orders)
 *   - Due within 48 hours
 */

import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { withTenantContext } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { ALLOWED_STATUS_TRANSITIONS } from '../orders/order.service';
import type { ListStaffOrdersQuery } from './staff.schema';

/**
 * Calculates start and end of current day in the given IANA timezone.
 */
export function getDayBoundariesInTimezone(
  tz: string,
  refDate = new Date(),
): { startOfDay: Date; endOfDay: Date } {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = formatter.format(refDate); // "YYYY-MM-DD"

    // Compute timezone offset at refDate
    const tzDate = new Date(refDate.toLocaleString('en-US', { timeZone: tz }));
    const utcDate = new Date(refDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();

    // Start of day in UTC
    const startUtc = new Date(`${dateStr}T00:00:00.000Z`).getTime() - offsetMs;
    const startOfDay = new Date(startUtc);
    const endOfDay = new Date(startUtc + 24 * 60 * 60 * 1000 - 1);

    return { startOfDay, endOfDay };
  } catch {
    // Fallback if timezone string is invalid
    const startOfDay = new Date(refDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(refDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }
}

/**
 * Lists orders scoped to the staff member (or all orders if caller is SHOP_OWNER).
 */
export async function getStaffOrders(
  tenantId: string,
  staffUserId: string,
  callerRole: UserRole,
  query: ListStaffOrdersQuery,
) {
  return withTenantContext(tenantId, async (tx) => {
    const whereClause: Prisma.OrderWhereInput = {
      tenantId,
    };

    // Scoping Rule:
    // STAFF -> see ONLY their assigned orders
    // SHOP_OWNER -> see all tenant orders
    if (callerRole === UserRole.STAFF) {
      whereClause.assignedStaffId = staffUserId;
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput[] = [];
    if (query.sort === 'estimatedDeliveryDate') {
      orderBy.push({ estimatedDeliveryDate: query.order });
      orderBy.push({ createdAt: 'desc' });
    } else {
      orderBy.push({ createdAt: query.order });
    }

    const [total, orders] = await Promise.all([
      tx.order.count({ where: whereClause }),
      tx.order.findMany({
        where: whereClause,
        orderBy,
        take: query.limit,
        skip: query.offset,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          fabric: {
            select: {
              id: true,
              name: true,
              color: true,
              type: true,
              pricePerMeter: true,
            },
          },
          measurementProfile: {
            select: {
              id: true,
              name: true,
              garmentType: true,
            },
          },
          assignedStaff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      orders,
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });
}

/**
 * Fetches single order detail for a staff member.
 * Strictly enforces that STAFF role can only view orders assigned to them.
 */
export async function getStaffOrderById(
  tenantId: string,
  orderId: string,
  staffUserId: string,
  callerRole: UserRole,
) {
  return withTenantContext(tenantId, async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        fabric: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
            pricePerMeter: true,
          },
        },
        measurementProfile: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        },
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        statusLogs: {
          orderBy: { changedAt: 'asc' },
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            advancePaid: true,
            balanceDue: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError('Order');
    }

    // Scoping Rule:
    // STAFF can only inspect orders assigned to them
    if (callerRole === UserRole.STAFF && order.assignedStaffId !== staffUserId) {
      throw new ForbiddenError('Access denied: you can only view orders assigned to you');
    }

    const allowedNextTransitions = ALLOWED_STATUS_TRANSITIONS[order.status] ?? [];

    return {
      ...order,
      allowedNextTransitions,
    };
  });
}

/**
 * Computes daily summary metrics for the staff member:
 * - completedToday: queries OrderStatusLog for DELIVERED transitions occurring today in tenant timezone
 * - pendingCount: active orders
 * - dueNext48Hours: active orders due within next 48h
 */
export async function getStaffDailySummary(
  tenantId: string,
  staffUserId: string,
  callerRole: UserRole,
) {
  return withTenantContext(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const tz = tenant?.timezone || 'Asia/Kolkata';
    const { startOfDay, endOfDay } = getDayBoundariesInTimezone(tz);

    // 1. Completed Today:
    // Query OrderStatusLog rows with toStatus = DELIVERED changedAt within tenant's day boundary
    const whereLog: Prisma.OrderStatusLogWhereInput = {
      tenantId,
      toStatus: OrderStatus.DELIVERED,
      changedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (callerRole === UserRole.STAFF) {
      whereLog.order = {
        assignedStaffId: staffUserId,
      };
    }

    // 2. Pending Count:
    // Active orders not delivered and not cancelled
    const wherePending: Prisma.OrderWhereInput = {
      tenantId,
      status: {
        notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      },
    };

    if (callerRole === UserRole.STAFF) {
      wherePending.assignedStaffId = staffUserId;
    }

    // 3. Due within 48 hours:
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const whereDue: Prisma.OrderWhereInput = {
      tenantId,
      status: {
        notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      },
      estimatedDeliveryDate: {
        lte: in48Hours,
      },
    };

    if (callerRole === UserRole.STAFF) {
      whereDue.assignedStaffId = staffUserId;
    }

    const [completedToday, pendingCount, dueNext48Hours] = await Promise.all([
      tx.orderStatusLog.count({ where: whereLog }),
      tx.order.count({ where: wherePending }),
      tx.order.count({ where: whereDue }),
    ]);

    return {
      completedToday,
      pendingCount,
      dueNext48Hours,
      timezone: tz,
    };
  });
}
