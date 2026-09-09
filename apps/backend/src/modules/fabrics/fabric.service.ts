/**
 * Fabric Inventory Service.
 *
 * Enforces:
 * - Strict tenant isolation (RLS + app-level filtering)
 * - Row-level locking (SELECT ... FOR UPDATE) on all stock operations
 * - Non-negative stock invariants (availableMeters >= 0, reservedMeters >= 0)
 * - Exact Decimal arithmetic (Prisma.Decimal / PostgreSQL Decimal)
 * - Immutable, append-only transaction ledger (FabricStockTransaction)
 * - Prevention of direct stock mutation via standard update
 * - Protection against hard-deleting fabrics with transaction history
 */

import { FabricStockTransactionType, Prisma, type Fabric, type FabricStockTransaction } from '@prisma/client';
import { withTenantContext } from '../../lib/prisma';
import { ConflictError, InsufficientStockError, NotFoundError, ValidationError } from '../../lib/errors';
import type {
  AddStockInput,
  AdjustStockInput,
  ConsumeStockInput,
  CreateFabricInput,
  ListFabricsQuery,
  ReleaseStockInput,
  ReserveStockInput,
  UpdateFabricInput,
} from './fabric.schema';

export type TxClient = Parameters<Parameters<typeof withTenantContext>[1]>[0];

