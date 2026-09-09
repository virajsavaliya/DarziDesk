import { prisma } from '../../lib/prisma';
import { ListingStatus, OrderStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import type {
  MarketplaceSettingsInput,
  MarketplaceQueryInput,
  CreateReviewInput,
} from './marketplace.schema';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// ---------------------------------------------------------------------------
// 1. Shop Owner: Marketplace Settings
// ---------------------------------------------------------------------------

export async function updateMarketplaceSettings(
  tenantId: string,
  input: MarketplaceSettingsInput,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Shop not found');
  }

  let nextListingStatus = tenant.listingStatus;
  let nextIsListed = tenant.isListedOnMarketplace;
  let nextRejectionReason = tenant.rejectionReason;

  if (input.isListedOnMarketplace !== undefined) {
    if (input.isListedOnMarketplace) {
      nextIsListed = true;
      // If toggling on, set to PENDING_REVIEW unless already approved
      if (tenant.listingStatus !== ListingStatus.APPROVED) {
        nextListingStatus = ListingStatus.PENDING_REVIEW;
        nextRejectionReason = null;
      }
    } else {
      // Toggling off immediately removes from public listing
      nextIsListed = false;
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      isListedOnMarketplace: nextIsListed,
      listingStatus: nextListingStatus,
      rejectionReason: nextRejectionReason,
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.specialtyTags !== undefined ? { specialtyTags: input.specialtyTags } : {}),
      ...(input.coverPhotoUrl !== undefined ? { coverPhotoUrl: input.coverPhotoUrl } : {}),
      ...(input.portfolioPhotoUrls !== undefined
        ? { portfolioPhotoUrls: input.portfolioPhotoUrls }
        : {}),
      ...(input.workingHours !== undefined ? { workingHours: input.workingHours as any } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isListedOnMarketplace: true,
      listingStatus: true,
      rejectionReason: true,
      city: true,
      latitude: true,
      longitude: true,
      specialtyTags: true,
      coverPhotoUrl: true,
      portfolioPhotoUrls: true,
      workingHours: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function getMarketplaceSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      isListedOnMarketplace: true,
      listingStatus: true,
      rejectionReason: true,
      city: true,
      latitude: true,
      longitude: true,
      specialtyTags: true,
      coverPhotoUrl: true,
      portfolioPhotoUrls: true,
      workingHours: true,
      updatedAt: true,
    },
  });

  if (!tenant) {
    throw new NotFoundError('Shop not found');
  }

  return tenant;
}

// ---------------------------------------------------------------------------
// 2. Public Marketplace: Discovery & Storefront
// ---------------------------------------------------------------------------

export async function listPublicShops(query: MarketplaceQueryInput) {
  const where: any = {
    isListedOnMarketplace: true,
    listingStatus: ListingStatus.APPROVED,
    isActive: true,
  };

  if (query.city) {
    where.city = { contains: query.city, mode: 'insensitive' };
  }

  if (query.specialty) {
    where.specialtyTags = { has: query.specialty };
  }

  // STRICT WHITELIST PROJECTION — leak ZERO operational or financial metrics
  const shops = await prisma.tenant.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      latitude: true,
      longitude: true,
      specialtyTags: true,
      coverPhotoUrl: true,
      portfolioPhotoUrls: true,
      workingHours: true,
      reviews: {
        where: { isFlagged: false },
        select: { rating: true },
      },
    },
  });

  let results = shops.map((shop) => {
    const { reviews, ...publicShop } = shop;
    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
        : null;

    let distanceKm: number | null = null;
    if (
      query.lat !== undefined &&
      query.lng !== undefined &&
      publicShop.latitude !== null &&
      publicShop.longitude !== null
    ) {
      distanceKm = calculateDistanceKm(
        query.lat,
        query.lng,
        publicShop.latitude,
        publicShop.longitude,
      );
    }

    return {
      ...publicShop,
      avgRating,
      reviewCount,
      distanceKm,
    };
  });

  // Sort by distance if user coordinates provided
  if (query.lat !== undefined && query.lng !== undefined) {
    results.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  const paginated = results.slice(query.offset, query.offset + query.limit);

  return {
    data: paginated,
    total: results.length,
    limit: query.limit,
    offset: query.offset,
  };
}

