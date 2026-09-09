/**
 * Order Pipeline Service.
 *
 * Enforces:
 * - Strict tenant isolation (RLS + app-level filtering)
 * - Atomic order creation with rollback (customer/profile verification, price snapshot,
 *   Phase 3 fabric reservation reuse, order creation, status log creation)
 * - Server-enforced state machine transitions
 * - Fabric ledger integration on CUTTING (consumeReservation) and CANCELLED (releaseReservation)
 * - Staff assignment with role verification
 * - Append-only order status audit trail (OrderStatusLog)
 */

import {
  OrderStatus,
  Prisma,
  UserRole,
  NotificationChannel,
  type Order,
  type OrderStatusLog,
} from '@prisma/client';
import { notificationService } from '../notifications/notification.service';
import { withTenantContext } from '../../lib/prisma';
import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors';
import {
  consumeReservation,
  releaseReservation,
  reserveStock,
} from '../fabrics/fabric.service';
import { checkEntitlement } from '../subscriptions/entitlement.service';
import type {
  AssignOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
  TransitionOrderStatusInput,
} from './order.schema';

/**
 * Server-enforced valid status transitions map.
 * Frontend cannot set status directly; transitions outside this map are strictly rejected.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.MEASUREMENT_CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.MEASUREMENT_CONFIRMED]: [OrderStatus.CUTTING, OrderStatus.CANCELLED],
  [OrderStatus.CUTTING]: [OrderStatus.STITCHING, OrderStatus.CANCELLED],
  [OrderStatus.STITCHING]: [OrderStatus.QUALITY_CHECK],
  [OrderStatus.QUALITY_CHECK]: [OrderStatus.READY, OrderStatus.STITCHING], // STITCHING = rework
  [OrderStatus.READY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // terminal
  [OrderStatus.CANCELLED]: [], // terminal
};

// ---------------------------------------------------------------------------
// Atomic Order Creation
// ---------------------------------------------------------------------------

/**
 * Creates an order atomically in a single database transaction:
 * 1. Verifies customer exists and links to shop
 * 2. Verifies measurement profile belongs to this tenant AND this customer
 * 3. Verifies garment type matches profile
 * 4. Snapshots fabric price per meter
 * 5. Reuses Phase 3 reserveStock (rolls back if stock insufficient)
 * 6. Creates Order record (status = PLACED)
 * 7. Links stock transaction to order id
 * 8. Records initial OrderStatusLog (fromStatus = null, toStatus = PLACED)
 */
export async function createOrder(
  tenantId: string,
  staffUserId: string,
  input: CreateOrderInput,
): Promise<Order> {
  // Enforce monthly order creation limit & subscription status
  await checkEntitlement(tenantId, 'ORDER');

  const metersUsed = new Prisma.Decimal(input.metersUsed);
  if (metersUsed.lessThanOrEqualTo(0)) {
    throw new ValidationError('Meters used must be greater than zero');
  }

  const order = await withTenantContext(tenantId, async (tx) => {
    // 1. Verify Customer exists
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // 2. Cross-tenant & cross-customer check:
    // MeasurementProfile must belong to THIS tenant AND THIS customer
    const profile = await tx.measurementProfile.findUnique({
      where: { id: input.measurementProfileId },
    });
    if (!profile || profile.tenantId !== tenantId || profile.customerId !== input.customerId) {
      throw new ValidationError(
        'Measurement profile does not belong to this customer or shop',
      );
    }

    // 3. Garment type compatibility check
    if (profile.garmentType !== input.garmentType) {
      throw new ValidationError(
        `Measurement profile garment type (${profile.garmentType}) does not match order garment type (${input.garmentType})`,
      );
    }

    // 4. Verify fabric exists in this shop and snapshot price
    const fabric = await tx.fabric.findUnique({
      where: { id: input.fabricId },
    });
    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }
    if (fabric.isArchived) {
      throw new ConflictError('Cannot create an order with an archived fabric');
    }
    const priceSnapshot = fabric.pricePerMeter;

    // 5. Call existing Phase 3 reserveStock in the SAME transaction
    // If insufficient stock, this throws InsufficientStockError, rolling back everything
    const { transaction: stockTx } = await reserveStock(
      tenantId,
      input.fabricId,
      staffUserId,
      {
        meters: input.metersUsed,
        note: `Reserved for ${input.garmentType} order`,
      },
      tx,
    );

    // 6. Create Order record (status = PLACED)
    const order = await tx.order.create({
      data: {
        tenantId,
        customerId: input.customerId,
        measurementProfileId: input.measurementProfileId,
        fabricId: input.fabricId,
        garmentType: input.garmentType,
        metersUsed,
        status: OrderStatus.PLACED,
        priceSnapshot,
        estimatedDeliveryDate: input.estimatedDeliveryDate
          ? new Date(input.estimatedDeliveryDate)
          : null,
        notes: input.notes ?? null,
      },
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
        measurementProfile: {
          select: {
            id: true,
            name: true,
            garmentType: true,
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
      },
    });

    // 7. Link relatedOrderId on the stock ledger row
    await tx.fabricStockTransaction.update({
      where: { id: stockTx.id },
      data: { relatedOrderId: order.id },
    });

    // 8. Create initial OrderStatusLog (fromStatus = null, toStatus = PLACED)
    await tx.orderStatusLog.create({
      data: {
        tenantId,
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.PLACED,
        changedById: staffUserId,
        note: input.notes ? `Order placed: ${input.notes}` : 'Order placed',
      },
    });

    return order;
  });

  // Dispatch fully decoupled notification AFTER transaction commits
  notificationService.sendNotification({
    tenantId,
    customerId: order.customerId,
    orderId: order.id,
    channel: NotificationChannel.SMS,
    templateName: 'ORDER_PLACED',
    data: { garmentType: order.garmentType, estimatedDeliveryDate: order.estimatedDeliveryDate },
    recipient: order.customer.phone,
  }).catch(e => console.error('Notification dispatch error:', e));

  return order;
}

