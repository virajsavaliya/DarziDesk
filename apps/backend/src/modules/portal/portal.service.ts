/**
 * Customer Portal Service.
 *
 * Provides customer-scoped actions:
 * - Browsing shop fabric catalogs (available stock > 0)
 * - Creating orders (strictly reuses Phase 4's createOrder function)
 * - Auto-linking customer to shop with source DIRECT on first interaction
 * - Cross-shop order history & timeline view (guaranteed tenant-link isolation)
 * - Cross-shop invoices with PDF generation reuse
 * - Shop-grouped measurement profiles
 */

import {
  InteractionSource,
  MeasurementUnit,
  FitPreference,
  Prisma,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors';
import { createOrder } from '../orders/order.service';
import { generateInvoicePdfBuffer } from '../invoices/invoice.service';
import type {
  CustomerCreateOrderInput,
  CustomerCreateMeasurementProfileInput,
} from './portal.schema';

// ---------------------------------------------------------------------------
// 1. Fabric Catalog for a Specific Shop
// ---------------------------------------------------------------------------

export async function getShopCatalog(tenantId: string) {
  const shop = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      allowsSelfMeasurement: true,
    },
  });

  if (!shop || !shop.isActive) {
    throw new NotFoundError('Shop');
  }

  const fabrics = await prisma.fabric.findMany({
    where: {
      tenantId,
      isArchived: false,
      availableMeters: { gt: new Prisma.Decimal(0) },
    },
    select: {
      id: true,
      name: true,
      color: true,
      type: true,
      pricePerMeter: true,
      availableMeters: true,
      photoUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    shop,
    fabrics,
  };
}

// ---------------------------------------------------------------------------
// 2. Customer-Initiated Order Creation (Shared Phase 4 createOrder Function)
// ---------------------------------------------------------------------------

export async function createCustomerOrder(
  tenantId: string,
  customerId: string,
  input: CustomerCreateOrderInput,
) {
  // 1. Verify tenant exists and is active
  const shop = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, isActive: true, allowsSelfMeasurement: true },
  });
  if (!shop || !shop.isActive) {
    throw new NotFoundError('Shop');
  }

  // 2. Auto-create ShopCustomerLink if this is customer's first interaction with this shop
  const existingLink = await prisma.shopCustomerLink.findUnique({
    where: {
      tenantId_customerId: { tenantId, customerId },
    },
  });

  if (!existingLink) {
    await prisma.shopCustomerLink.create({
      data: {
        tenantId,
        customerId,
        firstInteractionSource: InteractionSource.DIRECT,
      },
    });
  }

  // 3. Resolve the tenant's SHOP_OWNER user ID to satisfy the User foreign key
  // on FabricStockTransaction.createdById and OrderStatusLog.changedById
  const shopOwner = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SHOP_OWNER },
    select: { id: true },
  });
  if (!shopOwner) {
    throw new NotFoundError('Shop staff or owner');
  }

  // 4. Resolve measurement profile
  let measurementProfileId = input.measurementProfileId;

  if (input.inStoreFitting || !measurementProfileId) {
    // Find or create an "In-Store Fitting" placeholder measurement profile
    let profile = await prisma.measurementProfile.findFirst({
      where: {
        tenantId,
        customerId,
        name: 'In-Store Fitting',
        garmentType: input.garmentType,
      },
      select: { id: true },
    });

    if (!profile) {
      profile = await prisma.measurementProfile.create({
        data: {
          tenantId,
          customerId,
          name: 'In-Store Fitting',
          garmentType: input.garmentType,
          notes: 'Customer requested in-store measurement fitting',
          versions: {
            create: {
              tenantId,
              versionNumber: 1,
              createdById: shopOwner.id,
              values: { fitting: 'PENDING_IN_STORE' },
              unit: MeasurementUnit.INCHES,
              fitPreference: FitPreference.REGULAR,
            },
          },
        },
        select: { id: true },
      });
    }

    measurementProfileId = profile.id;
  } else {
    // Verify that the specified measurementProfileId belongs to THIS customer and THIS tenant
    const profile = await prisma.measurementProfile.findUnique({
      where: { id: measurementProfileId },
    });

    if (!profile || profile.customerId !== customerId || profile.tenantId !== tenantId) {
      throw new ValidationError(
        'Measurement profile does not belong to this customer or shop',
      );
    }
  }

  // 5. CRITICAL: Invoke the EXACT SAME order creation service function used by staff
  const order = await createOrder(tenantId, shopOwner.id, {
    customerId,
    measurementProfileId,
    fabricId: input.fabricId,
    garmentType: input.garmentType,
    metersUsed: input.metersUsed,
    estimatedDeliveryDate: input.estimatedDeliveryDate,
    notes: input.notes,
  });

  return order;
}

