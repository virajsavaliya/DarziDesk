import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize, UserRole } from '../../middleware/authorize';
import type { StaffJwtPayload } from '../../lib/jwt';
import {
  MarketplaceSettingsSchema,
  MarketplaceQuerySchema,
  FlagReviewSchema,
  RejectListingSchema,
  ResolveReviewSchema,
} from './marketplace.schema';
import * as marketplaceService from './marketplace.service';

// ---------------------------------------------------------------------------
// 1. Public Marketplace Router (No Auth Required) -> /api/marketplace
// ---------------------------------------------------------------------------
export const publicMarketplaceRouter = Router();

publicMarketplaceRouter.get('/detect-location', async (req, res, next) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '';

    const location = await marketplaceService.detectIpLocation(clientIp);
    res.status(200).json({ data: location });
  } catch (err) {
    next(err);
  }
});

publicMarketplaceRouter.get('/shops', async (req, res, next) => {
  try {
    const query = MarketplaceQuerySchema.parse(req.query);
    const result = await marketplaceService.listPublicShops(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

publicMarketplaceRouter.get('/shops/:tenantId', async (req, res, next) => {
  try {
    const shop = await marketplaceService.getPublicShopDetail(req.params.tenantId);
    res.status(200).json({ data: shop });
  } catch (err) {
    next(err);
  }
});

publicMarketplaceRouter.post('/reviews/:reviewId/flag', async (req, res, next) => {
  try {
    const auth = res.locals.auth;
    const flaggedBy = auth?.sub || 'public_user';
    const body = FlagReviewSchema.parse(req.body);
    const result = await marketplaceService.flagReview(
      req.params.reviewId,
      body.reason,
      flaggedBy,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 2. Shop Owner Marketplace Settings Router -> /api/shop
// ---------------------------------------------------------------------------
export const shopMarketplaceRouter = Router();

shopMarketplaceRouter.use(authenticateStaff, authorize(UserRole.SHOP_OWNER));

shopMarketplaceRouter.get('/marketplace-settings', async (_req, res, next) => {
  try {
    const auth = res.locals.auth as StaffJwtPayload;
    const settings = await marketplaceService.getMarketplaceSettings(auth.tenantId!);
    res.status(200).json({ data: settings });
  } catch (err) {
    next(err);
  }
});

shopMarketplaceRouter.put('/marketplace-settings', async (req, res, next) => {
  try {
    const auth = res.locals.auth as StaffJwtPayload;
    const body = MarketplaceSettingsSchema.parse(req.body);
    const settings = await marketplaceService.updateMarketplaceSettings(
      auth.tenantId!,
      body,
    );
    res.status(200).json({ data: settings });
  } catch (err) {
    next(err);
  }
});

const ShopProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  coverPhotoUrl: z.string().trim().max(500).optional().nullable(),
});

shopMarketplaceRouter.get('/profile', async (_req, res, next) => {
  try {
    const auth = res.locals.auth as StaffJwtPayload;
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId! },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        city: true,
        coverPhotoUrl: true,
      },
    });
    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
});

shopMarketplaceRouter.patch('/profile', async (req, res, next) => {
  try {
    const auth = res.locals.auth as StaffJwtPayload;
    const data = ShopProfileSchema.parse(req.body);
    const updated = await prisma.tenant.update({
      where: { id: auth.tenantId! },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.coverPhotoUrl !== undefined && { coverPhotoUrl: data.coverPhotoUrl }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        city: true,
        coverPhotoUrl: true,
      },
    });
    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 3. Super Admin Moderation Router -> /api/admin/marketplace
// ---------------------------------------------------------------------------
export const adminMarketplaceRouter = Router();

adminMarketplaceRouter.use(authenticateStaff, authorize(UserRole.SUPER_ADMIN));

adminMarketplaceRouter.get('/pending', async (_req, res, next) => {
  try {
    const pendingShops = await marketplaceService.listPendingShops();
    res.status(200).json({ data: pendingShops });
  } catch (err) {
    next(err);
  }
});

adminMarketplaceRouter.post(['/shops/:tenantId/approve', '/:tenantId/approve'], async (req, res, next) => {
  try {
    const shop = await marketplaceService.approveShopListing(req.params.tenantId);
    res.status(200).json({ data: shop });
  } catch (err) {
    next(err);
  }
});

adminMarketplaceRouter.post(['/shops/:tenantId/reject', '/:tenantId/reject'], async (req, res, next) => {
  try {
    const body = RejectListingSchema.parse(req.body);
    const shop = await marketplaceService.rejectShopListing(
      req.params.tenantId,
      body.reason,
    );
    res.status(200).json({ data: shop });
  } catch (err) {
    next(err);
  }
});

adminMarketplaceRouter.get('/flagged-reviews', async (_req, res, next) => {
  try {
    const flagged = await marketplaceService.listFlaggedReviews();
    res.status(200).json({ data: flagged });
  } catch (err) {
    next(err);
  }
});

adminMarketplaceRouter.post('/reviews/:reviewId/resolve', async (req, res, next) => {
  try {
    const body = ResolveReviewSchema.parse(req.body);
    const result = await marketplaceService.resolveFlaggedReview(
      req.params.reviewId,
      body.action,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