// ---------------------------------------------------------------------------
// State Machine Status Transitions
// ---------------------------------------------------------------------------

/**
 * Transitions order status through the strictly enforced state machine:
 * - Validates allowed transition
 * - Calls consumeReservation on transition to CUTTING (fabric permanently consumed)
 * - Calls releaseReservation on transition to CANCELLED if before CUTTING
 * - Prevents releasing fabric on CANCELLED if CUTTING or later
 * - Records append-only OrderStatusLog
 */
export async function transitionOrderStatus(
  tenantId: string,
  orderId: string,
  staffUserId: string,
  input: TransitionOrderStatusInput,
): Promise<Order> {
  const result = await withTenantContext(tenantId, async (tx) => {
    // 1. Lock the order row exclusively to prevent race conditions on concurrent transitions
    await tx.$executeRaw`
      SELECT 1 FROM "orders"
      WHERE "id" = ${orderId}::uuid
        AND "tenant_id" = ${tenantId}::uuid
      FOR UPDATE
    `;

    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError('Order');
    }

    // 2. Authorization check: Staff can only transition orders assigned to them; Owner can transition any
    const caller = await tx.user.findUnique({
      where: { id: staffUserId },
      select: { id: true, role: true },
    });
    if (!caller) {
      throw new AuthenticationError();
    }

    if (caller.role === UserRole.STAFF && order.assignedStaffId !== staffUserId) {
      throw new ForbiddenError('Staff members can only transition orders assigned to them');
    }

    const currentStatus = order.status;
    const targetStatus = input.toStatus;

    // 3. Validate state machine rule (409 Conflict for state/concurrency conflict)
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictError(
        `Invalid status transition: cannot transition order from ${currentStatus} to ${targetStatus}`,
      );
    }

    // Fabric ledger integration at CUTTING
    if (targetStatus === OrderStatus.CUTTING) {
      await consumeReservation(
        tenantId,
        order.fabricId,
        staffUserId,
        {
          meters: order.metersUsed.toString(),
          orderId: order.id,
          note: input.note
            ? `Order moved to CUTTING: ${input.note}`
            : 'Order moved to CUTTING — fabric physically cut and consumed',
        },
        tx,
      );
    }

    // Fabric ledger integration at CANCELLED
    if (targetStatus === OrderStatus.CANCELLED) {
      if (
        currentStatus === OrderStatus.PLACED ||
        currentStatus === OrderStatus.MEASUREMENT_CONFIRMED
      ) {
        // Fabric was only reserved, not yet cut -> release back to available stock
        await releaseReservation(
          tenantId,
          order.fabricId,
          staffUserId,
          {
            meters: order.metersUsed.toString(),
            orderId: order.id,
            note: input.note
              ? `Order cancelled: ${input.note}`
              : `Order cancelled from ${currentStatus} — fabric reservation released back to available stock`,
          },
          tx,
        );
      }
      // If currentStatus is CUTTING or later: fabric was already physically cut!
      // Do NOT release fabric back. Order is marked CANCELLED (garment abandoned/damaged).
    }

    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: targetStatus },
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
        fabric: true,
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Record append-only OrderStatusLog
    await tx.orderStatusLog.create({
      data: {
        tenantId,
        orderId: order.id,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        changedById: staffUserId,
        note: input.note ?? null,
      },
    });

    return updatedOrder;
  });

  // Dispatch fully decoupled notification AFTER transaction commits
  if (input.toStatus === OrderStatus.READY) {
    notificationService.sendNotification({
      tenantId,
      customerId: result.customerId,
      orderId: result.id,
      channel: NotificationChannel.SMS,
      templateName: 'ORDER_READY',
      data: { garmentType: result.garmentType },
      recipient: result.customer.phone,
    }).catch(e => console.error('Notification dispatch error:', e));
  } else if (input.toStatus === OrderStatus.CUTTING) {
    if (result.fabric.availableMeters.lessThanOrEqualTo(result.fabric.lowStockThreshold)) {
      // Find Shop Owner for email
      import('../../lib/prisma').then(({ prisma }) => {
        prisma.user.findFirst({
          where: { tenantId, role: UserRole.SHOP_OWNER },
        }).then(owner => {
          if (owner) {
            notificationService.sendNotification({
              tenantId,
              channel: NotificationChannel.EMAIL,
              templateName: 'LOW_STOCK_ALERT',
              data: { fabricName: result.fabric.name, availableMeters: result.fabric.availableMeters.toString() },
              recipient: owner.email,
            }).catch(e => console.error('Notification dispatch error:', e));
          }
        });
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Staff Assignment
// ---------------------------------------------------------------------------

/**
 * Assigns or reassigns an order to an active staff member in the shop.
 */
export async function assignOrder(
  tenantId: string,
  orderId: string,
  staffUserId: string,
  input: AssignOrderInput,
): Promise<Order> {
  return withTenantContext(tenantId, async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError('Order');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new ConflictError(`Cannot assign staff to a ${order.status} order`);
    }

    // Verify assigned user exists in this tenant, is active, and is staff/owner
    const assignedUser = await tx.user.findUnique({
      where: { id: input.assignedStaffId },
    });
    if (!assignedUser || assignedUser.tenantId !== tenantId) {
      throw new NotFoundError('Staff user');
    }
    if (!assignedUser.isActive) {
      throw new ValidationError('Cannot assign order to an inactive staff member');
    }
    if (assignedUser.role !== UserRole.STAFF && assignedUser.role !== UserRole.SHOP_OWNER) {
      throw new ValidationError('Assigned user must be a staff member or shop owner');
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { assignedStaffId: input.assignedStaffId },
      include: {
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Audit log entry for assignment
    await tx.orderStatusLog.create({
      data: {
        tenantId,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        changedById: staffUserId,
        note: `Assigned order to ${assignedUser.firstName} ${assignedUser.lastName} (${assignedUser.email})`,
      },
    });

    return updatedOrder;
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Retrieves a single order by ID with all relations.
 */
export async function getOrderById(tenantId: string, orderId: string): Promise<Order> {
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
        measurementProfile: {
          include: {
            versions: {
              where: { isCurrent: true },
              take: 1,
            },
          },
        },
        fabric: true,
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
      },
    });

    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError('Order');
    }

    return order;
  });
}

/**
 * Lists orders with optional filters (status, customerId, assignedStaffId, search).
 */
export async function listOrders(tenantId: string, query: ListOrdersQuery): Promise<Order[]> {
  return withTenantContext(tenantId, async (tx) => {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.assignedStaffId ? { assignedStaffId: query.assignedStaffId } : {}),
    };

    if (query.search) {
      where.OR = [
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }

    return tx.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        measurementProfile: {
          select: {
            id: true,
            name: true,
            garmentType: true,
          },
        },
        fabric: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
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
    });
  });
}

/**
 * Retrieves chronological status history for an order.
 */
export async function getOrderHistory(
  tenantId: string,
  orderId: string,
): Promise<OrderStatusLog[]> {
  return withTenantContext(tenantId, async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError('Order');
    }

    return tx.orderStatusLog.findMany({
      where: {
        tenantId,
        orderId,
      },
      orderBy: { changedAt: 'asc' },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });
}