interface LockedFabricRow {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  type: string;
  price_per_meter: Prisma.Decimal | string | number;
  available_meters: Prisma.Decimal | string | number;
  reserved_meters: Prisma.Decimal | string | number;
  low_stock_threshold: Prisma.Decimal | string | number;
  is_archived: boolean;
  photo_url: string | null;
  supplier_name: string | null;
  purchase_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface LockedFabric {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  type: string;
  pricePerMeter: Prisma.Decimal;
  availableMeters: Prisma.Decimal;
  reservedMeters: Prisma.Decimal;
  lowStockThreshold: Prisma.Decimal;
  isArchived: boolean;
  photoUrl: string | null;
  supplierName: string | null;
  purchaseNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Locks the fabric row exclusively for the duration of the current transaction.
 * Any concurrent transaction executing this will block until the locking transaction finishes.
 */
async function getFabricWithLock(
  tx: TxClient,
  tenantId: string,
  fabricId: string,
): Promise<LockedFabric> {
  const rows = await tx.$queryRaw<LockedFabricRow[]>`
    SELECT * FROM "fabrics"
    WHERE "id" = ${fabricId}::uuid
      AND "tenant_id" = ${tenantId}::uuid
    FOR UPDATE
  `;

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Fabric');
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    color: row.color,
    type: row.type,
    pricePerMeter: new Prisma.Decimal(row.price_per_meter),
    availableMeters: new Prisma.Decimal(row.available_meters),
    reservedMeters: new Prisma.Decimal(row.reserved_meters),
    lowStockThreshold: new Prisma.Decimal(row.low_stock_threshold),
    isArchived: row.is_archived,
    photoUrl: row.photo_url,
    supplierName: row.supplier_name,
    purchaseNotes: row.purchase_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Atomic Stock Operations
// ---------------------------------------------------------------------------

/**
 * Increases availableMeters and records a PURCHASE transaction.
 */
export async function addStock(
  tenantId: string,
  fabricId: string,
  staffUserId: string,
  input: AddStockInput,
): Promise<{ fabric: Fabric; transaction: FabricStockTransaction }> {
  const meters = new Prisma.Decimal(input.meters);
  if (meters.lessThanOrEqualTo(0)) {
    throw new ValidationError('Meters added must be greater than zero');
  }

  return withTenantContext(tenantId, async (tx) => {
    const fabric = await getFabricWithLock(tx, tenantId, fabricId);
    const newAvailable = fabric.availableMeters.add(meters);

    const updatedFabric = await tx.fabric.update({
      where: { id: fabricId },
      data: {
        availableMeters: newAvailable,
        ...(input.supplierName ? { supplierName: input.supplierName } : {}),
        ...(input.purchaseNotes ? { purchaseNotes: input.purchaseNotes } : {}),
      },
    });

    const note =
      input.purchaseNotes ??
      (input.supplierName ? `Supplier: ${input.supplierName}` : 'Stock purchased');

    const transaction = await tx.fabricStockTransaction.create({
      data: {
        tenantId,
        fabricId,
        type: FabricStockTransactionType.PURCHASE,
        meters,
        note,
        createdById: staffUserId,
      },
    });

    return { fabric: updatedFabric, transaction };
  });
}

/**
 * Moves meters from available to reserved. Fails cleanly if insufficient stock.
 * Records a RESERVE transaction.
 * Supports optional externalTx for atomic multi-entity transactions (e.g. order creation).
 */
export async function reserveStock(
  tenantId: string,
  fabricId: string,
  staffUserId: string,
  input: ReserveStockInput,
  externalTx?: TxClient,
): Promise<{ fabric: Fabric; transaction: FabricStockTransaction }> {
  const meters = new Prisma.Decimal(input.meters);
  if (meters.lessThanOrEqualTo(0)) {
    throw new ValidationError('Meters to reserve must be greater than zero');
  }

  const execute = async (tx: TxClient) => {
    const fabric = await getFabricWithLock(tx, tenantId, fabricId);

    if (fabric.availableMeters.lessThan(meters)) {
      throw new InsufficientStockError(
        `Insufficient stock to reserve. Available: ${fabric.availableMeters.toString()}m, requested: ${meters.toString()}m`,
      );
    }

    const newAvailable = fabric.availableMeters.sub(meters);
    const newReserved = fabric.reservedMeters.add(meters);

    const updatedFabric = await tx.fabric.update({
      where: { id: fabricId },
      data: {
        availableMeters: newAvailable,
        reservedMeters: newReserved,
      },
    });

    const transaction = await tx.fabricStockTransaction.create({
      data: {
        tenantId,
        fabricId,
        type: FabricStockTransactionType.RESERVE,
        meters,
        relatedOrderId: input.orderId ?? null,
        note: input.note ?? null,
        createdById: staffUserId,
      },
    });

    return { fabric: updatedFabric, transaction };
  };

  if (externalTx) {
    return execute(externalTx);
  }
  return withTenantContext(tenantId, execute);
}

/**
 * Moves meters back from reserved to available (e.g. order cancelled before cutting).
 * Records a RELEASE transaction.
 * Supports optional externalTx for atomic multi-entity transactions.
 */
export async function releaseReservation(
  tenantId: string,
  fabricId: string,
  staffUserId: string,
  input: ReleaseStockInput,
  externalTx?: TxClient,
): Promise<{ fabric: Fabric; transaction: FabricStockTransaction }> {
  const meters = new Prisma.Decimal(input.meters);
  if (meters.lessThanOrEqualTo(0)) {
    throw new ValidationError('Meters to release must be greater than zero');
  }

  const execute = async (tx: TxClient) => {
    const fabric = await getFabricWithLock(tx, tenantId, fabricId);

    if (fabric.reservedMeters.lessThan(meters)) {
      throw new InsufficientStockError(
        `Cannot release more stock than currently reserved. Reserved: ${fabric.reservedMeters.toString()}m, requested release: ${meters.toString()}m`,
      );
    }

    const newReserved = fabric.reservedMeters.sub(meters);
    const newAvailable = fabric.availableMeters.add(meters);

    const updatedFabric = await tx.fabric.update({
      where: { id: fabricId },
      data: {
        availableMeters: newAvailable,
        reservedMeters: newReserved,
      },
    });

    const transaction = await tx.fabricStockTransaction.create({
      data: {
        tenantId,
        fabricId,
        type: FabricStockTransactionType.RELEASE,
        meters,
        relatedOrderId: input.orderId ?? null,
        note: input.note ?? null,
        createdById: staffUserId,
      },
    });

    return { fabric: updatedFabric, transaction };
  };

  if (externalTx) {
    return execute(externalTx);
  }
  return withTenantContext(tenantId, execute);
}

/**
 * Permanently removes meters from reserved (used when cutting actually occurs).
 * Records a CONSUME transaction.
 * Supports optional externalTx for atomic multi-entity transactions.
 */
export async function consumeReservation(
  tenantId: string,
  fabricId: string,
  staffUserId: string,
  input: ConsumeStockInput,
  externalTx?: TxClient,
): Promise<{ fabric: Fabric; transaction: FabricStockTransaction }> {
  const meters = new Prisma.Decimal(input.meters);
  if (meters.lessThanOrEqualTo(0)) {
    throw new ValidationError('Meters to consume must be greater than zero');
  }

  const execute = async (tx: TxClient) => {
    const fabric = await getFabricWithLock(tx, tenantId, fabricId);

    if (fabric.reservedMeters.lessThan(meters)) {
      throw new InsufficientStockError(
        `Cannot consume more stock than currently reserved. Reserved: ${fabric.reservedMeters.toString()}m, requested consume: ${meters.toString()}m`,
      );
    }

    const newReserved = fabric.reservedMeters.sub(meters);

    const updatedFabric = await tx.fabric.update({
      where: { id: fabricId },
      data: {
        reservedMeters: newReserved,
      },
    });

    const transaction = await tx.fabricStockTransaction.create({
      data: {
        tenantId,
        fabricId,
        type: FabricStockTransactionType.CONSUME,
        meters,
        relatedOrderId: input.orderId ?? null,
        note: input.note ?? null,
        createdById: staffUserId,
      },
    });

    return { fabric: updatedFabric, transaction };
  };

  if (externalTx) {
    return execute(externalTx);
  }
  return withTenantContext(tenantId, execute);
}


/**
 * Manual stock adjustment (damaged fabric, physical recount).
 * Note is required. Can be positive or negative, but cannot push availableMeters negative.
 * Records an ADJUSTMENT transaction.
 */
export async function adjustStock(
  tenantId: string,
  fabricId: string,
  staffUserId: string,
  input: AdjustStockInput,
): Promise<{ fabric: Fabric; transaction: FabricStockTransaction }> {
  const meters = new Prisma.Decimal(input.meters);
  if (meters.equals(0)) {
    throw new ValidationError('Adjustment meters cannot be 0');
  }

  if (!input.note || input.note.trim().length === 0) {
    throw new ValidationError('Note is required for stock adjustments');
  }

  return withTenantContext(tenantId, async (tx) => {
    const fabric = await getFabricWithLock(tx, tenantId, fabricId);
    const newAvailable = fabric.availableMeters.add(meters);

    if (newAvailable.lessThan(0)) {
      throw new InsufficientStockError(
        `Adjustment would result in negative available stock. Available: ${fabric.availableMeters.toString()}m, adjustment: ${meters.toString()}m`,
      );
    }

    const updatedFabric = await tx.fabric.update({
      where: { id: fabricId },
      data: {
        availableMeters: newAvailable,
      },
    });

    const transaction = await tx.fabricStockTransaction.create({
      data: {
        tenantId,
        fabricId,
        type: FabricStockTransactionType.ADJUSTMENT,
        meters,
        note: input.note.trim(),
        createdById: staffUserId,
      },
    });

    return { fabric: updatedFabric, transaction };
  });
}

// ---------------------------------------------------------------------------
// Fabric CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Creates a new fabric item. If initialMeters > 0, atomically adds initial stock
 * and records an initial PURCHASE ledger row.
 */
export async function createFabric(
  tenantId: string,
  staffUserId: string,
  input: CreateFabricInput,
): Promise<Fabric> {
  const initialMeters = new Prisma.Decimal(input.initialMeters ?? '0');
  const pricePerMeter = new Prisma.Decimal(input.pricePerMeter);
  const lowStockThreshold = new Prisma.Decimal(input.lowStockThreshold ?? '0');

  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.create({
      data: {
        tenantId,
        name: input.name,
        color: input.color,
        type: input.type,
        pricePerMeter,
        availableMeters: initialMeters,
        reservedMeters: new Prisma.Decimal(0),
        lowStockThreshold,
        photoUrl: input.photoUrl ?? null,
        supplierName: input.supplierName ?? null,
        purchaseNotes: input.purchaseNotes ?? null,
      },
    });

    if (initialMeters.greaterThan(0)) {
      await tx.fabricStockTransaction.create({
        data: {
          tenantId,
          fabricId: fabric.id,
          type: FabricStockTransactionType.PURCHASE,
          meters: initialMeters,
          note: input.purchaseNotes ?? 'Initial stock recorded on fabric creation',
          createdById: staffUserId,
        },
      });
    }

    return fabric;
  });
}

/**
 * Updates fabric descriptive metadata only.
 * Strictly prevents direct modification of stock meters.
 */
export async function updateFabric(
  tenantId: string,
  fabricId: string,
  input: UpdateFabricInput,
): Promise<Fabric> {
  return withTenantContext(tenantId, async (tx) => {
    const existing = await tx.fabric.findUnique({
      where: { id: fabricId },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }

    const data: Prisma.FabricUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.color !== undefined) data.color = input.color;
    if (input.type !== undefined) data.type = input.type;
    if (input.pricePerMeter !== undefined) data.pricePerMeter = new Prisma.Decimal(input.pricePerMeter);
    if (input.lowStockThreshold !== undefined) {
      data.lowStockThreshold = new Prisma.Decimal(input.lowStockThreshold);
    }
    if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;
    if (input.supplierName !== undefined) data.supplierName = input.supplierName;
    if (input.purchaseNotes !== undefined) data.purchaseNotes = input.purchaseNotes;

    return tx.fabric.update({
      where: { id: fabricId },
      data,
    });
  });
}

/**
 * Retrieves a fabric by ID with tenant scoping.
 */
export async function getFabricById(tenantId: string, fabricId: string): Promise<Fabric> {
  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.findUnique({
      where: { id: fabricId },
    });
    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }
    return fabric;
  });
}

