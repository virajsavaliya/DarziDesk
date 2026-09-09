/**
 * Standalone Live Tenant-Isolation Break Test
 *
 * Runs against the ACTUALLY RUNNING dev server at http://localhost:3001.
 * Tests:
 *   1. Cross-tenant data access attempt (Shop A trying to access Shop B data by ID)
 *   2. Role boundary enforcement (Customer JWT accessing staff-only endpoints)
 *   3. Tenant override attempt (Injecting tenant_id via body, header, or query param)
 *
 * Each check outputs a clear PASS or FAIL based on whether the breach attempt
 * was blocked (403/404) or succeeded improperly.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

async function request<T = any>(
  method: string,
  path: string,
  body?: Record<string, any>,
  headers: Record<string, string> = {},
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const init: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return {
    status: res.status,
    data: json?.data,
    error: json?.error,
  };
}

const randomStr = () => Math.random().toString(36).substring(2, 8);

async function runLiveTest() {
  console.log('===============================================================');
  console.log('       DARZIDESK — LIVE TENANT ISOLATION BREAK TEST            ');
  console.log(`       Target Server: ${BASE_URL}                            `);
  console.log('===============================================================\n');

  // Verify server is healthy
  const health = await request('GET', '/api/health');
  if (health.status !== 200) {
    console.error(`FATAL: Backend is not reachable or unhealthy at ${BASE_URL} (Status: ${health.status})`);
    process.exit(1);
  }
  console.log('✔ Live backend server is running and healthy.\n');

  // ---------------------------------------------------------------------------
  // STEP 1: Register two real tenants via live API
  // ---------------------------------------------------------------------------
  console.log('--- STEP 1: Registering Two Real Tenants ---');
  const slugA = `shop-a-${randomStr()}`;
  const slugB = `shop-b-${randomStr()}`;
  const emailA = `owner-${randomStr()}@shop-a.com`;
  const emailB = `owner-${randomStr()}@shop-b.com`;
  const password = 'SecurePassword123!';

  const regA = await request('POST', '/api/auth/register/tenant', {
    shopName: 'Test Shop A',
    slug: slugA,
    ownerEmail: emailA,
    ownerPassword: password,
    firstName: 'Alice',
    lastName: 'OwnerA',
  });

  if (regA.status !== 201 || !regA.data?.token) {
    console.error('Failed to register Shop A:', regA);
    process.exit(1);
  }
  const tenantAId = regA.data.user.tenantId;
  console.log(`✔ Shop A created: slug="${slugA}", tenantId=${tenantAId}`);

  const regB = await request('POST', '/api/auth/register/tenant', {
    shopName: 'Test Shop B',
    slug: slugB,
    ownerEmail: emailB,
    ownerPassword: password,
    firstName: 'Bob',
    lastName: 'OwnerB',
  });

  if (regB.status !== 201 || !regB.data?.token) {
    console.error('Failed to register Shop B:', regB);
    process.exit(1);
  }
  const tenantBId = regB.data.user.tenantId;
  const ownerBId = regB.data.user.id;
  console.log(`✔ Shop B created: slug="${slugB}", tenantId=${tenantBId}, ownerId=${ownerBId}\n`);

  // ---------------------------------------------------------------------------
  // STEP 2: Log in as Shop A's owner via live login endpoint, capture real JWT
  // ---------------------------------------------------------------------------
  console.log('--- STEP 2: Live Login as Shop A Owner ---');
  const loginA = await request('POST', '/api/auth/login/staff', {
    email: emailA,
    password: password,
    slug: slugA,
  });

  if (loginA.status !== 200 || !loginA.data?.token) {
    console.error('Failed to log in as Shop A owner:', loginA);
    process.exit(1);
  }
  const jwtA = loginA.data.token;
  console.log(`✔ Shop A owner logged in successfully. Real JWT captured (${jwtA.substring(0, 24)}...)\n`);

  // ---------------------------------------------------------------------------
  // STEP 3: Log in as Shop B's owner, create test record under Shop B
  // ---------------------------------------------------------------------------
  console.log('--- STEP 3: Live Login as Shop B Owner & Create Shop B Record ---');
  const loginB = await request('POST', '/api/auth/login/staff', {
    email: emailB,
    password: password,
    slug: slugB,
  });

  if (loginB.status !== 200 || !loginB.data?.token) {
    console.error('Failed to log in as Shop B owner:', loginB);
    process.exit(1);
  }
  const jwtB = loginB.data.token;
  console.log(`✔ Shop B owner logged in successfully. Real JWT captured (${jwtB.substring(0, 24)}...)`);

  // Create a staff user under Shop B
  const staffEmailB = `staff-${randomStr()}@shop-b.com`;
  const createStaffB = await request(
    'POST',
    '/api/users',
    {
      email: staffEmailB,
      password: password,
      firstName: 'Staff',
      lastName: 'ShopB',
    },
    { Authorization: `Bearer ${jwtB}` },
  );

  if (createStaffB.status !== 201 || !createStaffB.data?.id) {
    console.error('Failed to create staff record under Shop B:', createStaffB);
    process.exit(1);
  }
  const shopBStaffId = createStaffB.data.id;
  console.log(`✔ Created record under Shop B: id=${shopBStaffId}, tenantId=${createStaffB.data.tenantId}`);

  // Register a test customer for global customer testing
  const customerEmail = `customer-${randomStr()}@gmail.com`;
  const regCustomer = await request('POST', '/api/auth/register/customer', {
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: customerEmail,
    password: password,
    firstName: 'Charlie',
    lastName: 'Customer',
  });
  if (regCustomer.status !== 201 || !regCustomer.data?.token) {
    console.error('Failed to register customer:', regCustomer);
    process.exit(1);
  }
  const customerJwt = regCustomer.data.token;
  const customerId = regCustomer.data.customer.id;
  console.log(`✔ Registered test customer: id=${customerId}, email=${customerEmail}\n`);

  // ===========================================================================
  // CHECK 1: Cross-Tenant Data Access Attempt (Shop A JWT -> Shop B Record)
  // ===========================================================================
  console.log('===============================================================');
  console.log('CHECK 1: Shop A staff attempting to fetch Shop B record by ID');
  console.log('Action: GET /api/users/' + shopBStaffId + ' with Shop A JWT');
  console.log('Expected: 404 Not Found (or 403 Forbidden) — Shop B record is invisible');
  console.log('---------------------------------------------------------------');

  const check1Res = await request(
    'GET',
    `/api/users/${shopBStaffId}`,
    undefined,
    { Authorization: `Bearer ${jwtA}` },
  );

  console.log(`HTTP Response Status: ${check1Res.status}`);
  console.log(`Response Body: ${JSON.stringify(check1Res.error || check1Res.data)}`);

  // Also check fetching owner of Shop B by ID
  const check1OwnerRes = await request(
    'GET',
    `/api/users/${ownerBId}`,
    undefined,
    { Authorization: `Bearer ${jwtA}` },
  );
  console.log(`Fetching Shop B owner by ID HTTP Status: ${check1OwnerRes.status}`);

  let check1Passed = false;
  if ((check1Res.status === 404 || check1Res.status === 403) &&
      (check1OwnerRes.status === 404 || check1OwnerRes.status === 403)) {
    check1Passed = true;
    console.log('\n>>> CHECK 1 RESULT: PASS <<< (Shop A cannot read Shop B data; returns 404 Not Found)');
  } else {
    console.log(`\n>>> CHECK 1 RESULT: FAIL <<< (Unexpected status: ${check1Res.status}, data exposed: ${JSON.stringify(check1Res.data)})`);
  }
  console.log('===============================================================\n');

  // ===========================================================================
  // CHECK 2: Role Boundary Enforcement (Customer JWT -> Staff-only Route)
  // ===========================================================================
  console.log('===============================================================');
  console.log('CHECK 2: Customer JWT attempting to access staff-only endpoint');
  console.log('Action: GET /api/users and GET /api/users/me with Customer JWT');
  console.log('Expected: 403 Forbidden (audience mismatch: darzi:customer rejected on staff route)');
  console.log('---------------------------------------------------------------');

  const check2ListRes = await request(
    'GET',
    '/api/users',
    undefined,
    { Authorization: `Bearer ${customerJwt}` },
  );
  console.log(`GET /api/users Status: ${check2ListRes.status} (${check2ListRes.error?.message || ''})`);

  const check2MeRes = await request(
    'GET',
    '/api/users/me',
    undefined,
    { Authorization: `Bearer ${customerJwt}` },
  );
  console.log(`GET /api/users/me Status: ${check2MeRes.status} (${check2MeRes.error?.message || ''})`);

  let check2Passed = false;
  if (check2ListRes.status === 403 && check2MeRes.status === 403) {
    check2Passed = true;
    console.log('\n>>> CHECK 2 RESULT: PASS <<< (Customer JWT correctly rejected with 403 Forbidden)');
  } else {
    console.log(`\n>>> CHECK 2 RESULT: FAIL <<< (Status: /api/users=${check2ListRes.status}, /api/users/me=${check2MeRes.status})`);
  }
  console.log('===============================================================\n');

  // ===========================================================================
  // CHECK 3: Tenant ID Override / Spoofing Attempt
  // ===========================================================================
  console.log('===============================================================');
  console.log('CHECK 3: Attempting to override tenant_id via body / header / query param');
  console.log(`Action: POST /api/users?tenantId=${tenantBId} using Shop A JWT,`);
  console.log(`        sending body { tenantId: "${tenantBId}", ... } and header X-Tenant-ID: ${tenantBId}`);
  console.log('Expected: Injected tenantId has NO effect. Record created under Shop A (JWT tenant).');
  console.log('---------------------------------------------------------------');

  const spoofEmail = `spoof-${randomStr()}@test.com`;
  const check3CreateRes = await request(
    'POST',
    `/api/users?tenantId=${tenantBId}`,
    {
      email: spoofEmail,
      password: password,
      firstName: 'Spoof',
      lastName: 'Attempt',
      tenantId: tenantBId, // Body spoof attempt
    },
    {
      Authorization: `Bearer ${jwtA}`,
      'X-Tenant-ID': tenantBId, // Header spoof attempt
    },
  );

  console.log(`Create User Status: ${check3CreateRes.status}`);
  console.log(`Created Record Tenant ID: ${check3CreateRes.data?.tenantId}`);

  // Query as Shop A to see if user is in Shop A
  const shopAUsersRes = await request(
    'GET',
    '/api/users',
    undefined,
    { Authorization: `Bearer ${jwtA}` },
  );
  const userInShopA = shopAUsersRes.data?.some((u: any) => u.email === spoofEmail);

  // Query as Shop B to verify the spoofed user did NOT leak into Shop B
  const shopBUsersRes = await request(
    'GET',
    '/api/users',
    undefined,
    { Authorization: `Bearer ${jwtB}` },
  );
  const userInShopB = shopBUsersRes.data?.some((u: any) => u.email === spoofEmail);

  // Attempt query-string tenant spoofing on GET
  const querySpoofRes = await request(
    'GET',
    `/api/users?tenantId=${tenantBId}`,
    undefined,
    { Authorization: `Bearer ${jwtA}` },
  );
  const querySpoofLeaked = querySpoofRes.data?.some((u: any) => u.tenantId === tenantBId);

  console.log(`User exists in Shop A list: ${userInShopA}`);
  console.log(`User leaked into Shop B list: ${userInShopB}`);
  console.log(`Query parameter returned Shop B data to Shop A: ${querySpoofLeaked}`);

  let check3Passed = false;
  if (
    check3CreateRes.status === 201 &&
    check3CreateRes.data?.tenantId === tenantAId &&
    userInShopA === true &&
    userInShopB === false &&
    querySpoofLeaked === false
  ) {
    check3Passed = true;
    console.log('\n>>> CHECK 3 RESULT: PASS <<< (Directly setting tenant_id via body/header/query param has zero effect)');
  } else {
    console.log('\n>>> CHECK 3 RESULT: FAIL <<< (Tenant spoofing succeeded or created in wrong tenant)');
  }
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('===============================================================');
  console.log('                      TEST SUMMARY                             ');
  console.log('===============================================================');
  console.log(`  Check 1 (Cross-Tenant Access Blocked):  ${check1Passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Check 2 (Customer JWT Rejected on Staff): ${check2Passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Check 3 (Tenant Override Spoofing Blocked): ${check3Passed ? 'PASS' : 'FAIL'}`);
  console.log('===============================================================');

  if (check1Passed && check2Passed && check3Passed) {
    console.log('ALL CHECKS PASSED: Tenant isolation and RBAC are 100% verified on the live dev server.\n');
    process.exit(0);
  } else {
    console.error('ONE OR MORE CHECKS FAILED: See details above.\n');
    process.exit(1);
  }
}

runLiveTest().catch((err) => {
  console.error('Unexpected error running live break test:', err);
  process.exit(1);
});
