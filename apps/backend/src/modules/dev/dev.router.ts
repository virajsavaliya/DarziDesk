/**
 * Development / Demo Session Helper Router.
 *
 * CRITICAL SECURITY INVARIANT:
 * This endpoint is HARD-DISABLED in production.
 * If NODE_ENV === 'production', every route in this router returns 404 Not Found.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import {
  GarmentType,
  InteractionSource,
  OrderStatus,
  UserRole,
  ListingStatus,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  Prisma,
} from '@prisma/client';
import { signStaffToken, signCustomerToken } from '../../lib/jwt';

export const devRouter = Router();

// Middleware: Strict 404 in production
devRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
      },
    });
    return;
  }
  next();
});

/**
 * GET /api/dev/demo-session
 * Returns seeded demo accounts (Owner and Staff) with valid JWTs for rapid local testing.
 */
devRouter.get('/demo-session', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Prefer seeded Shree Ganesh Bespoke Tailors shop
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'shree-ganesh-tailors' } });
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({ where: { slug: 'darzi-atelier' } });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Shree Ganesh Bespoke Tailors',
          slug: 'shree-ganesh-tailors',
          timezone: 'Asia/Kolkata',
          city: 'Surat',
        },
      });
    }

    const passwordHash = await argon2.hash('Password123!');

    // Find Owner
    let owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: UserRole.SHOP_OWNER },
    });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'owner@shreeganesh.com',
          passwordHash,
          firstName: 'Ramesh',
          lastName: 'Patel',
          role: UserRole.SHOP_OWNER,
        },
      });
    }

    // Find all Staff members for this tenant
    let staffMembers = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: UserRole.STAFF },
      orderBy: { createdAt: 'asc' },
    });

    if (staffMembers.length === 0) {
      const staff1 = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'karan.cutter@shreeganesh.com',
          passwordHash,
          firstName: 'Karan',
          lastName: 'Sharma (Master Cutter & Measurer)',
          role: UserRole.STAFF,
        },
      });
      const staff2 = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'suresh.tailor@shreeganesh.com',
          passwordHash,
          firstName: 'Suresh',
          lastName: 'Mistry (Senior Stitching Artisan)',
          role: UserRole.STAFF,
        },
      });
      const staff3 = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'priya.sales@shreeganesh.com',
          passwordHash,
          firstName: 'Priya',
          lastName: 'Dave (Store & Fabric Consultant)',
          role: UserRole.STAFF,
        },
      });
      staffMembers = [staff1, staff2, staff3];
    }

    // Ensure sample customer, fabric, and order exist for demo testing
    let sampleCustomer = await prisma.customer.findFirst({
      where: { phone: '+919876500001' },
    });
    if (!sampleCustomer) {
      sampleCustomer = await prisma.customer.create({
        data: {
          phone: '+919876500001',
          firstName: 'Arjun',
          lastName: 'Kapoor',
          email: 'arjun@example.com',
        },
      });
      await prisma.shopCustomerLink.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          firstInteractionSource: InteractionSource.WALK_IN,
        },
      });
    }

    let sampleProfile = await prisma.measurementProfile.findFirst({
      where: { tenantId: tenant.id, customerId: sampleCustomer.id },
    });
    if (!sampleProfile) {
      sampleProfile = await prisma.measurementProfile.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          name: 'Formal Slim Shirt',
          garmentType: GarmentType.SHIRT,
          versions: {
            create: {
              tenantId: tenant.id,
              versionNumber: 1,
              createdById: owner.id,
              values: {
                chest: 40,
                waist: 34,
                shoulder: 18.5,
                neck: 16,
                sleeveLength: 25,
                length: 30,
              },
            },
          },
        },
      });
    }

    let sampleFabric = await prisma.fabric.findFirst({
      where: { tenantId: tenant.id, name: 'Egyptian Giza Cotton' },
    });
    if (!sampleFabric) {
      sampleFabric = await prisma.fabric.create({
        data: {
          tenantId: tenant.id,
          name: 'Egyptian Giza Cotton',
          color: 'Sky Blue',
          type: 'Cotton',
          pricePerMeter: '1400.00',
          availableMeters: '45.000',
          reservedMeters: '5.000',
          lowStockThreshold: '10.000',
        },
      });
    }

    // Seed sample assigned orders if none exist
    const existingOrdersCount = await prisma.order.count({ where: { tenantId: tenant.id } });
    if (existingOrdersCount === 0) {
      const primaryStaff = staffMembers[0] ?? owner;
      const secondaryStaff = staffMembers[1] ?? primaryStaff;

      // Order 1 assigned to Staff 1 (CUTTING)
      await prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          measurementProfileId: sampleProfile.id,
          fabricId: sampleFabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.500',
          status: OrderStatus.CUTTING,
          assignedStaffId: primaryStaff.id,
          priceSnapshot: '1400.00',
          estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
          notes: 'French cuffs, spread collar',
          statusLogs: {
            create: [
              { tenantId: tenant.id, toStatus: OrderStatus.PLACED, changedById: owner.id },
              { tenantId: tenant.id, fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.MEASUREMENT_CONFIRMED, changedById: owner.id },
              { tenantId: tenant.id, fromStatus: OrderStatus.MEASUREMENT_CONFIRMED, toStatus: OrderStatus.CUTTING, changedById: primaryStaff.id },
            ],
          },
        },
      });

      // Order 2 assigned to Staff 2 (STITCHING)
      await prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          measurementProfileId: sampleProfile.id,
          fabricId: sampleFabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.500',
          status: OrderStatus.STITCHING,
          assignedStaffId: secondaryStaff.id,
          priceSnapshot: '1400.00',
          estimatedDeliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Due in 2 days
          notes: 'Standard collar, single cuff',
          statusLogs: {
            create: [
              { tenantId: tenant.id, toStatus: OrderStatus.PLACED, changedById: owner.id },
              { tenantId: tenant.id, fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.MEASUREMENT_CONFIRMED, changedById: owner.id },
              { tenantId: tenant.id, fromStatus: OrderStatus.MEASUREMENT_CONFIRMED, toStatus: OrderStatus.CUTTING, changedById: primaryStaff.id },
              { tenantId: tenant.id, fromStatus: OrderStatus.CUTTING, toStatus: OrderStatus.STITCHING, changedById: secondaryStaff.id },
            ],
          },
        },
      });
    }

    // Seed/update marketplace storefront data on tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isListedOnMarketplace: true,
        listingStatus: ListingStatus.APPROVED,
        city: 'Mumbai',
        latitude: 18.922,
        longitude: 72.834,
        specialtyTags: ['Bespoke Suits', 'Wedding Sherwanis', 'Handloom Kurtas'],
        coverPhotoUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
        portfolioPhotoUrls: [
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80',
        ],
        workingHours: {
          mon_fri: '10:00 AM - 8:30 PM',
          sat: '10:00 AM - 9:00 PM',
          sun: '11:00 AM - 6:00 PM',
        },
      },
    });

    // Seed a second shop pending review for SuperAdmin moderation
    let pendingShop = await prisma.tenant.findUnique({ where: { slug: 'heritage-khadi-delhi' } });
    if (!pendingShop) {
      pendingShop = await prisma.tenant.create({
        data: {
          name: 'Heritage Khadi & Silk Studio',
          slug: 'heritage-khadi-delhi',
          timezone: 'Asia/Kolkata',
          isListedOnMarketplace: true,
          listingStatus: ListingStatus.PENDING_REVIEW,
          city: 'New Delhi',
          latitude: 28.6139,
          longitude: 77.209,
          specialtyTags: ['Khadi Kurtas', 'Handwoven Bandhgalas', 'Linen Shirts'],
          coverPhotoUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80',
          portfolioPhotoUrls: [
            'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=600&q=80',
          ],
          workingHours: {
            mon_sat: '10:30 AM - 8:00 PM',
            sun: 'Closed',
          },
        },
      });
    }

    // Seed SuperAdmin user
    let superAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          tenantId: null,
          email: 'admin@darzidesk.com',
          passwordHash,
          firstName: 'Karan',
          lastName: 'Singhania (SuperAdmin)',
          role: UserRole.SUPER_ADMIN,
        },
      });
    }

    // Ensure a DELIVERED order exists for Arjun Kapoor so a review can be seeded/tested
    let deliveredOrder = await prisma.order.findFirst({
      where: { tenantId: tenant.id, customerId: sampleCustomer.id, status: OrderStatus.DELIVERED },
    });
    if (!deliveredOrder) {
      deliveredOrder = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          measurementProfileId: sampleProfile.id,
          fabricId: sampleFabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.500',
          status: OrderStatus.DELIVERED,
          priceSnapshot: '3200.00',
        },
      });
    }

    // Seed a verified CustomerReview
    const existingReview = await prisma.customerReview.findUnique({
      where: { orderId: deliveredOrder.id },
    });
    if (!existingReview) {
      await prisma.customerReview.create({
        data: {
          tenantId: tenant.id,
          customerId: sampleCustomer.id,
          orderId: deliveredOrder.id,
          rating: 5,
          comment: 'Exquisite bespoke craftsmanship! The Italian wool shirt fits like a second skin.',
        },
      });
    }

    // Phase 11: Seed Subscription Plans & Tenant Subscriptions
    let basicPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'Basic' } });
    if (!basicPlan) {
      basicPlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Basic',
          priceMonthly: new Prisma.Decimal('1999.00'),
          priceYearly: new Prisma.Decimal('19999.00'),
          maxStaffAccounts: 2,
          maxOrdersPerMonth: 20,
          maxSmsCredits: 50,
          isDefault: true,
          features: ['2 Staff Accounts', '20 Orders/month', '50 SMS Credits', 'Bespoke Measurement Profiles', 'PDF Invoicing'],
        },
      });
    } else {
      basicPlan = await prisma.subscriptionPlan.update({
        where: { id: basicPlan.id },
        data: {
          isDefault: true,
          maxStaffAccounts: 2,
          maxOrdersPerMonth: 20,
          maxSmsCredits: 50,
        },
      });
    }

    let proPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'Pro' } });
    if (!proPlan) {
      proPlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Pro',
          priceMonthly: new Prisma.Decimal('4999.00'),
          priceYearly: new Prisma.Decimal('49999.00'),
          maxStaffAccounts: 10,
          maxOrdersPerMonth: 250,
          maxSmsCredits: 500,
          features: [
            '10 Staff Accounts',
            '250 Orders/month',
            'Marketplace Discovery Listing',
            'SMS & WhatsApp Updates',
            'Inventory Management',
          ],
        },
      });
    }

    let enterprisePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'Enterprise' } });
    if (!enterprisePlan) {
      enterprisePlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Enterprise',
          priceMonthly: new Prisma.Decimal('12999.00'),
          priceYearly: new Prisma.Decimal('129999.00'),
          maxStaffAccounts: 50,
          maxOrdersPerMonth: 2000,
          maxSmsCredits: 2500,
          features: [
            'Unlimited Tailoring Stations',
            'Priority Marketplace Placement',
            'Custom Domain & Branding',
            'Dedicated Account Manager',
          ],
        },
      });
    }

    // Ensure Master Atelier has active Pro subscription
    let masterSub = await prisma.tenantSubscription.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!masterSub) {
      masterSub = await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: proPlan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: SubscriptionBillingCycle.MONTHLY,
          currentPeriodStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        },
      });

      // Record a sample payment for MRR / payment history demonstration
      await prisma.tenantSubscriptionPayment.create({
        data: {
          subscriptionId: masterSub.id,
          tenantId: tenant.id,
          amount: new Prisma.Decimal('4999.00'),
          paymentMethod: SubscriptionPaymentMethod.BANK_TRANSFER,
          referenceNote: 'HDFC NEFT #8839201948 - Q3 Master Atelier Subscription',
          periodStart: masterSub.currentPeriodStart,
          periodEnd: masterSub.currentPeriodEnd,
          recordedByUserId: superAdmin.id,
        },
      });
    }

    // Ensure Pending Delhi shop has a Trial subscription
    if (pendingShop) {
      let pendingSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: pendingShop.id },
      });
      if (!pendingSub) {
        await prisma.tenantSubscription.create({
          data: {
            tenantId: pendingShop.id,
            planId: basicPlan.id,
            status: SubscriptionStatus.TRIAL,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Generate tokens for each user
    const ownerToken = await signStaffToken({
      sub: owner.id,
      tenantId: tenant.id,
      role: owner.role,
    });

    const staffUsersWithTokens = await Promise.all(
      staffMembers.map(async (s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        role: s.role,
        token: await signStaffToken({
          sub: s.id,
          tenantId: tenant.id,
          role: s.role,
        }),
      }))
    );

    const customerToken = await signCustomerToken({
      sub: sampleCustomer.id,
    });

    const adminToken = await signStaffToken({
      sub: superAdmin.id,
      tenantId: null,
      role: UserRole.SUPER_ADMIN,
    });

    res.status(200).json({
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          timezone: tenant.timezone,
        },
        users: [
          {
            id: owner.id,
            name: `${owner.firstName} ${owner.lastName}`,
            email: owner.email,
            role: owner.role,
            token: ownerToken,
          },
          ...staffUsersWithTokens,
          {
            id: sampleCustomer.id,
            name: `${sampleCustomer.firstName} ${sampleCustomer.lastName}`,
            email: sampleCustomer.email ?? sampleCustomer.phone,
            role: 'CUSTOMER',
            token: customerToken,
          },
          {
            id: superAdmin.id,
            name: `${superAdmin.firstName} ${superAdmin.lastName}`,
            email: superAdmin.email,
            role: 'SUPER_ADMIN',
            token: adminToken,
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});