/**
 * Lists fabrics with optional search and filtering.
 */
export async function listFabrics(
  tenantId: string,
  query: ListFabricsQuery,
): Promise<Fabric[]> {
  return withTenantContext(tenantId, async (tx) => {
    if (query.lowStockOnly) {
      // Use raw query for column-to-column comparison: available_meters <= low_stock_threshold
      const rows = await tx.$queryRaw<LockedFabricRow[]>`
        SELECT * FROM "fabrics"
        WHERE "tenant_id" = ${tenantId}::uuid
          AND "is_archived" = false
          AND "available_meters" <= "low_stock_threshold"
        ORDER BY "name" ASC
      `;
      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        name: r.name,
        color: r.color,
        type: r.type,
        pricePerMeter: new Prisma.Decimal(r.price_per_meter),
        availableMeters: new Prisma.Decimal(r.available_meters),
        reservedMeters: new Prisma.Decimal(r.reserved_meters),
        lowStockThreshold: new Prisma.Decimal(r.low_stock_threshold),
        isArchived: r.is_archived,
        photoUrl: r.photo_url,
        supplierName: r.supplier_name,
        purchaseNotes: r.purchase_notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    const where: Prisma.FabricWhereInput = {
      tenantId,
      ...(query.isArchived !== undefined ? { isArchived: query.isArchived } : { isArchived: false }),
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { color: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return tx.fabric.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  });
}

/**
 * Returns low stock fabrics (availableMeters <= lowStockThreshold and !isArchived).
 */
export async function getLowStockFabrics(tenantId: string): Promise<Fabric[]> {
  return listFabrics(tenantId, { lowStockOnly: true });
}

/**
 * Retrieves full audit ledger history for a specific fabric.
 */
export async function getFabricLedger(
  tenantId: string,
  fabricId: string,
): Promise<FabricStockTransaction[]> {
  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.findUnique({
      where: { id: fabricId },
    });
    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }

    return tx.fabricStockTransaction.findMany({
      where: {
        tenantId,
        fabricId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
}

/**
 * Soft archives a fabric.
 */
export async function archiveFabric(tenantId: string, fabricId: string): Promise<Fabric> {
  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.findUnique({ where: { id: fabricId } });
    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }
    return tx.fabric.update({
      where: { id: fabricId },
      data: { isArchived: true },
    });
  });
}

/**
 * Unarchives a soft-archived fabric.
 */
export async function unarchiveFabric(tenantId: string, fabricId: string): Promise<Fabric> {
  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.findUnique({ where: { id: fabricId } });
    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }
    return tx.fabric.update({
      where: { id: fabricId },
      data: { isArchived: false },
    });
  });
}

/**
 * Deletes a fabric ONLY if it has no stock transaction history.
 * If transactions exist, throws ConflictError prompting the user to archive instead.
 */
export async function deleteFabric(
  tenantId: string,
  fabricId: string,
): Promise<{ success: true }> {
  return withTenantContext(tenantId, async (tx) => {
    const fabric = await tx.fabric.findUnique({
      where: { id: fabricId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!fabric || fabric.tenantId !== tenantId) {
      throw new NotFoundError('Fabric');
    }

    if (fabric._count.transactions > 0) {
      throw new ConflictError(
        'Cannot delete fabric with transaction history. Archive it instead.',
      );
    }

    await tx.fabric.delete({
      where: { id: fabricId },
    });

    return { success: true };
  });
}
