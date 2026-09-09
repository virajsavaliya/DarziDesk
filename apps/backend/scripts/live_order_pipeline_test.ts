/**
 * Standalone Live Test: Order State Machine & Fabric Ledger Integrity
 *
 * Runs against the ACTUALLY RUNNING dev server at http://localhost:3001.
 * Connects directly to the dev database (PostgreSQL) to print actual query results
 * proving:
 *
 * 1. INVALID TRANSITION REJECTED:
 *    Create an order (PLACED). Attempt invalid transition directly to READY.
 *    Proves rejection HTTP status/body and confirms order status in DB remains PLACED.
 *
 * 2. CUTTING CONSUMES FABRIC WITH TRACEABLE LEDGER LINK:
 *    Advance order PLACED -> MEASUREMENT_CONFIRMED -> CUTTING.
 *    Proves CONSUME transaction in FabricStockTransaction with relatedOrderId linked,
 *    and fabric reservedMeters decreased.
 *
 * 3. CANCELLED AFTER CUTTING DOES NOT RELEASE FABRIC:
 *    Transition order from CUTTING to CANCELLED.
 *    Proves availableMeters remains UNCHANGED and NO RELEASE ledger row is created.
 *
 * 4. CROSS-TENANT ORDER ISOLATION:
 *    Create Shop B order. Using Shop A's JWT:
 *    (a) Attempt GET /api/orders/:orderBId
 *    (b) Attempt POST /api/orders/:orderBId/transition
 *    Proves both rejected (404/403) and Shop B's order in DB is untouched.
 */

import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://darzi:darzi_secret@localhost:5432/darzi_desk_dev';

const prisma = new PrismaClient({
  datasources: {
    db: { url: DB_URL },
  },
});

interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

async function req<T = any>(
  method: string,
  path: string,
  body?: Record<string, any>,
  token?: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as any;
  return {
    status: res.status,
    data: json?.data,
    error: json?.error,
  };
}

const rand = () => Math.random().toString(36).substring(2, 8);

