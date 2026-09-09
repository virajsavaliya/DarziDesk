/**
 * Customer service.
 *
 * Handles:
 * - Staff-facing customer management (walk-in quick creation, shop-scoped list & search, edit)
 * - Auto-creation of ShopCustomerLink on first interaction with a shop
 * - Customer-facing endpoints (own profile, linked shops)
 */

import { InteractionSource, type Prisma } from '@prisma/client';
import { prisma, withTenantContext } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../lib/errors';
import type { SafeCustomer } from '../auth/auth.service';
import type {
  CreateWalkInCustomerInput,
  UpdateCustomerInput,
  SearchCustomersQueryInput,
} from './customer.schema';

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

export interface CustomerWithLink extends SafeCustomer {
  firstInteractionSource: InteractionSource;
  joinedAt: Date;
}

// ---------------------------------------------------------------------------
// Staff Operations (Tenant-Scoped)
// ---------------------------------------------------------------------------

/**
 * Quick-creates a walk-in customer (name + phone minimum, no password required).
 * If a customer with this phone number already exists globally:
 *   - Links them to this tenant via ShopCustomerLink (if not already linked)
 * If not:
 *   - Creates the Customer record (passwordHash = null)
 *   - Creates the ShopCustomerLink
 */
export async function quickCreateWalkInCustomer(
  tenantId: string,
  data: CreateWalkInCustomerInput,
): Promise<CustomerWithLink> {
  return withTenantContext(tenantId, async (tx) => {
    // 1. Check if customer with this phone already exists globally
    let customer = await tx.customer.findUnique({
      where: { phone: data.phone },
    });

    if (!customer) {
      // Check email uniqueness if email provided
      if (data.email) {
        const existingEmail = await tx.customer.findUnique({
          where: { email: data.email },
        });
        if (existingEmail) {
          throw new ConflictError('A customer with this email address already exists');
        }
      }

      customer = await tx.customer.create({
        data: {
          phone: data.phone,
          email: data.email ?? null,
          passwordHash: null, // Staff-created: cannot self-login until claimed
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
    }

    // 2. Auto-create ShopCustomerLink if not already linked to this shop
    let link = await tx.shopCustomerLink.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId: customer.id,
        },
      },
    });

    if (!link) {
      link = await tx.shopCustomerLink.create({
        data: {
          tenantId,
          customerId: customer.id,
          firstInteractionSource: data.firstInteractionSource || InteractionSource.WALK_IN,
        },
      });
    }

    return {
      ...toSafeCustomer(customer),
      firstInteractionSource: link.firstInteractionSource,
      joinedAt: link.joinedAt,
    };
  });
}

/**
 * Searches/lists customers linked to the current shop.
 * Strictly scoped to customers with a ShopCustomerLink to caller's tenantId.
 */
export async function listTenantCustomers(
  tenantId: string,
  query: SearchCustomersQueryInput,
): Promise<{ customers: CustomerWithLink[]; total: number }> {
  return withTenantContext(tenantId, async (tx) => {
    const whereClause: Prisma.ShopCustomerLinkWhereInput = {
      tenantId,
    };

    if (query.q && query.q.trim().length > 0) {
      const q = query.q.trim();
      whereClause.customer = {
        OR: [
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, links] = await Promise.all([
      tx.shopCustomerLink.count({ where: whereClause }),
      tx.shopCustomerLink.findMany({
        where: whereClause,
        include: { customer: true },
        orderBy: { joinedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    const customers: CustomerWithLink[] = links.map((link) => ({
      ...toSafeCustomer(link.customer),
      firstInteractionSource: link.firstInteractionSource,
      joinedAt: link.joinedAt,
    }));

    return { customers, total };
  });
}

/**
 * Fetches single customer profile scoped to this shop.
 * Throws NotFoundError if the customer is not linked to this shop.
 */
export async function getTenantCustomerById(
  tenantId: string,
  customerId: string,
): Promise<CustomerWithLink & { measurementProfilesCount: number }> {
  return withTenantContext(tenantId, async (tx) => {
    const link = await tx.shopCustomerLink.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId,
        },
      },
      include: {
        customer: {
          include: {
            measurementProfiles: {
              where: { tenantId },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Customer');
    }

    return {
      ...toSafeCustomer(link.customer),
      firstInteractionSource: link.firstInteractionSource,
      joinedAt: link.joinedAt,
      measurementProfilesCount: link.customer.measurementProfiles.length,
    };
  });
}

/**
 * Updates customer profile information.
 * Only allowed if the customer is linked to this shop.
 */
export async function updateTenantCustomer(
  tenantId: string,
  customerId: string,
  data: UpdateCustomerInput,
): Promise<SafeCustomer> {
  return withTenantContext(tenantId, async (tx) => {
    const link = await tx.shopCustomerLink.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId,
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Customer');
    }

    if (data.phone) {
      const existingPhone = await tx.customer.findFirst({
        where: { phone: data.phone, id: { not: customerId } },
      });
      if (existingPhone) {
        throw new ConflictError('A customer with this phone number already exists');
      }
    }

    if (data.email) {
      const existingEmail = await tx.customer.findFirst({
        where: { email: data.email, id: { not: customerId } },
      });
      if (existingEmail) {
        throw new ConflictError('A customer with this email already exists');
      }
    }

    const updated = await tx.customer.update({
      where: { id: customerId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
      },
    });

    return toSafeCustomer(updated);
  });
}

// ---------------------------------------------------------------------------
// Customer Operations (Self-Service)
// ---------------------------------------------------------------------------

export async function getCustomerProfile(customerId: string): Promise<SafeCustomer> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Customer');
  return toSafeCustomer(customer);
}

export interface LinkedShop {
  tenantId: string;
  name: string;
  slug: string;
  firstInteractionSource: string;
  joinedAt: Date;
}

export async function getCustomerLinkedShops(customerId: string): Promise<LinkedShop[]> {
  const links = await prisma.shopCustomerLink.findMany({
    where: { customerId },
    include: { tenant: true },
    orderBy: { joinedAt: 'desc' },
  });

  return links.map((link) => ({
    tenantId: link.tenantId,
    name: link.tenant.name,
    slug: link.tenant.slug,
    firstInteractionSource: link.firstInteractionSource,
    joinedAt: link.joinedAt,
  }));
}

export async function getCustomerShopDetails(customerId: string, tenantId: string) {
  const link = await prisma.shopCustomerLink.findUnique({
    where: {
      tenantId_customerId: {
        tenantId,
        customerId,
      },
    },
    include: { tenant: true },
  });

  if (!link) {
    throw new NotFoundError('Shop not found or not linked to customer');
  }

  return {
    tenantId: link.tenantId,
    name: link.tenant.name,
    slug: link.tenant.slug,
    firstInteractionSource: link.firstInteractionSource,
    joinedAt: link.joinedAt,
  };
}
