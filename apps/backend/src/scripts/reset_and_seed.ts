import argon2 from 'argon2';
import {
  PrismaClient,
  UserRole,
  InteractionSource,
  GarmentType,
  OrderStatus,
  ListingStatus,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  PaymentMethod,
  InvoiceStatus,
  FabricStockTransactionType,
  MeasurementUnit,
  FitPreference,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log('🔄 Starting Database Reset and Fresh Workflow Seed...');

  // 1. Clear all existing data in safe dependency order
  console.log('🧹 Clearing existing database tables...');
  await prisma.customerReview.deleteMany();
  await prisma.invoicePayment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderStatusLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.fabricStockTransaction.deleteMany();
  await prisma.fabric.deleteMany();
  await prisma.measurementProfileVersion.deleteMany();
  await prisma.measurementProfile.deleteMany();
  await prisma.garmentTemplate.deleteMany();
  await prisma.shopCustomerLink.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.tenantPricingRule.deleteMany();
  await prisma.tenantSubscriptionPayment.deleteMany();
  await prisma.tenantSubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('✅ All tables cleared.');

  // Default shared password for all seed accounts
  const passwordHash = await argon2.hash('Password123!');

  // 2. Seed Platform Subscription Plans
  console.log('📦 Seeding Subscription Plans...');
  await prisma.subscriptionPlan.create({
    data: {
      name: 'Basic',
      priceMonthly: new Prisma.Decimal('1999.00'),
      priceYearly: new Prisma.Decimal('19999.00'),
      maxStaffAccounts: 2,
      maxOrdersPerMonth: 30,
      maxSmsCredits: 100,
      isDefault: true,
      features: [
        'Up to 2 Staff Accounts',
        '30 Orders / month',
        'Digital Measurement Book',
        'Fabric Inventory Ledger',
        'Standard PDF Invoices',
      ],
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Pro',
      priceMonthly: new Prisma.Decimal('4999.00'),
      priceYearly: new Prisma.Decimal('49999.00'),
      maxStaffAccounts: 10,
      maxOrdersPerMonth: 250,
      maxSmsCredits: 500,
      isDefault: false,
      features: [
        'Up to 10 Staff Accounts',
        '250 Orders / month',
        'Full Fabric Roll & Scrap Tracking',
        'Marketplace Discovery & Public Storefront',
        'Customer Portal with Self-Tracking',
        'Automated SMS & WhatsApp Alerts',
        'GST Compliant PDF Invoicing',
      ],
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: 'Enterprise',
      priceMonthly: new Prisma.Decimal('12999.00'),
      priceYearly: new Prisma.Decimal('129999.00'),
      maxStaffAccounts: 50,
      maxOrdersPerMonth: 2000,
      maxSmsCredits: 2500,
      isDefault: false,
      features: [
        'Unlimited Tailoring Stations',
        'Multi-Branch Inventory Sync',
        'Priority Marketplace Promotion',
        'Dedicated Success Manager',
      ],
    },
  });

  // 3. Create Fresh Tailor Shop: Shree Ganesh Bespoke Tailors (Surat)
  console.log('🏪 Creating Shop: Shree Ganesh Bespoke Tailors...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Shree Ganesh Bespoke Tailors',
      slug: 'shree-ganesh-tailors',
      timezone: 'Asia/Kolkata',
      taxRatePercent: new Prisma.Decimal('5.00'), // 5% GST for tailoring
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      allowsSelfMeasurement: true,
      isListedOnMarketplace: true,
      listingStatus: ListingStatus.APPROVED,
      city: 'Surat',
      latitude: 21.1702,
      longitude: 72.8311,
      specialtyTags: ['Bespoke Suits', 'Wedding Sherwanis', 'Handloom Kurtas', 'Formal Shirts'],
      coverPhotoUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
      portfolioPhotoUrls: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80',
      ],
      workingHours: {
        mon_sat: '10:00 AM - 9:00 PM',
        sun: '11:00 AM - 6:00 PM',
      },
    },
  });

  // 4. Attach Active Pro Subscription to Shop
  const tenantSub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      currentPeriodStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Create Tailor Shop Pricing Rules
  await prisma.tenantPricingRule.createMany({
    data: [
      { tenantId: tenant.id, garmentType: GarmentType.SHIRT, stitchingCharge: new Prisma.Decimal('650.00') },
      { tenantId: tenant.id, garmentType: GarmentType.PANT, stitchingCharge: new Prisma.Decimal('750.00') },
      { tenantId: tenant.id, garmentType: GarmentType.KURTA, stitchingCharge: new Prisma.Decimal('950.00') },
      { tenantId: tenant.id, garmentType: GarmentType.CUSTOM, stitchingCharge: new Prisma.Decimal('4500.00') }, // Suit/Sherwani
    ],
  });

  // 6. Create Staff Accounts with Realistic Tailor Shop Roles
  console.log('👥 Creating Shop Owner and Staff Accounts...');
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@shreeganesh.com',
      passwordHash,
      firstName: 'Ramesh',
      lastName: 'Patel',
      role: UserRole.SHOP_OWNER,
    },
  });

  const staffCutter = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'karan.cutter@shreeganesh.com',
      passwordHash,
      firstName: 'Karan',
      lastName: 'Sharma (Master Cutter & Measurer)',
      role: UserRole.STAFF,
    },
  });

  const staffStitcher = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'suresh.tailor@shreeganesh.com',
      passwordHash,
      firstName: 'Suresh',
      lastName: 'Mistry (Senior Stitching Artisan)',
      role: UserRole.STAFF,
    },
  });

  const staffSales = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'priya.sales@shreeganesh.com',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Dave (Store & Fabric Consultant)',
      role: UserRole.STAFF,
    },
  });

  // SuperAdmin User
  const superAdmin = await prisma.user.create({
    data: {
      tenantId: null,
      email: 'admin@darzidesk.com',
      passwordHash,
      firstName: 'Karan',
      lastName: 'Singhania',
      role: UserRole.SUPER_ADMIN,
    },
  });

  // Record subscription payment
  await prisma.tenantSubscriptionPayment.create({
    data: {
      subscriptionId: tenantSub.id,
      tenantId: tenant.id,
      amount: new Prisma.Decimal('4999.00'),
      paymentMethod: SubscriptionPaymentMethod.UPI,
      referenceNote: 'UPI/HDFC/502910482930 - Monthly Pro Plan',
      periodStart: tenantSub.currentPeriodStart,
      periodEnd: tenantSub.currentPeriodEnd,
      recordedByUserId: superAdmin.id,
    },
  });

  // 7. Seed Fabric (Kapad) Inventory
  console.log('🧵 Seeding Fabric (Kapad) Inventory...');
  const fabricWool = await prisma.fabric.create({
    data: {
      tenantId: tenant.id,
      name: 'Italian Super 140s Wool',
      color: 'Midnight Navy',
      type: 'Wool',
      pricePerMeter: new Prisma.Decimal('3800.00'),
      availableMeters: new Prisma.Decimal('45.000'),
      reservedMeters: new Prisma.Decimal('6.700'),
      lowStockThreshold: new Prisma.Decimal('10.000'),
      supplierName: 'Raymond Mill Store, Surat',
      purchaseNotes: 'Imported batch A-49, 100% merino virgin wool',
    },
  });

  const fabricSilk = await prisma.fabric.create({
    data: {
      tenantId: tenant.id,
      name: 'Pure Banarasi Silk Brocade',
      color: 'Antique Gold & Crimson',
      type: 'Silk',
      pricePerMeter: new Prisma.Decimal('2950.00'),
      availableMeters: new Prisma.Decimal('28.000'),
      reservedMeters: new Prisma.Decimal('4.000'),
      lowStockThreshold: new Prisma.Decimal('8.000'),
      supplierName: 'Varanasi Weavers Guild',
      purchaseNotes: 'Zari floral weave for wedding collection',
    },
  });

  const fabricCotton = await prisma.fabric.create({
    data: {
      tenantId: tenant.id,
      name: 'Egyptian Giza Cotton (60s)',
      color: 'Sky Blue & White Micro-Stripe',
      type: 'Cotton',
      pricePerMeter: new Prisma.Decimal('1200.00'),
      availableMeters: new Prisma.Decimal('62.500'),
      reservedMeters: new Prisma.Decimal('2.500'),
      lowStockThreshold: new Prisma.Decimal('15.000'),
      supplierName: 'Arvind Mills Distributor',
      purchaseNotes: 'Long staple luxury cotton, breathable satin finish',
    },
  });

  const fabricLinen = await prisma.fabric.create({
    data: {
      tenantId: tenant.id,
      name: 'Irish Handloom Linen',
      color: 'Natural Olive Green',
      type: 'Linen',
      pricePerMeter: new Prisma.Decimal('1650.00'),
      availableMeters: new Prisma.Decimal('38.200'),
      reservedMeters: new Prisma.Decimal('1.800'),
      lowStockThreshold: new Prisma.Decimal('10.000'),
      supplierName: 'Kochi Import House',
      purchaseNotes: 'Pre-washed pure flax yarn',
    },
  });

  const fabricCashmere = await prisma.fabric.create({
    data: {
      tenantId: tenant.id,
      name: 'Loro Piana Cashmere Blend',
      color: 'Charcoal Black',
      type: 'Cashmere',
      pricePerMeter: new Prisma.Decimal('4900.00'),
      availableMeters: new Prisma.Decimal('7.500'),
      reservedMeters: new Prisma.Decimal('0.000'),
      lowStockThreshold: new Prisma.Decimal('10.000'), // Low stock alert!
      supplierName: 'Milan Textiles Bombay',
      purchaseNotes: 'Ultra luxury suiting fabric, strictly limited quantity',
    },
  });

  // Log initial purchase transactions for fabrics
  await prisma.fabricStockTransaction.createMany({
    data: [
      {
        tenantId: tenant.id,
        fabricId: fabricWool.id,
        type: FabricStockTransactionType.PURCHASE,
        meters: new Prisma.Decimal('51.700'),
        note: 'New seasonal roll inward',
        createdById: owner.id,
      },
      {
        tenantId: tenant.id,
        fabricId: fabricSilk.id,
        type: FabricStockTransactionType.PURCHASE,
        meters: new Prisma.Decimal('32.000'),
        note: 'Wedding season stock inward',
        createdById: owner.id,
      },
      {
        tenantId: tenant.id,
        fabricId: fabricCotton.id,
        type: FabricStockTransactionType.PURCHASE,
        meters: new Prisma.Decimal('65.000'),
        note: 'Daily formal shirting stock',
        createdById: owner.id,
      },
      {
        tenantId: tenant.id,
        fabricId: fabricLinen.id,
        type: FabricStockTransactionType.PURCHASE,
        meters: new Prisma.Decimal('40.000'),
        note: 'Casual bespoke linen stock',
        createdById: owner.id,
      },
      {
        tenantId: tenant.id,
        fabricId: fabricCashmere.id,
        type: FabricStockTransactionType.PURCHASE,
        meters: new Prisma.Decimal('7.500'),
        note: 'Exclusive premium sample piece',
        createdById: owner.id,
      },
    ],
  });

  // 8. Seed Customers (including self-service portal access)
  console.log('👤 Creating Customer Accounts...');
  const customerAmit = await prisma.customer.create({
    data: {
      firstName: 'Amit',
      lastName: 'Verma',
      phone: '+919876543210',
      email: 'amit.verma@example.com',
      passwordHash, // Can log into customer portal
    },
  });

  const customerRajesh = await prisma.customer.create({
    data: {
      firstName: 'Rajesh',
      lastName: 'Mehta',
      phone: '+919822012345',
      email: 'rajesh.mehta@example.com',
      passwordHash,
    },
  });

  const customerVikram = await prisma.customer.create({
    data: {
      firstName: 'Vikramaditya',
      lastName: 'Roy',
      phone: '+919811098765',
      email: 'vikram.roy@example.com',
      passwordHash,
    },
  });

  // Link customers to shop
  await prisma.shopCustomerLink.createMany({
    data: [
      { tenantId: tenant.id, customerId: customerAmit.id, firstInteractionSource: InteractionSource.WALK_IN },
      { tenantId: tenant.id, customerId: customerRajesh.id, firstInteractionSource: InteractionSource.MARKETPLACE },
      { tenantId: tenant.id, customerId: customerVikram.id, firstInteractionSource: InteractionSource.DIRECT },
    ],
  });

  // 9. Seed Measurement Profiles & Specific Measurements
  console.log('📐 Creating Measurement Profiles by Master Tailor...');
  const profileAmitShirt = await prisma.measurementProfile.create({
    data: {
      tenantId: tenant.id,
      customerId: customerAmit.id,
      name: 'Amit - Slim Fit Shirt',
      garmentType: GarmentType.SHIRT,
      notes: 'Customer prefers stiff French collar and snug cuff fit',
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          isCurrent: true,
          unit: MeasurementUnit.INCHES,
          fitPreference: FitPreference.SLIM,
          fitNotes: 'Slim tapered waist, shoulder seam aligned with acromion',
          createdById: staffCutter.id,
          values: {
            collarNeck: 16.0,
            chest: 40.0,
            waist: 34.5,
            shoulderWidth: 18.5,
            sleeveLength: 25.5,
            cuffRound: 9.0,
            shirtLength: 29.5,
            armHole: 19.0,
          },
        },
      },
    },
  });

  const profileRajeshSuit = await prisma.measurementProfile.create({
    data: {
      tenantId: tenant.id,
      customerId: customerRajesh.id,
      name: 'Rajesh - Bespoke 3-Piece Suit',
      garmentType: GarmentType.CUSTOM,
      notes: 'Double-breasted vest, single button Italian peak lapel jacket',
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          isCurrent: true,
          unit: MeasurementUnit.INCHES,
          fitPreference: FitPreference.REGULAR,
          fitNotes: 'Comfortable chest drape, mild waist suppress',
          createdById: staffCutter.id,
          values: {
            chest: 43.0,
            waist: 37.0,
            shoulderWidth: 19.5,
            jacketLength: 31.0,
            sleeveLength: 26.0,
            trouserWaist: 36.0,
            trouserInseam: 32.0,
            trouserOutseam: 42.5,
            trouserThigh: 24.5,
            trouserBottomRound: 15.5,
          },
        },
      },
    },
  });

  const profileVikramKurta = await prisma.measurementProfile.create({
    data: {
      tenantId: tenant.id,
      customerId: customerVikram.id,
      name: 'Vikram - Royal Sherwani & Kurta',
      garmentType: GarmentType.KURTA,
      notes: 'Bandhgala high collar, ornate brass buttons',
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          isCurrent: true,
          unit: MeasurementUnit.INCHES,
          fitPreference: FitPreference.REGULAR,
          createdById: staffCutter.id,
          values: {
            collarNeck: 16.5,
            chest: 41.5,
            waist: 35.0,
            shoulderWidth: 19.0,
            sleeveLength: 25.5,
            kurtaLength: 42.0,
            churidarLength: 48.0,
          },
        },
      },
    },
  });

  // 10. Seed Realistic End-to-End Workflow Orders (Each testing a distinct phase)
  console.log('📋 Creating Step-by-Step Workflow Orders for Testing...');

  // -------------------------------------------------------------------------
  // ORDER 1: Customer buys Kapad (Fabric) -> Waiting for Tailor Measurement
  // -------------------------------------------------------------------------
  const order1 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerAmit.id,
      fabricId: fabricCotton.id,
      measurementProfileId: profileAmitShirt.id,
      garmentType: GarmentType.SHIRT,
      metersUsed: new Prisma.Decimal('2.500'),
      status: OrderStatus.PLACED,
      priceSnapshot: new Prisma.Decimal('3650.00'), // Fabric (2.5m * 1200 = 3000) + Stitching (650)
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: 'Customer bought 2.5m Egyptian Giza Cotton cloth today. Appointment booked for final body measurement check tomorrow morning.',
      statusLogs: {
        create: [
          {
            tenantId: tenant.id,
            toStatus: OrderStatus.PLACED,
            changedById: staffSales.id,
            note: 'Fabric sold & order booked at front desk by Priya. Awaiting Master Tailor measurement session.',
          },
        ],
      },
    },
  });

  // Record Fabric Reservation in Ledger for Order 1
  await prisma.fabricStockTransaction.create({
    data: {
      tenantId: tenant.id,
      fabricId: fabricCotton.id,
      type: FabricStockTransactionType.RESERVE,
      meters: new Prisma.Decimal('2.500'),
      relatedOrderId: order1.id,
      note: 'Reserved 2.5m for Amit Verma order (Order #1)',
      createdById: staffSales.id,
    },
  });

  // -------------------------------------------------------------------------
  // ORDER 2: Measurement Taken by Tailor -> MEASUREMENT_CONFIRMED -> Ready for Cutting
  // -------------------------------------------------------------------------
  const order2 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerVikram.id,
      fabricId: fabricSilk.id,
      measurementProfileId: profileVikramKurta.id,
      garmentType: GarmentType.KURTA,
      metersUsed: new Prisma.Decimal('4.000'),
      status: OrderStatus.MEASUREMENT_CONFIRMED,
      priceSnapshot: new Prisma.Decimal('12750.00'), // 4m Silk (11,800) + Kurta crafting (950)
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Body measurement recorded by Master Karan. Pattern drafted. Ready to start cutting.',
      statusLogs: {
        create: [
          {
            tenantId: tenant.id,
            toStatus: OrderStatus.PLACED,
            changedById: staffSales.id,
            note: 'Order initiated with Banarasi Silk Brocade.',
          },
          {
            tenantId: tenant.id,
            fromStatus: OrderStatus.PLACED,
            toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
            changedById: staffCutter.id,
            note: 'Master Karan completed live customer measurement. Measurement profile confirmed.',
          },
        ],
      },
    },
  });

  await prisma.fabricStockTransaction.create({
    data: {
      tenantId: tenant.id,
      fabricId: fabricSilk.id,
      type: FabricStockTransactionType.RESERVE,
      meters: new Prisma.Decimal('4.000'),
      relatedOrderId: order2.id,
      note: 'Reserved 4.0m Pure Silk Brocade for Vikramaditya Roy',
      createdById: staffCutter.id,
    },
  });

  // -------------------------------------------------------------------------
  // ORDER 3: CUTTING in progress by Master Cutter Karan
  // -------------------------------------------------------------------------
  const order3 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerRajesh.id,
      fabricId: fabricWool.id,
      measurementProfileId: profileRajeshSuit.id,
      garmentType: GarmentType.CUSTOM,
      metersUsed: new Prisma.Decimal('3.500'),
      status: OrderStatus.CUTTING,
      assignedStaffId: staffCutter.id,
      priceSnapshot: new Prisma.Decimal('17800.00'), // 3.5m Wool (13,300) + Bespoke tailoring (4,500)
      estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      notes: 'Master Karan chalking canvas and cutting Italian Wool for peak lapel suit.',
      statusLogs: {
        create: [
          {
            tenantId: tenant.id,
            toStatus: OrderStatus.PLACED,
            changedById: owner.id,
          },
          {
            tenantId: tenant.id,
            fromStatus: OrderStatus.PLACED,
            toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
            changedById: staffCutter.id,
          },
          {
            tenantId: tenant.id,
            fromStatus: OrderStatus.MEASUREMENT_CONFIRMED,
            toStatus: OrderStatus.CUTTING,
            changedById: staffCutter.id,
            note: 'Karan began cutting pieces on the master table.',
          },
        ],
      },
    },
  });

  await prisma.fabricStockTransaction.create({
    data: {
      tenantId: tenant.id,
      fabricId: fabricWool.id,
      type: FabricStockTransactionType.CONSUME,
      meters: new Prisma.Decimal('3.500'),
      relatedOrderId: order3.id,
      note: 'Consumed 3.5m wool during cutting stage',
      createdById: staffCutter.id,
    },
  });

  // -------------------------------------------------------------------------
  // ORDER 4: STITCHING in progress by Senior Artisan Suresh
  // -------------------------------------------------------------------------
  await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerAmit.id,
      fabricId: fabricLinen.id,
      measurementProfileId: profileAmitShirt.id,
      garmentType: GarmentType.SHIRT,
      metersUsed: new Prisma.Decimal('1.800'),
      status: OrderStatus.STITCHING,
      assignedStaffId: staffStitcher.id,
      priceSnapshot: new Prisma.Decimal('3620.00'), // 1.8m Linen (2,970) + Stitching (650)
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Irish Linen cut pieces handed over to Suresh. Stitching buttonholes and collar inner canvas.',
      statusLogs: {
        create: [
          { tenantId: tenant.id, toStatus: OrderStatus.PLACED, changedById: staffSales.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.MEASUREMENT_CONFIRMED, changedById: staffCutter.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.MEASUREMENT_CONFIRMED, toStatus: OrderStatus.CUTTING, changedById: staffCutter.id },
          {
            tenantId: tenant.id,
            fromStatus: OrderStatus.CUTTING,
            toStatus: OrderStatus.STITCHING,
            changedById: staffStitcher.id,
            note: 'Suresh took over stitched assembly and cuff attachment.',
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // ORDER 5: READY FOR TRIAL / DELIVERY with Invoice Generated
  // -------------------------------------------------------------------------
  const order5 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerRajesh.id,
      fabricId: fabricWool.id,
      measurementProfileId: profileRajeshSuit.id,
      garmentType: GarmentType.CUSTOM,
      metersUsed: new Prisma.Decimal('3.200'),
      status: OrderStatus.READY,
      assignedStaffId: staffStitcher.id,
      priceSnapshot: new Prisma.Decimal('16660.00'), // 3.2m Wool (12,160) + Custom Suit (4,500)
      estimatedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notes: 'Pressing & iron finished. Garment hung in trial room #1. Customer notified via SMS.',
      statusLogs: {
        create: [
          { tenantId: tenant.id, toStatus: OrderStatus.PLACED, changedById: owner.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.MEASUREMENT_CONFIRMED, changedById: staffCutter.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.MEASUREMENT_CONFIRMED, toStatus: OrderStatus.CUTTING, changedById: staffCutter.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.CUTTING, toStatus: OrderStatus.STITCHING, changedById: staffStitcher.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.STITCHING, toStatus: OrderStatus.QUALITY_CHECK, changedById: owner.id },
          {
            tenantId: tenant.id,
            fromStatus: OrderStatus.QUALITY_CHECK,
            toStatus: OrderStatus.READY,
            changedById: owner.id,
            note: 'Final inspection passed. Hanging on trial stand.',
          },
        ],
      },
    },
  });

  // Generate Invoice for Order 5
  const invoice5 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      orderId: order5.id,
      customerId: customerRajesh.id,
      invoiceNumber: 'INV-SG-1001',
      fabricCost: new Prisma.Decimal('12160.00'),
      stitchingCharge: new Prisma.Decimal('4500.00'),
      urgentSurcharge: new Prisma.Decimal('0.00'),
      taxRatePercent: new Prisma.Decimal('5.00'),
      taxAmount: new Prisma.Decimal('833.00'),
      totalAmount: new Prisma.Decimal('17493.00'),
      advancePaid: new Prisma.Decimal('7000.00'),
      balanceDue: new Prisma.Decimal('10493.00'),
      status: InvoiceStatus.PARTIALLY_PAID,
      notes: 'Advance ₹7,000 paid via UPI at booking. Balance ₹10,493 payable upon fitting delivery.',
    },
  });

  // Record advance payment
  await prisma.invoicePayment.create({
    data: {
      tenantId: tenant.id,
      invoiceId: invoice5.id,
      amount: new Prisma.Decimal('7000.00'),
      paymentMethod: PaymentMethod.UPI_MANUAL,
      reference: 'UPI/HDFC/992810382910',
      notes: 'Advance booking payment',
      recordedById: staffSales.id,
    },
  });

  // -------------------------------------------------------------------------
  // ORDER 6: DELIVERED & Fully Paid with Customer Review
  // -------------------------------------------------------------------------
  const order6 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customerVikram.id,
      fabricId: fabricCotton.id,
      measurementProfileId: profileVikramKurta.id,
      garmentType: GarmentType.SHIRT,
      metersUsed: new Prisma.Decimal('2.200'),
      status: OrderStatus.DELIVERED,
      assignedStaffId: staffStitcher.id,
      priceSnapshot: new Prisma.Decimal('3290.00'),
      notes: 'Delivered in premium DarziDesk garment cover. Customer delighted with shoulder fit.',
      statusLogs: {
        create: [
          { tenantId: tenant.id, toStatus: OrderStatus.PLACED, changedById: owner.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.MEASUREMENT_CONFIRMED, changedById: staffCutter.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.MEASUREMENT_CONFIRMED, toStatus: OrderStatus.CUTTING, changedById: staffCutter.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.CUTTING, toStatus: OrderStatus.STITCHING, changedById: staffStitcher.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.STITCHING, toStatus: OrderStatus.READY, changedById: staffStitcher.id },
          { tenantId: tenant.id, fromStatus: OrderStatus.READY, toStatus: OrderStatus.DELIVERED, changedById: staffSales.id },
        ],
      },
    },
  });

  const invoice6 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      orderId: order6.id,
      customerId: customerVikram.id,
      invoiceNumber: 'INV-SG-1000',
      fabricCost: new Prisma.Decimal('2640.00'),
      stitchingCharge: new Prisma.Decimal('650.00'),
      urgentSurcharge: new Prisma.Decimal('0.00'),
      taxRatePercent: new Prisma.Decimal('5.00'),
      taxAmount: new Prisma.Decimal('164.50'),
      totalAmount: new Prisma.Decimal('3454.50'),
      advancePaid: new Prisma.Decimal('3454.50'),
      balanceDue: new Prisma.Decimal('0.00'),
      status: InvoiceStatus.PAID,
      notes: 'Paid in full via GPay UPI on delivery.',
    },
  });

  await prisma.invoicePayment.create({
    data: {
      tenantId: tenant.id,
      invoiceId: invoice6.id,
      amount: new Prisma.Decimal('3454.50'),
      paymentMethod: PaymentMethod.UPI_MANUAL,
      reference: 'UPI/GPAY/8849201948',
      recordedById: staffSales.id,
    },
  });

  await prisma.customerReview.create({
    data: {
      tenantId: tenant.id,
      customerId: customerVikram.id,
      orderId: order6.id,
      rating: 5,
      comment: 'Superb fitting and exceptional cotton fabric quality! Master Karan took very precise measurements.',
    },
  });

  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('🏪 Shop: Shree Ganesh Bespoke Tailors');
  console.log('   Slug: shree-ganesh-tailors');
  console.log('   City: Surat');
  console.log('------------------------------------------------------');
  console.log('🔑 ACCOUNTS CREATED:');
  console.log('   1. SHOP OWNER:');
  console.log('      Email:    owner@shreeganesh.com');
  console.log('      Password: Password123!');
  console.log('      Name:     Ramesh Patel (Owner & Master Tailor)');
  console.log('');
  console.log('   2. STAFF 1 (Master Cutter & Measurer):');
  console.log('      Email:    karan.cutter@shreeganesh.com');
  console.log('      Password: Password123!');
  console.log('      Name:     Karan Sharma (Takes measurements, cutting)');
  console.log('');
  console.log('   3. STAFF 2 (Senior Stitching Artisan):');
  console.log('      Email:    suresh.tailor@shreeganesh.com');
  console.log('      Password: Password123!');
  console.log('      Name:     Suresh Mistry (Stitching specialist)');
  console.log('');
  console.log('   4. STAFF 3 (Front Desk & Fabric Consultant):');
  console.log('      Email:    priya.sales@shreeganesh.com');
  console.log('      Password: Password123!');
  console.log('      Name:     Priya Dave (Kapad sales & billing)');
  console.log('');
  console.log('   5. CUSTOMER (Portal User):');
  console.log('      Phone:    +919876543210');
  console.log('      Email:    amit.verma@example.com');
  console.log('      Password: Password123!');
  console.log('      Name:     Amit Verma');
  console.log('');
  console.log('   6. SUPER ADMIN:');
  console.log('      Email:    admin@darzidesk.com');
  console.log('      Password: Password123!');
  console.log('------------------------------------------------------');
  console.log('🔄 WORKFLOW ORDERS READY FOR TESTING:');
  console.log('   Order #1 (PLACED)               : Amit Verma - 2.5m Giza Cotton BOUGHT -> WAITING FOR TAILOR MEASUREMENT');
  console.log('   Order #2 (MEASUREMENT_CONFIRMED): Vikramaditya Roy - 4.0m Silk Brocade -> MEASURED BY MASTER -> READY FOR CUTTING');
  console.log('   Order #3 (CUTTING)              : Rajesh Mehta - 3.5m Italian Wool -> ASSIGNED TO KARAN (CUTTER)');
  console.log('   Order #4 (STITCHING)            : Amit Verma - 1.8m Irish Linen -> ASSIGNED TO SURESH (STITCHER)');
  console.log('   Order #5 (READY)                : Rajesh Mehta - Bespoke Wool Suit -> READY FOR TRIAL & FINAL PAYMENT');
  console.log('   Order #6 (DELIVERED)            : Vikramaditya Roy - Royal Cotton Shirt -> DELIVERED & PAID');
  console.log('======================================================\n');
}

resetAndSeed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