async function runLiveTest() {
  console.log('================================================================================');
  console.log('       DARZIDESK LIVE TEST: ORDER STATE MACHINE & FABRIC LEDGER INTEGRITY       ');
  console.log(`       Target Server: ${BASE_URL}                                              `);
  console.log(`       Target DB:     ${DB_URL}                                                `);
  console.log('================================================================================\n');

  let passedChecks = 0;
  const totalChecks = 4;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Tenant A & Prerequisites
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning Tenant A (Shop A)...');
    const slugA = `live-shop-a-${rand()}`;
    const regA = await req('POST', '/api/auth/register/tenant', {
      shopName: 'Live Shop A',
      slug: slugA,
      ownerEmail: `owner-${rand()}@shopa.com`,
      ownerPassword: 'Password123!',
      firstName: 'Owner',
      lastName: 'A',
    });
    if (!regA.data?.token) {
      throw new Error(`Failed to register Shop A: ${JSON.stringify(regA)}`);
    }
    const tokenA = regA.data.token;
    const shopAId = regA.data.user.tenantId;
    console.log(`  -> Shop A created (ID: ${shopAId})`);

    // Create walk-in customer in Shop A
    const custA = await req(
      'POST',
      '/api/customers',
      {
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      tokenA,
    );
    if (!custA.data?.id) {
      throw new Error(`Failed to create walk-in customer: ${JSON.stringify(custA)}`);
    }
    const customerAId = custA.data.id;
    console.log(`  -> Customer created (ID: ${customerAId})`);

    // Create measurement profile in Shop A
    const profileA = await req(
      'POST',
      `/api/customers/${customerAId}/measurements`,
      {
        name: 'Regular Formal Shirt',
        garmentType: 'SHIRT',
        values: {
          chest: 40.5,
          waist: 34.0,
          shoulder: 18.0,
          length: 30.0,
        },
      },
      tokenA,
    );
    if (!profileA.data?.id) {
      throw new Error(`Failed to create measurement profile: ${JSON.stringify(profileA)}`);
    }
    const profileAId = profileA.data.id;
    console.log(`  -> Measurement Profile created (ID: ${profileAId})`);

    // Create Fabric in Shop A with 20.000m
    const fabricA = await req(
      'POST',
      '/api/fabrics',
      {
        name: 'Superfine Italian Linen',
        color: 'Navy Blue',
        type: 'Linen',
        pricePerMeter: '1200.00',
        initialMeters: '20.000',
        lowStockThreshold: '3.000',
      },
      tokenA,
    );
    if (!fabricA.data?.id) {
      throw new Error(`Failed to create fabric: ${JSON.stringify(fabricA)}`);
    }
    const fabricAId = fabricA.data.id;
    console.log(`  -> Fabric created (ID: ${fabricAId}, Available: 20.000m, Reserved: 0.000m)\n`);

    // =========================================================================
    // CHECK 1: INVALID TRANSITION REJECTED
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('CHECK 1: INVALID TRANSITION REJECTED (PLACED -> READY)');
    console.log('--------------------------------------------------------------------------------');

    // Create Order 1 in status PLACED
    const order1Res = await req(
      'POST',
      '/api/orders',
      {
        customerId: customerAId,
        measurementProfileId: profileAId,
        fabricId: fabricAId,
        garmentType: 'SHIRT',
        metersUsed: '2.500',
        notes: 'Check 1 test order',
      },
      tokenA,
    );
    if (!order1Res.data?.id) {
      throw new Error(`Failed to create Order 1: ${JSON.stringify(order1Res)}`);
    }
    const order1Id = order1Res.data.id;
    console.log(`Created Order 1 (ID: ${order1Id}, Initial status: ${order1Res.data.status})`);

    // Attempt invalid transition directly to READY
    console.log(`Sending POST /api/orders/${order1Id}/transition with { toStatus: 'READY' }...`);
    const invalidTransRes = await req(
      'POST',
      `/api/orders/${order1Id}/transition`,
      { toStatus: 'READY', note: 'Attempting invalid jump' },
      tokenA,
    );

    console.log(`HTTP Status: ${invalidTransRes.status}`);
    console.log(`HTTP Response Body:`, JSON.stringify(invalidTransRes.error || invalidTransRes.data, null, 2));

    // Direct Database Query on Order 1
    const order1Db = await prisma.order.findUnique({
      where: { id: order1Id },
      select: {
        id: true,
        status: true,
        tenantId: true,
        metersUsed: true,
        priceSnapshot: true,
        updatedAt: true,
      },
    });

    console.log('\n[Direct DB Query Result] Table "orders":');
    console.table(
      order1Db
        ? [
            {
              id: order1Db.id,
              tenantId: order1Db.tenantId,
              status: order1Db.status,
              metersUsed: order1Db.metersUsed.toString(),
              priceSnapshot: order1Db.priceSnapshot.toString(),
              updatedAt: order1Db.updatedAt.toISOString(),
            },
          ]
        : [],
    );

    const check1Pass =
      (invalidTransRes.status === 422 || invalidTransRes.status === 400) &&
      invalidTransRes.error?.code === 'VALIDATION_ERROR' &&
      order1Db?.status === 'PLACED';

    if (check1Pass) {
      console.log(`>>> RESULT: PASS — Invalid transition was rejected with HTTP ${invalidTransRes.status} (${invalidTransRes.error?.code})`);
      console.log('    and order status in database remained strictly PLACED.\n');
      passedChecks++;
    } else {
      console.error('>>> RESULT: FAIL — Invalid transition was not rejected properly or order status changed in DB.\n');
    }

    // =========================================================================
    // CHECK 2: CUTTING CONSUMES FABRIC WITH TRACEABLE LEDGER LINK
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('CHECK 2: CUTTING CONSUMES FABRIC WITH TRACEABLE LEDGER LINK');
    console.log('--------------------------------------------------------------------------------');

    // Create Order 2 requiring 3.500m
    const order2Res = await req(
      'POST',
      '/api/orders',
      {
        customerId: customerAId,
        measurementProfileId: profileAId,
        fabricId: fabricAId,
        garmentType: 'SHIRT',
        metersUsed: '3.500',
        notes: 'Check 2 & 3 test order',
      },
      tokenA,
    );
    if (!order2Res.data?.id) {
      throw new Error(`Failed to create Order 2: ${JSON.stringify(order2Res)}`);
    }
    const order2Id = order2Res.data.id;
    console.log(`Created Order 2 (ID: ${order2Id}, status: PLACED, meters: 3.500m)`);

    // Query Fabric before CUTTING transition
    const fabricBeforeCutting = await prisma.fabric.findUnique({
      where: { id: fabricAId },
      select: {
        id: true,
        name: true,
        availableMeters: true,
        reservedMeters: true,
      },
    });
    console.log('\n[Direct DB Query Result] Fabric BEFORE CUTTING:');
    console.table([
      {
        id: fabricBeforeCutting?.id,
        name: fabricBeforeCutting?.name,
        availableMeters: fabricBeforeCutting?.availableMeters.toString(),
        reservedMeters: fabricBeforeCutting?.reservedMeters.toString(),
      },
    ]);

    // Advance Order 2: PLACED -> MEASUREMENT_CONFIRMED
    console.log(`Transitioning Order 2 -> MEASUREMENT_CONFIRMED...`);
    const confRes = await req(
      'POST',
      `/api/orders/${order2Id}/transition`,
      { toStatus: 'MEASUREMENT_CONFIRMED' },
      tokenA,
    );
    console.log(`  HTTP Status: ${confRes.status}, Order status: ${confRes.data?.status}`);

    // Advance Order 2: MEASUREMENT_CONFIRMED -> CUTTING
    console.log(`Transitioning Order 2 -> CUTTING...`);
    const cuttingRes = await req(
      'POST',
      `/api/orders/${order2Id}/transition`,
      { toStatus: 'CUTTING', note: 'Tailor began cutting cloth' },
      tokenA,
    );
    console.log(`  HTTP Status: ${cuttingRes.status}, Order status: ${cuttingRes.data?.status}`);

    // Query Fabric after CUTTING transition
    const fabricAfterCutting = await prisma.fabric.findUnique({
      where: { id: fabricAId },
      select: {
        id: true,
        name: true,
        availableMeters: true,
        reservedMeters: true,
      },
    });
    console.log('\n[Direct DB Query Result] Fabric AFTER CUTTING:');
    console.table([
      {
        id: fabricAfterCutting?.id,
        name: fabricAfterCutting?.name,
        availableMeters: fabricAfterCutting?.availableMeters.toString(),
        reservedMeters: fabricAfterCutting?.reservedMeters.toString(),
      },
    ]);

    // Query FabricStockTransaction for rows matching relatedOrderId = order2Id
    const stockTransactions = await prisma.fabricStockTransaction.findMany({
      where: { relatedOrderId: order2Id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        meters: true,
        relatedOrderId: true,
        note: true,
        createdAt: true,
      },
    });

    console.log('\n[Direct DB Query Result] Table "fabric_stock_transactions" for Order 2:');
    console.table(
      stockTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        meters: tx.meters.toString(),
        relatedOrderId: tx.relatedOrderId,
        note: tx.note,
        createdAt: tx.createdAt.toISOString(),
      })),
    );

    const hasReserve = stockTransactions.some(
      (t) => t.type === 'RESERVE' && t.meters.toString() === '3.5' && t.relatedOrderId === order2Id,
    );
    const hasConsume = stockTransactions.some(
      (t) => t.type === 'CONSUME' && t.meters.toString() === '3.5' && t.relatedOrderId === order2Id,
    );

    const reservedDecreased =
      fabricBeforeCutting && fabricAfterCutting
        ? fabricBeforeCutting.reservedMeters.minus(fabricAfterCutting.reservedMeters).toString() === '3.5'
        : false;

    const check2Pass = cuttingRes.status === 200 && hasReserve && hasConsume && reservedDecreased;

    if (check2Pass) {
      console.log('>>> RESULT: PASS — Order transitioned to CUTTING.');
      console.log('    FabricStockTransaction has traceable CONSUME row linked to relatedOrderId.');
      console.log(`    reservedMeters decreased by exactly 3.500m (${fabricBeforeCutting?.reservedMeters}m -> ${fabricAfterCutting?.reservedMeters}m).\n`);
      passedChecks++;
    } else {
      console.error('>>> RESULT: FAIL — Cutting did not properly consume fabric or link ledger row.\n');
    }

    // =========================================================================
    // CHECK 3: CANCELLED AFTER CUTTING DOES NOT RELEASE FABRIC
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('CHECK 3: CANCELLED AFTER CUTTING DOES NOT RELEASE FABRIC');
    console.log('--------------------------------------------------------------------------------');

    // Using Order 2 (currently in CUTTING), transition to CANCELLED
    console.log(`Transitioning Order 2 from CUTTING -> CANCELLED...`);
    const cancelRes = await req(
      'POST',
      `/api/orders/${order2Id}/transition`,
      { toStatus: 'CANCELLED', note: 'Customer cancelled after cloth was cut' },
      tokenA,
    );
    console.log(`  HTTP Status: ${cancelRes.status}, Order status: ${cancelRes.data?.status}`);

    // Query Order 2 in database
    const order2AfterCancel = await prisma.order.findUnique({
      where: { id: order2Id },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });
    console.log('\n[Direct DB Query Result] Table "orders" after cancellation:');
    console.table([
      {
        id: order2AfterCancel?.id,
        status: order2AfterCancel?.status,
        updatedAt: order2AfterCancel?.updatedAt.toISOString(),
      },
    ]);

    // Query Fabric after cancellation
    const fabricAfterCancel = await prisma.fabric.findUnique({
      where: { id: fabricAId },
      select: {
        id: true,
        name: true,
        availableMeters: true,
        reservedMeters: true,
      },
    });
    console.log('\n[Direct DB Query Result] Fabric AFTER CANCELLATION:');
    console.table([
      {
        id: fabricAfterCancel?.id,
        name: fabricAfterCancel?.name,
        availableMeters: fabricAfterCancel?.availableMeters.toString(),
        reservedMeters: fabricAfterCancel?.reservedMeters.toString(),
      },
    ]);

    // Query FabricStockTransaction for any RELEASE rows for Order 2
    const releaseTransactions = await prisma.fabricStockTransaction.findMany({
      where: { relatedOrderId: order2Id, type: 'RELEASE' },
      select: {
        id: true,
        type: true,
        meters: true,
        relatedOrderId: true,
        createdAt: true,
      },
    });

    console.log(
      `\n[Direct DB Query Result] Table "fabric_stock_transactions" RELEASE rows for Order 2: ${releaseTransactions.length} row(s) found`,
    );

    const availableUnchanged =
      fabricAfterCutting && fabricAfterCancel
        ? fabricAfterCutting.availableMeters.equals(fabricAfterCancel.availableMeters)
        : false;
    const noReleaseRows = releaseTransactions.length === 0;
    const check3Pass = cancelRes.status === 200 && availableUnchanged && noReleaseRows;

    if (check3Pass) {
      console.log('>>> RESULT: PASS — Cancellation after CUTTING did NOT release consumed fabric.');
      console.log(
        `    availableMeters remains unchanged (${fabricAfterCancel?.availableMeters}m).`,
      );
      console.log('    Zero RELEASE transactions created for this cut order.\n');
      passedChecks++;
    } else {
      console.error('>>> RESULT: FAIL — Available fabric meters changed or RELEASE transaction was inappropriately created.\n');
    }

    // =========================================================================
    // CHECK 4: CROSS-TENANT ORDER ISOLATION
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('CHECK 4: CROSS-TENANT ORDER ISOLATION');
    console.log('--------------------------------------------------------------------------------');

    // Provision Shop B
    console.log('Provisioning Tenant B (Shop B)...');
    const slugB = `live-shop-b-${rand()}`;
    const regB = await req('POST', '/api/auth/register/tenant', {
      shopName: 'Live Shop B',
      slug: slugB,
      ownerEmail: `owner-${rand()}@shopb.com`,
      ownerPassword: 'Password123!',
      firstName: 'Owner',
      lastName: 'B',
    });
    if (!regB.data?.token) {
      throw new Error(`Failed to register Shop B: ${JSON.stringify(regB)}`);
    }
    const tokenB = regB.data.token;
    const shopBId = regB.data.user.tenantId;
    console.log(`  -> Shop B created (ID: ${shopBId})`);

    // Create customer, profile, and fabric under Shop B
    const custB = await req(
      'POST',
      '/api/customers',
      {
        firstName: 'Pooja',
        lastName: 'Patel',
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      tokenB,
    );
    const profileB = await req(
      'POST',
      `/api/customers/${custB.data.id}/measurements`,
      {
        name: 'Festive Kurta',
        garmentType: 'KURTA',
        values: { chest: 38.0, length: 42.0 },
      },
      tokenB,
    );
    const fabricB = await req(
      'POST',
      '/api/fabrics',
      {
        name: 'Silk Brocade',
        color: 'Ruby Red',
        type: 'Silk',
        pricePerMeter: '2500.00',
        initialMeters: '15.000',
      },
      tokenB,
    );

    // Create Order B under Shop B
    const orderBRes = await req(
      'POST',
      '/api/orders',
      {
        customerId: custB.data.id,
        measurementProfileId: profileB.data.id,
        fabricId: fabricB.data.id,
        garmentType: 'KURTA',
        metersUsed: '3.000',
      },
      tokenB,
    );
    const orderBId = orderBRes.data.id;
    console.log(`  -> Created Order in Shop B (ID: ${orderBId}, Status: ${orderBRes.data.status})`);

    // 4a: Using Shop A's JWT, attempt to fetch Shop B's order
    console.log(`\n(4a) Attempting GET /api/orders/${orderBId} using Shop A's JWT...`);
    const breachGetRes = await req('GET', `/api/orders/${orderBId}`, undefined, tokenA);
    console.log(`  HTTP Status: ${breachGetRes.status}`);
    console.log(`  HTTP Response:`, JSON.stringify(breachGetRes.error || breachGetRes.data));

    // 4b: Using Shop A's JWT, attempt to transition Shop B's order
    console.log(`\n(4b) Attempting POST /api/orders/${orderBId}/transition using Shop A's JWT...`);
    const breachTransRes = await req(
      'POST',
      `/api/orders/${orderBId}/transition`,
      { toStatus: 'MEASUREMENT_CONFIRMED', note: 'Shop A malicious transition attempt' },
      tokenA,
    );
    console.log(`  HTTP Status: ${breachTransRes.status}`);
    console.log(`  HTTP Response:`, JSON.stringify(breachTransRes.error || breachTransRes.data));

    // Direct Database Query on Order B
    const orderBDb = await prisma.order.findUnique({
      where: { id: orderBId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        garmentType: true,
        metersUsed: true,
        updatedAt: true,
      },
    });

    console.log('\n[Direct DB Query Result] Table "orders" for Shop B Order:');
    console.table([
      {
        id: orderBDb?.id,
        tenantId: orderBDb?.tenantId,
        status: orderBDb?.status,
        garmentType: orderBDb?.garmentType,
        metersUsed: orderBDb?.metersUsed.toString(),
        updatedAt: orderBDb?.updatedAt.toISOString(),
      },
    ]);

    const check4aPass = breachGetRes.status === 404 || breachGetRes.status === 403;
    const check4bPass = breachTransRes.status === 404 || breachTransRes.status === 403;
    const check4DbPass = orderBDb?.tenantId === shopBId && orderBDb?.status === 'PLACED';
    const check4Pass = check4aPass && check4bPass && check4DbPass;

    if (check4Pass) {
      console.log('>>> RESULT: PASS — Cross-tenant read (404/403) and transition (404/403) both rejected.');
      console.log('    Order in Shop B remains completely untouched in PLACED status.\n');
      passedChecks++;
    } else {
      console.error('>>> RESULT: FAIL — Cross-tenant isolation breach detected!\n');
    }

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('================================================================================');
    console.log(`FINAL LIVE TEST SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('================================================================================');

    if (passedChecks === totalChecks) {
      console.log('ALL 4 LIVE CHECKS PASSED AGAINST THE RUNNING DEV SERVER.');
      process.exit(0);
    } else {
      console.error(`FAILED: Only ${passedChecks}/${totalChecks} passed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Live test encountered unexpected error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLiveTest();
