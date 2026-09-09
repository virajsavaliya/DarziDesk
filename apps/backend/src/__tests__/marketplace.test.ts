import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createTenant,
  createUser,
  createCustomer,
  linkCustomerToTenant,
  createMeasurementProfile,
  createFabricRecord,
} from './helpers/factories';
import { customerToken, staffToken } from './helpers/tokens';
import {
  GarmentType,
  ListingStatus,
  OrderStatus,
  UserRole,
} from '@prisma/client';

const app = createApp();

describe('Phase 10: Marketplace & Discovery API', () => {
  let shopApproved: any;
  let shopPending: any;
  let shopUnlisted: any;
  let ownerApproved: any;
  let superAdmin: any;
  let customer1: any;
  let customer2: any;
  let tokenOwnerApproved: string;
  let tokenSuperAdmin: string;
  let tokenCustomer1: string;
  let tokenCustomer2: string;
  let fabric1: any;
  let profile1: any;

  beforeEach(async () => {
    // 1. Create shops
    shopApproved = await createTenant({
      name: 'Mayfair Bespoke Tailors',
      slug: 'mayfair-bespoke',
    });
    // Set approved marketplace details
    await testPrisma.tenant.update({
      where: { id: shopApproved.id },
      data: {
        isListedOnMarketplace: true,
        listingStatus: ListingStatus.APPROVED,
        city: 'Mumbai',
        latitude: 18.922,
        longitude: 72.834,
        specialtyTags: ['Bespoke Suits', 'Tuxedos', 'Italian Wool'],
        coverPhotoUrl: 'https://images.unsplash.com/photo-cover.jpg',
        portfolioPhotoUrls: ['https://images.unsplash.com/photo-1.jpg'],
        workingHours: { mon_sat: '10am - 8pm' },
      },
    });

    shopPending = await createTenant({
      name: 'Delhi Heritage Silks',
      slug: 'delhi-silks',
    });
    // Set pending review
    await testPrisma.tenant.update({
      where: { id: shopPending.id },
      data: {
        isListedOnMarketplace: true,
        listingStatus: ListingStatus.PENDING_REVIEW,
        city: 'New Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        specialtyTags: ['Khadi', 'Sherwanis'],
      },
    });

    shopUnlisted = await createTenant({
      name: 'Private Atelier',
      slug: 'private-atelier',
    });
    await testPrisma.tenant.update({
      where: { id: shopUnlisted.id },
      data: {
        isListedOnMarketplace: false,
        listingStatus: ListingStatus.PENDING_REVIEW,
      },
    });

    // 2. Create users
    ownerApproved = await createUser(shopApproved.id, { role: UserRole.SHOP_OWNER });
    superAdmin = await testPrisma.user.create({
      data: {
        tenantId: null,
        email: 'admin@platform.com',
        passwordHash: 'dummy',
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      },
    });

    tokenOwnerApproved = await staffToken(ownerApproved);
    tokenSuperAdmin = await staffToken(superAdmin);

    // 3. Create customers
    customer1 = await createCustomer({ phone: '+919999900001', firstName: 'Rohan', lastName: 'Mehra' });
    customer2 = await createCustomer({ phone: '+919999900002', firstName: 'Aditya', lastName: 'Roy' });

    tokenCustomer1 = await customerToken(customer1);
    tokenCustomer2 = await customerToken(customer2);

    // 4. Fabric & Profile for shopApproved
    await linkCustomerToTenant(shopApproved.id, customer1.id);
    profile1 = await createMeasurementProfile(shopApproved.id, customer1.id, {
      name: 'Standard Suit Profile',
      garmentType: GarmentType.SHIRT,
    });
    fabric1 = await createFabricRecord(shopApproved.id, {
      name: 'Italian Merino Wool',
      availableMeters: '50.000',
    });
  });

  // -------------------------------------------------------------------------
  // Test 1: Public endpoint strictly leaks NO sensitive fields
  // -------------------------------------------------------------------------
  it('Public marketplace discovery endpoint returns strictly public fields and leaks zero sensitive operational data', async () => {
    const res = await supertest(app).get('/api/marketplace/shops');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);

    const shop = res.body.data.find((s: any) => s.id === shopApproved.id);
    expect(shop).toBeDefined();

    // Verify allowed public fields exist
    expect(shop.id).toBe(shopApproved.id);
    expect(shop.name).toBe('Mayfair Bespoke Tailors');
    expect(shop.slug).toBe('mayfair-bespoke');
    expect(shop.city).toBe('Mumbai');
    expect(shop.specialtyTags).toEqual(['Bespoke Suits', 'Tuxedos', 'Italian Wool']);
    expect(shop.coverPhotoUrl).toBe('https://images.unsplash.com/photo-cover.jpg');
    expect(shop.portfolioPhotoUrls).toEqual(['https://images.unsplash.com/photo-1.jpg']);
    expect(shop.workingHours).toEqual({ mon_sat: '10am - 8pm' });

    // CRITICAL SECURITY ASSERTIONS: ZERO SENSITIVE LEAKS ON LIST ENDPOINT
    expect(shop.revenue).toBeUndefined();
    expect(shop.taxRatePercent).toBeUndefined();
    expect(shop.smsEnabled).toBeUndefined();
    expect(shop.emailEnabled).toBeUndefined();
    expect(shop.whatsappEnabled).toBeUndefined();
    expect(shop.allowsSelfMeasurement).toBeUndefined();
    expect(shop.fabrics).toBeUndefined();
    expect(shop.orders).toBeUndefined();
    expect(shop.users).toBeUndefined();
    expect(shop.customers).toBeUndefined();
    expect(shop.pricingRules).toBeUndefined();
    expect(shop.invoices).toBeUndefined();
    expect(shop.notificationLogs).toBeUndefined();

    // CRITICAL SECURITY ASSERTIONS: ZERO SENSITIVE LEAKS ON DETAIL ENDPOINT TOO
    const detailRes = await supertest(app).get(`/api/marketplace/shops/${shopApproved.id}`);
    expect(detailRes.status).toBe(200);
    const detailShop = detailRes.body.data;
    expect(detailShop).toBeDefined();
    expect(detailShop.id).toBe(shopApproved.id);
    expect(detailShop.name).toBe('Mayfair Bespoke Tailors');

    expect(detailShop.revenue).toBeUndefined();
    expect(detailShop.taxRatePercent).toBeUndefined();
    expect(detailShop.smsEnabled).toBeUndefined();
    expect(detailShop.emailEnabled).toBeUndefined();
    expect(detailShop.whatsappEnabled).toBeUndefined();
    expect(detailShop.allowsSelfMeasurement).toBeUndefined();
    expect(detailShop.fabrics).toBeUndefined();
    expect(detailShop.orders).toBeUndefined();
    expect(detailShop.users).toBeUndefined();
    expect(detailShop.customers).toBeUndefined();
    expect(detailShop.pricingRules).toBeUndefined();
    expect(detailShop.invoices).toBeUndefined();
    expect(detailShop.notificationLogs).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Test 1b: Public shop detail endpoint strictly leaks NO sensitive fields
  // -------------------------------------------------------------------------
  it('Public marketplace shop detail endpoint (GET /api/marketplace/shops/:tenantId) returns strictly public fields and leaks zero sensitive operational data', async () => {
    const res = await supertest(app).get(`/api/marketplace/shops/${shopApproved.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    const shop = res.body.data;

    // Verify allowed public fields exist
    expect(shop.id).toBe(shopApproved.id);
    expect(shop.name).toBe('Mayfair Bespoke Tailors');
    expect(shop.slug).toBe('mayfair-bespoke');
    expect(shop.city).toBe('Mumbai');
    expect(shop.specialtyTags).toEqual(['Bespoke Suits', 'Tuxedos', 'Italian Wool']);

    // CRITICAL SECURITY ASSERTIONS: ZERO SENSITIVE LEAKS ON DETAIL ENDPOINT
    expect(shop.revenue).toBeUndefined();
    expect(shop.taxRatePercent).toBeUndefined();
    expect(shop.smsEnabled).toBeUndefined();
    expect(shop.emailEnabled).toBeUndefined();
    expect(shop.whatsappEnabled).toBeUndefined();
    expect(shop.allowsSelfMeasurement).toBeUndefined();
    expect(shop.fabrics).toBeUndefined();
    expect(shop.orders).toBeUndefined();
    expect(shop.users).toBeUndefined();
    expect(shop.customers).toBeUndefined();
    expect(shop.pricingRules).toBeUndefined();
    expect(shop.invoices).toBeUndefined();
    expect(shop.notificationLogs).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Test 2: Visibility Rule — PENDING_REVIEW and unlisted shops are hidden
  // -------------------------------------------------------------------------
  it('A shop with isListedOnMarketplace=true but listingStatus=PENDING_REVIEW is invisible in public search results', async () => {
    const res = await supertest(app).get('/api/marketplace/shops');

    expect(res.status).toBe(200);
    const ids = res.body.data.map((s: any) => s.id);

    // Approved shop is visible
    expect(ids).toContain(shopApproved.id);

    // Pending review shop MUST NOT be visible
    expect(ids).not.toContain(shopPending.id);

    // Unlisted shop MUST NOT be visible
    expect(ids).not.toContain(shopUnlisted.id);

    // Direct detail lookup on pending shop returns 404
    const pendingDetailRes = await supertest(app).get(`/api/marketplace/shops/${shopPending.id}`);
    expect(pendingDetailRes.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Test 3: Review submission requires DELIVERED order
  // -------------------------------------------------------------------------
  it('Review submission without a DELIVERED order is rejected, but succeeds for a real DELIVERED order', async () => {
    // 1. Create order in PLACED status
    const activeOrder = await testPrisma.order.create({
      data: {
        tenantId: shopApproved.id,
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        status: OrderStatus.PLACED,
        priceSnapshot: '1500.00',
      },
    });

    // Attempting to review an active order (PLACED) must be rejected
    const activeReviewRes = await supertest(app)
      .post(`/api/portal/shops/${shopApproved.id}/reviews`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        orderId: activeOrder.id,
        rating: 5,
        comment: 'Great early progress!',
      });

    expect(activeReviewRes.status).toBe(422);
    expect(activeReviewRes.body.error.message).toContain('Reviews can only be submitted for completed delivered garments');

    // 2. Create order in DELIVERED status
    const deliveredOrder = await testPrisma.order.create({
      data: {
        tenantId: shopApproved.id,
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        status: OrderStatus.DELIVERED,
        priceSnapshot: '1500.00',
      },
    });

    // Customer 2 attempts to review Customer 1's delivered order -> rejected
    const unauthorizedReviewRes = await supertest(app)
      .post(`/api/portal/shops/${shopApproved.id}/reviews`)
      .set('Authorization', `Bearer ${tokenCustomer2}`)
      .send({
        orderId: deliveredOrder.id,
        rating: 4,
        comment: 'Trying to review someone else order',
      });
    expect(unauthorizedReviewRes.status).toBe(422);

    // Customer 1 reviews their DELIVERED order -> succeeds
    const validReviewRes = await supertest(app)
      .post(`/api/portal/shops/${shopApproved.id}/reviews`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        orderId: deliveredOrder.id,
        rating: 5,
        comment: 'Masterful tailoring and fit!',
      });

    expect(validReviewRes.status).toBe(201);
    expect(validReviewRes.body.data.rating).toBe(5);
    expect(validReviewRes.body.data.comment).toBe('Masterful tailoring and fit!');

    // Duplicate review on the same order -> rejected with 409 Conflict
    const dupReviewRes = await supertest(app)
      .post(`/api/portal/shops/${shopApproved.id}/reviews`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        orderId: deliveredOrder.id,
        rating: 4,
        comment: 'Second review attempt',
      });
    expect(dupReviewRes.status).toBe(409);

    // Public shop detail now reflects the review and rating
    const shopDetailRes = await supertest(app).get(`/api/marketplace/shops/${shopApproved.id}`);
    expect(shopDetailRes.status).toBe(200);
    expect(shopDetailRes.body.data.reviewCount).toBe(1);
    expect(shopDetailRes.body.data.avgRating).toBe(5);
    expect(shopDetailRes.body.data.reviews[0].customerName).toBe('Rohan M.');
  });

  // -------------------------------------------------------------------------
  // Test 3b: ShopOwner attempting to approve their OWN shop is rejected with 403
  // -------------------------------------------------------------------------
  it('ShopOwner attempting to approve their OWN shop (POST /api/admin/marketplace/:tenantId/approve) is rejected with 403 Forbidden', async () => {
    const res = await supertest(app)
      .post(`/api/admin/marketplace/${shopApproved.id}/approve`)
      .set('Authorization', `Bearer ${tokenOwnerApproved}`);

    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Test 4: SuperAdmin Moderation & RBAC
  // -------------------------------------------------------------------------
  it('SuperAdmin can approve or reject listings; ShopOwner cannot self-approve their listing', async () => {
    // 1. ShopOwner attempts to approve their pending shop -> 403 Forbidden
    const ownerApproveRes = await supertest(app)
      .post(`/api/admin/marketplace/${shopPending.id}/approve`)
      .set('Authorization', `Bearer ${tokenOwnerApproved}`);

    expect(ownerApproveRes.status).toBe(403);

    // 2. SuperAdmin checks pending listings
    const pendingRes = await supertest(app)
      .get('/api/admin/marketplace/pending')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(pendingRes.status).toBe(200);
    const pendingIds = pendingRes.body.data.map((s: any) => s.id);
    expect(pendingIds).toContain(shopPending.id);

    // 3. SuperAdmin approves shopPending
    const approveRes = await supertest(app)
      .post(`/api/admin/marketplace/${shopPending.id}/approve`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.listingStatus).toBe(ListingStatus.APPROVED);

    // 4. Shop now appears on public marketplace
    const publicRes = await supertest(app).get('/api/marketplace/shops');
    const publicIds = publicRes.body.data.map((s: any) => s.id);
    expect(publicIds).toContain(shopPending.id);

    // 5. SuperAdmin rejects shop with a reason
    const rejectRes = await supertest(app)
      .post(`/api/admin/marketplace/${shopPending.id}/reject`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ reason: 'Incomplete portfolio photos' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.listingStatus).toBe(ListingStatus.REJECTED);
    expect(rejectRes.body.data.rejectionReason).toBe('Incomplete portfolio photos');

    // 6. Rejected shop is removed from public marketplace
    const publicAfterReject = await supertest(app).get('/api/marketplace/shops');
    const idsAfter = publicAfterReject.body.data.map((s: any) => s.id);
    expect(idsAfter).not.toContain(shopPending.id);
  });

  // -------------------------------------------------------------------------
  // Test 5: Filtering & Distance Sorting
  // -------------------------------------------------------------------------
  it('Supports filtering by city and specialty, and sorts by distance when coordinates are provided', async () => {
    // City filter
    const mumbaiRes = await supertest(app).get('/api/marketplace/shops?city=Mumbai');
    expect(mumbaiRes.status).toBe(200);
    expect(mumbaiRes.body.data.length).toBe(1);
    expect(mumbaiRes.body.data[0].city).toBe('Mumbai');

    const noMatchRes = await supertest(app).get('/api/marketplace/shops?city=Kolkata');
    expect(noMatchRes.status).toBe(200);
    expect(noMatchRes.body.data.length).toBe(0);

    // Specialty filter
    const specialtyRes = await supertest(app).get('/api/marketplace/shops?specialty=Bespoke Suits');
    expect(specialtyRes.status).toBe(200);
    expect(specialtyRes.body.data.length).toBe(1);

    // Distance calculation
    const distanceRes = await supertest(app).get('/api/marketplace/shops?lat=18.93&lng=72.84');
    expect(distanceRes.status).toBe(200);
    expect(distanceRes.body.data[0].distanceKm).toBeDefined();
    expect(typeof distanceRes.body.data[0].distanceKm).toBe('number');
  });

  // -------------------------------------------------------------------------
  // Test 6: Flagging & Moderation of Abusive Reviews
  // -------------------------------------------------------------------------
  it('Allows flagging abusive reviews and allows SuperAdmin to resolve or remove them', async () => {
    // Create delivered order and review
    const order = await testPrisma.order.create({
      data: {
        tenantId: shopApproved.id,
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        status: OrderStatus.DELIVERED,
        priceSnapshot: '1500.00',
      },
    });

    const review = await testPrisma.customerReview.create({
      data: {
        tenantId: shopApproved.id,
        customerId: customer1.id,
        orderId: order.id,
        rating: 1,
        comment: 'Inappropriate spam content',
      },
    });

    // Public user/shop owner flags review
    const flagRes = await supertest(app)
      .post(`/api/marketplace/reviews/${review.id}/flag`)
      .send({ reason: 'Spam review' });

    expect(flagRes.status).toBe(200);

    // SuperAdmin checks flagged reviews queue
    const flaggedListRes = await supertest(app)
      .get('/api/admin/marketplace/flagged-reviews')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(flaggedListRes.status).toBe(200);
    expect(flaggedListRes.body.data.some((r: any) => r.id === review.id)).toBe(true);

    // SuperAdmin removes the review
    const resolveRes = await supertest(app)
      .post(`/api/admin/marketplace/reviews/${review.id}/resolve`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ action: 'REMOVE' });

    expect(resolveRes.status).toBe(200);

    // Verify deleted
    const deleted = await testPrisma.customerReview.findUnique({ where: { id: review.id } });
    expect(deleted).toBeNull();
  });
});
