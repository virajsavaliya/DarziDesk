import { Router } from 'express';
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

adminMarketplaceRouter.post('/:tenantId/approve', async (req, res, next) => {
  try {
    const shop = await marketplaceService.approveShopListing(req.params.tenantId);
    res.status(200).json({ data: shop });
  } catch (err) {
    next(err);
  }
});

adminMarketplaceRouter.post('/:tenantId/reject', async (req, res, next) => {
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
