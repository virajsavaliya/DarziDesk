import { PrismaClient, FabricStockTransactionType } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:3001';

async function runReportsBackendTests() {
  console.log('🧪 Starting Backend Reports API Tests...');

  // 1. Authenticate as Staff and Owner via /api/auth/login/staff
  console.log('1. Authenticating as Staff (Priya Sharma)...');
  const staffRes = await fetch(`${BACKEND_URL}/api/auth/login/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'shree-ganesh-tailors',
      email: 'priya.sales@shreeganesh.com',
      password: 'Password123!',
    }),
  });
  if (!staffRes.ok) throw new Error(`Staff login failed: ${staffRes.status}`);
  const staffJson = (await staffRes.json()) as any;
  const staffToken = staffJson.data.token;
  console.log('   ✅ Staff logged in successfully.');

  console.log('2. Authenticating as Owner (Ramesh Patel)...');
  const ownerRes = await fetch(`${BACKEND_URL}/api/auth/login/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'shree-ganesh-tailors',
      email: 'owner@shreeganesh.com',
      password: 'Password123!',
    }),
  });
  if (!ownerRes.ok) throw new Error(`Owner login failed: ${ownerRes.status}`);
  const ownerJson = (await ownerRes.json()) as any;
  const ownerToken = ownerJson.data.token;
  const tenantId = ownerJson.data.user.tenantId;
  console.log('   ✅ Owner logged in successfully. Tenant:', tenantId);

  // 2. Test Authorization: Staff accessing reports endpoints MUST receive 403 Forbidden
  console.log('3. Testing Staff Access Control on /api/reports...');
  const staffPerfAttempt = await fetch(`${BACKEND_URL}/api/reports/staff-performance`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log(`   Staff GET /api/reports/staff-performance status: ${staffPerfAttempt.status}`);
  if (staffPerfAttempt.status !== 403) {
    throw new Error(`FAIL: Expected 403 for staff on staff-performance, got ${staffPerfAttempt.status}`);
  }

  const staffRevAttempt = await fetch(`${BACKEND_URL}/api/reports/revenue`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log(`   Staff GET /api/reports/revenue status: ${staffRevAttempt.status}`);
  if (staffRevAttempt.status !== 403) {
    throw new Error(`FAIL: Expected 403 for staff on revenue, got ${staffRevAttempt.status}`);
  }
  console.log('   ✅ Staff role properly blocked with 403 Forbidden from accessing reports endpoints.');

  // 3. Test Revenue Aggregation against direct Prisma database query
  console.log('4. Verifying Revenue Aggregation against Prisma ledger...');
  const fromDate = new Date('2026-01-01T00:00:00.000Z');
  const toDate = new Date('2026-12-31T23:59:59.999Z');

  const invoicesInDb = await prisma.invoice.findMany({
    where: {
      tenantId,
      createdAt: { gte: fromDate, lte: toDate },
    },
  });

  const expectedTotalRev = Math.round(
    invoicesInDb.reduce((acc, inv) => acc + Number(inv.totalAmount), 0) * 100
  ) / 100;
  const expectedFabricCost = Math.round(
    invoicesInDb.reduce((acc, inv) => acc + Number(inv.fabricCost), 0) * 100
  ) / 100;
  const expectedStitching = Math.round(
    invoicesInDb.reduce((acc, inv) => acc + Number(inv.stitchingCharge), 0) * 100
  ) / 100;

  const revRes = await fetch(
    `${BACKEND_URL}/api/reports/revenue?from=2026-01-01&to=2026-12-31`,
    { headers: { Authorization: `Bearer ${ownerToken}` } },
  );
  if (!revRes.ok) throw new Error(`Revenue report failed: ${revRes.status}`);
  const revJson = (await revRes.json()) as any;
  const revData = revJson.data;

  console.log(`   Direct DB Invoice Count: ${invoicesInDb.length}, Report Invoices: ${revData.invoiceCount}`);
  console.log(`   Direct DB Revenue: ₹${expectedTotalRev}, Report Revenue: ₹${revData.totalRevenue}`);
  if (revData.totalRevenue !== expectedTotalRev) {
    throw new Error(`FAIL: Revenue mismatch! Expected ${expectedTotalRev}, got ${revData.totalRevenue}`);
  }
  if (revData.breakdown.fabricCost !== expectedFabricCost) {
    throw new Error(`FAIL: Fabric cost mismatch! Expected ${expectedFabricCost}, got ${revData.breakdown.fabricCost}`);
  }
  if (revData.breakdown.stitchingCharges !== expectedStitching) {
    throw new Error(`FAIL: Stitching charge mismatch! Expected ${expectedStitching}, got ${revData.breakdown.stitchingCharges}`);
  }
  console.log('   ✅ Revenue totals, fabric breakdown, and stitching breakdown exactly match database records.');

  // 4. Test Orders and Turnaround Time
  console.log('5. Verifying Order SLA & Turnaround Time against Prisma OrderStatusLogs...');
  const ordersInDb = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      statusLogs: { orderBy: { changedAt: 'asc' } },
    },
  });

  let manualTurnaroundMs = 0;
  let manualDeliveredCount = 0;
  for (const ord of ordersInDb) {
    const delLog = ord.statusLogs.find((l) => l.toStatus === 'DELIVERED');
    if (delLog) {
      const placedLog = ord.statusLogs.find((l) => l.toStatus === 'PLACED');
      const start = placedLog ? new Date(placedLog.changedAt).getTime() : new Date(ord.createdAt).getTime();
      const duration = new Date(delLog.changedAt).getTime() - start;
      if (duration >= 0) {
        manualTurnaroundMs += duration;
        manualDeliveredCount += 1;
      }
    }
  }
  const expectedTurnaroundDays =
    manualDeliveredCount > 0
      ? Math.round((manualTurnaroundMs / (manualDeliveredCount * 1000 * 60 * 60 * 24)) * 10) / 10
      : 0;

  const ordersRes = await fetch(
    `${BACKEND_URL}/api/reports/orders?from=2026-01-01&to=2026-12-31`,
    { headers: { Authorization: `Bearer ${ownerToken}` } },
  );
  if (!ordersRes.ok) throw new Error(`Orders report failed: ${ordersRes.status}`);
  const ordersJson = (await ordersRes.json()) as any;
  const ordersData = ordersJson.data;

  console.log(`   Direct DB Orders: ${ordersInDb.length}, Report Orders: ${ordersData.totalOrders}`);
  console.log(`   Direct DB Avg Turnaround: ${expectedTurnaroundDays} days, Report SLA: ${ordersData.averageTurnaroundDays} days`);
  if (ordersData.totalOrders !== ordersInDb.length) {
    throw new Error(`FAIL: Total orders mismatch! Expected ${ordersInDb.length}, got ${ordersData.totalOrders}`);
  }
  if (ordersData.averageTurnaroundDays !== expectedTurnaroundDays) {
    throw new Error(`FAIL: SLA turnaround mismatch! Expected ${expectedTurnaroundDays}, got ${ordersData.averageTurnaroundDays}`);
  }
  console.log('   ✅ Order counts and SLA turnaround days exactly match database calculation.');

  // 5. Test Fabric Consumption against FabricStockTransaction
  console.log('6. Verifying Fabric Consumption against FabricStockTransaction ledger...');
  const consumeTxs = await prisma.fabricStockTransaction.findMany({
    where: {
      tenantId,
      type: FabricStockTransactionType.CONSUME,
      createdAt: { gte: fromDate, lte: toDate },
    },
  });
  const expectedMetersConsumed = Math.round(
    consumeTxs.reduce((sum, t) => sum + Number(t.meters), 0) * 1000
  ) / 1000;

  const fabricRes = await fetch(
    `${BACKEND_URL}/api/reports/fabric-consumption?from=2026-01-01&to=2026-12-31`,
    { headers: { Authorization: `Bearer ${ownerToken}` } },
  );
  if (!fabricRes.ok) throw new Error(`Fabric report failed: ${fabricRes.status}`);
  const fabricJson = (await fabricRes.json()) as any;
  const fabricData = fabricJson.data;

  console.log(`   Direct DB Consume Ledger: ${expectedMetersConsumed}m across ${consumeTxs.length} txs, Report: ${fabricData.totalMetersConsumed}m`);
  if (fabricData.totalMetersConsumed !== expectedMetersConsumed) {
    throw new Error(`FAIL: Fabric consumption mismatch! Expected ${expectedMetersConsumed}, got ${fabricData.totalMetersConsumed}`);
  }
  console.log('   ✅ Fabric stock consumption matches the ledger directly.');

  // 6. Test Empty Date Range (Future range: 2099)
  console.log('7. Verifying Empty Date Range handling (Year 2099)...');
  const emptyRes = await fetch(
    `${BACKEND_URL}/api/reports/revenue?from=2099-01-01&to=2099-01-31`,
    { headers: { Authorization: `Bearer ${ownerToken}` } },
  );
  if (!emptyRes.ok) throw new Error(`Empty revenue report failed: ${emptyRes.status}`);
  const emptyJson = (await emptyRes.json()) as any;
  if (emptyJson.data.totalRevenue !== 0 || emptyJson.data.invoiceCount !== 0) {
    throw new Error(`FAIL: Expected 0 revenue for 2099, got ${emptyJson.data.totalRevenue}`);
  }
  console.log('   ✅ Empty date range cleanly returns 0 revenue and 0 invoices without error.');

  console.log('\n🎉 ALL BACKEND REPORTS API TESTS PASSED SUCCESSFULLY!');
}

runReportsBackendTests()
  .catch((err) => {
    console.error('\n❌ BACKEND REPORTS TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