export async function getPublicShopDetail(tenantId: string) {
  const shop = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      isListedOnMarketplace: true,
      listingStatus: ListingStatus.APPROVED,
      isActive: true,
    },
    // STRICT WHITELIST PROJECTION — zero operational leakage
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      latitude: true,
      longitude: true,
      specialtyTags: true,
      coverPhotoUrl: true,
      portfolioPhotoUrls: true,
      workingHours: true,
      reviews: {
        where: { isFlagged: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!shop) {
    throw new NotFoundError('Shop storefront not found or not approved on marketplace');
  }

  const { reviews, ...publicShop } = shop;
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
      : null;

  // Mask reviewer identity (e.g. Rahul S.)
  const formattedReviews = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    customerName: `${r.customer.firstName}${
      r.customer.lastName ? ` ${r.customer.lastName[0]}.` : ''
    }`,
  }));

  return {
    ...publicShop,
    avgRating,
    reviewCount,
    reviews: formattedReviews,
  };
}

// ---------------------------------------------------------------------------
// 3. Customer Reviews (DELIVERED Orders Only)
// ---------------------------------------------------------------------------

export async function createCustomerReview(
  tenantId: string,
  customerId: string,
  input: CreateReviewInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      status: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.tenantId !== tenantId || order.customerId !== customerId) {
    throw new ValidationError('Order does not belong to this customer or shop');
  }

  // STRICT REQUIREMENT: Only DELIVERED orders can be reviewed
  if (order.status !== OrderStatus.DELIVERED) {
    throw new ValidationError(
      `Reviews can only be submitted for completed delivered garments (Current status: ${order.status})`,
    );
  }

  // One review per customer per completed order
  const existing = await prisma.customerReview.findUnique({
    where: { orderId: input.orderId },
  });

  if (existing) {
    throw new ConflictError('A review has already been submitted for this order');
  }

  const review = await prisma.customerReview.create({
    data: {
      tenantId,
      customerId,
      orderId: input.orderId,
      rating: input.rating,
      comment: input.comment ?? null,
    },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      orderId: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  });

  return review;
}

export async function flagReview(reviewId: string, reason: string, flaggedBy: string) {
  const review = await prisma.customerReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  await prisma.customerReview.update({
    where: { id: reviewId },
    data: {
      isFlagged: true,
      flagReason: reason,
      flaggedBy,
    },
  });

  return { message: 'Review has been flagged for moderation review' };
}

// ---------------------------------------------------------------------------
// 4. Super Admin Moderation
// ---------------------------------------------------------------------------

export async function listPendingShops() {
  const pendingShops = await prisma.tenant.findMany({
    where: {
      listingStatus: ListingStatus.PENDING_REVIEW,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      specialtyTags: true,
      coverPhotoUrl: true,
      portfolioPhotoUrls: true,
      workingHours: true,
      isListedOnMarketplace: true,
      listingStatus: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return pendingShops;
}

export async function approveShopListing(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Shop not found');
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      listingStatus: ListingStatus.APPROVED,
      isListedOnMarketplace: true,
      rejectionReason: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      listingStatus: true,
      isListedOnMarketplace: true,
      rejectionReason: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function rejectShopListing(tenantId: string, reason: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Shop not found');
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      listingStatus: ListingStatus.REJECTED,
      isListedOnMarketplace: false,
      rejectionReason: reason,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      listingStatus: true,
      isListedOnMarketplace: true,
      rejectionReason: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function listFlaggedReviews() {
  const flagged = await prisma.customerReview.findMany({
    where: { isFlagged: true },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return flagged;
}

export async function resolveFlaggedReview(reviewId: string, action: 'DISMISS' | 'REMOVE') {
  const review = await prisma.customerReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (action === 'DISMISS') {
    await prisma.customerReview.update({
      where: { id: reviewId },
      data: {
        isFlagged: false,
        flagReason: null,
        flaggedBy: null,
      },
    });
    return { message: 'Flag dismissed successfully' };
  } else {
    await prisma.customerReview.delete({
      where: { id: reviewId },
    });
    return { message: 'Review removed permanently' };
  }
}