// ---------------------------------------------------------------------------
// 3. Cross-Shop Orders for the Logged-In Customer
// ---------------------------------------------------------------------------

export async function getCustomerOrders(customerId: string) {
  // Only aggregate orders from tenants where the customer has a legitimate ShopCustomerLink
  const links = await prisma.shopCustomerLink.findMany({
    where: { customerId },
    select: { tenantId: true },
  });

  if (links.length === 0) {
    return [];
  }

  const tenantIds = links.map((l) => l.tenantId);

  return prisma.order.findMany({
    where: {
      customerId,
      tenantId: { in: tenantIds },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
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
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          balanceDue: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// 4. Single Order Detail with Status Timeline Logs
// ---------------------------------------------------------------------------

export async function getCustomerOrderById(customerId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
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
            where: { isCurrent: true },
            take: 1,
          },
        },
      },
      statusLogs: {
        orderBy: { changedAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          changedAt: true,
          note: true,
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
        },
      },
    },
  });

  // Strict ownership check: customer must own the order
  if (!order || order.customerId !== customerId) {
    throw new NotFoundError('Order');
  }

  // Ensure relationship exists
  const link = await prisma.shopCustomerLink.findUnique({
    where: {
      tenantId_customerId: {
        tenantId: order.tenantId,
        customerId,
      },
    },
  });

  if (!link) {
    throw new NotFoundError('Order');
  }

  return order;
}

// ---------------------------------------------------------------------------
// 5. Cross-Shop Invoices for the Logged-In Customer
// ---------------------------------------------------------------------------

export async function getCustomerInvoices(customerId: string) {
  const links = await prisma.shopCustomerLink.findMany({
    where: { customerId },
    select: { tenantId: true },
  });

  if (links.length === 0) {
    return [];
  }

  const tenantIds = links.map((l) => l.tenantId);

  return prisma.invoice.findMany({
    where: {
      customerId,
      tenantId: { in: tenantIds },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      order: {
        select: {
          id: true,
          garmentType: true,
          status: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          recordedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCustomerInvoicePdf(customerId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
    },
  });

  if (!invoice || invoice.customerId !== customerId) {
    throw new NotFoundError('Invoice');
  }

  const link = await prisma.shopCustomerLink.findUnique({
    where: {
      tenantId_customerId: {
        tenantId: invoice.tenantId,
        customerId,
      },
    },
  });

  if (!link) {
    throw new ForbiddenError('No shop customer relationship');
  }

  return generateInvoicePdfBuffer(invoice.tenantId, invoice.id);
}

// ---------------------------------------------------------------------------
// 6. Shop-Grouped Measurement Profiles
// ---------------------------------------------------------------------------

export async function getCustomerMeasurementProfiles(customerId: string) {
  const profiles = await prisma.measurementProfile.findMany({
    where: { customerId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
    orderBy: [{ tenantId: 'asc' }, { createdAt: 'desc' }],
  });

  return profiles;
}

export async function createCustomerMeasurementProfile(
  tenantId: string,
  customerId: string,
  input: CustomerCreateMeasurementProfileInput,
) {
  const shop = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, isActive: true, allowsSelfMeasurement: true },
  });

  if (!shop || !shop.isActive) {
    throw new NotFoundError('Shop');
  }

  if (!shop.allowsSelfMeasurement) {
    throw new ValidationError(
      'This shop does not accept customer-entered measurements. Please request an in-store measurement fitting.',
    );
  }

  const shopOwner = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SHOP_OWNER },
    select: { id: true },
  });
  if (!shopOwner) {
    throw new NotFoundError('Shop staff or owner');
  }

  // Ensure ShopCustomerLink exists
  const existingLink = await prisma.shopCustomerLink.findUnique({
    where: {
      tenantId_customerId: { tenantId, customerId },
    },
  });

  if (!existingLink) {
    await prisma.shopCustomerLink.create({
      data: {
        tenantId,
        customerId,
        firstInteractionSource: InteractionSource.DIRECT,
      },
    });
  }

  const profile = await prisma.measurementProfile.create({
    data: {
      tenantId,
      customerId,
      name: input.name,
      garmentType: input.garmentType,
      versions: {
        create: {
          tenantId,
          versionNumber: 1,
          createdById: shopOwner.id,
          values: input.values,
          unit: input.unit,
          fitPreference: input.fitPreference,
          fitNotes: input.fitNotes,
        },
      },
    },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true },
      },
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });

  return profile;
}
