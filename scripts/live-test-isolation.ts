/**
 * Standalone Live Test: Measurement Profile Cross-Tenant Isolation
 *
 * Runs against the active DarziDesk API dev server.
 *
 * Test Scenarios:
 * 1. Register a single platform-level customer via self-registration.
 * 2. Ensure two tenants exist ("Test Shop A" and "Test Shop B") and obtain Owner JWTs.
 * 3. Under Shop A, link customer and create measurement profile "Self" (Chest=40).
 * 4. Under Shop B, independently link customer and create profile "Self" (Chest=42).
 * 5. Fetch profiles with Shop A JWT -> verify only Shop A profile (Chest=40) returned.
 * 6. Fetch profiles with Shop B JWT -> verify only Shop B profile (Chest=42) returned.
 * 7. Update Shop A profile to Chest=41 -> verify both v1 (40) and v2 (41) in history.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: Record<string, any>;
  } = {}
): Promise<{ status: number; body: ApiResponse<T> }> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await res.json()) as ApiResponse<T>;
  return { status: res.status, body };
}

async function main() {
  console.log('================================================================');
  console.log(' LIVE TEST: MEASUREMENT PROFILE CROSS-TENANT ISOLATION');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('================================================================\n');

  // 0. Health check
  try {
    const health = await apiRequest('/api/health');
    if (health.status !== 200 || health.body.data?.status !== 'ok' && (health.body as any).status !== 'ok') {
      console.error('❌ Dev server health check failed:', health.body);
      process.exit(1);
    }
    console.log('✅ Dev server is healthy and responding.\n');
  } catch (err: any) {
    console.error(`❌ Could not connect to dev server at ${BASE_URL}:`, err.message);
    process.exit(1);
  }

  // 1. Register a single Customer (platform-level)
  const runId = Date.now().toString().slice(-6);
  const customerPhone = `+9198${Date.now().toString().slice(-8)}`;
  const customerEmail = `live.customer.${runId}@example.com`;
  const customerPassword = 'CustomerSecure123!';

  console.log('--- Step 1: Register Customer (Platform-level) ---');
  console.log(`Phone: ${customerPhone}, Email: ${customerEmail}`);

  const regCustomerRes = await apiRequest('/api/auth/register/customer', {
    method: 'POST',
    body: {
      phone: customerPhone,
      email: customerEmail,
      password: customerPassword,
      firstName: 'Alice',
      lastName: 'Tester',
    },
  });

  if (regCustomerRes.status !== 201 || !regCustomerRes.body.data?.customer?.id) {
    console.error('❌ Failed to register customer:', regCustomerRes.body);
    process.exit(1);
  }

  const customer = regCustomerRes.body.data.customer;
  console.log(`✅ Customer registered. ID: ${customer.id}\n`);

  // 2. Setup Tenants Shop A and Shop B
  console.log('--- Step 2: Ensure Tenants "Test Shop A" and "Test Shop B" exist ---');

  const fs = await import('fs');
  const path = await import('path');
  const cacheFile = path.resolve(__dirname, '.auth-cache.json');

  let tokenCache: Record<string, { token: string; tenantId: string; user: any }> = {};
  try {
    if (fs.existsSync(cacheFile)) {
      tokenCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
  } catch {}

  async function getOrRegisterTenant(shopName: string, slug: string, email: string) {
    const password = 'ShopOwnerSecure123!';

    // 1. Check cache
    if (tokenCache[slug]) {
      // Test if cached token is still accepted
      const testRes = await apiRequest('/api/users/me', {
        token: tokenCache[slug].token,
      });
      if (testRes.status === 200) {
        console.log(`✅ Using valid cached token for tenant "${shopName}" (${slug})`);
        return tokenCache[slug];
      }
    }

    // 2. Try login first
    const loginRes = await apiRequest('/api/auth/login/staff', {
      method: 'POST',
      body: { email, password, slug },
    });

    if (loginRes.status === 200 && loginRes.body.data?.token) {
      console.log(`✅ Logged into tenant "${shopName}" (${slug})`);
      const resData = {
        tenantId: loginRes.body.data.user.tenantId,
        user: loginRes.body.data.user,
        token: loginRes.body.data.token,
      };
      tokenCache[slug] = resData;
      fs.writeFileSync(cacheFile, JSON.stringify(tokenCache, null, 2));
      return resData;
    }

    // 3. If login failed because tenant doesn't exist, register
    console.log(`ℹ️ Tenant "${shopName}" not found, registering...`);
    const regRes = await apiRequest('/api/auth/register/tenant', {
      method: 'POST',
      body: {
        shopName,
        slug,
        ownerEmail: email,
        ownerPassword: password,
        firstName: 'Owner',
        lastName: shopName,
      },
    });

    if (regRes.status === 201 && regRes.body.data?.token) {
      console.log(`✅ Registered new tenant "${shopName}" (${slug})`);
      const resData = {
        tenantId: regRes.body.data.user.tenantId,
        user: regRes.body.data.user,
        token: regRes.body.data.token,
      };
      tokenCache[slug] = resData;
      fs.writeFileSync(cacheFile, JSON.stringify(tokenCache, null, 2));
      return resData;
    }

    console.error(`❌ Failed to login or register tenant ${slug}:`, regRes.body);
    process.exit(1);
  }

  const shopA = await getOrRegisterTenant('Test Shop A', 'test-shop-a', 'owner.shopa@example.com');
  const shopB = await getOrRegisterTenant('Test Shop B', 'test-shop-b', 'owner.shopb@example.com');

  console.log(`Shop A Tenant ID: ${shopA.tenantId}`);
  console.log(`Shop B Tenant ID: ${shopB.tenantId}\n`);

  // 3. Under Shop A: Link Customer and create measurement profile "Self" (Chest=40)
  console.log('--- Step 3: Shop A — Link customer and create profile "Self" (Chest=40) ---');
  const linkARes = await apiRequest('/api/customers', {
    method: 'POST',
    token: shopA.token,
    body: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      firstInteractionSource: 'WALK_IN',
    },
  });

  if (linkARes.status !== 201) {
    console.error('❌ Failed to link customer under Shop A:', linkARes.body);
    process.exit(1);
  }
  console.log('✅ ShopCustomerLink created for Shop A');

  const profileARes = await apiRequest(`/api/customers/${customer.id}/measurements`, {
    method: 'POST',
    token: shopA.token,
    body: {
      name: 'Self',
      garmentType: 'SHIRT',
      unit: 'INCHES',
      fitPreference: 'REGULAR',
      values: {
        Chest: 40,
      },
    },
  });

  if (profileARes.status !== 201 || !profileARes.body.data?.id) {
    console.error('❌ Failed to create profile under Shop A:', profileARes.body);
    process.exit(1);
  }

  const profileA = profileARes.body.data;
  console.log(`✅ Shop A created profile "Self" (ID: ${profileA.id}, Chest: ${profileA.currentVersion.values.Chest})\n`);

  // 4. Under Shop B: Independently link Customer and create measurement profile "Self" (Chest=42)
  console.log('--- Step 4: Shop B — Link customer and create profile "Self" (Chest=42) ---');
  const linkBRes = await apiRequest('/api/customers', {
    method: 'POST',
    token: shopB.token,
    body: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      firstInteractionSource: 'WALK_IN',
    },
  });

  if (linkBRes.status !== 201) {
    console.error('❌ Failed to link customer under Shop B:', linkBRes.body);
    process.exit(1);
  }
  console.log('✅ ShopCustomerLink created for Shop B');

  const profileBRes = await apiRequest(`/api/customers/${customer.id}/measurements`, {
    method: 'POST',
    token: shopB.token,
    body: {
      name: 'Self',
      garmentType: 'SHIRT',
      unit: 'INCHES',
      fitPreference: 'REGULAR',
      values: {
        Chest: 42,
      },
    },
  });

  if (profileBRes.status !== 201 || !profileBRes.body.data?.id) {
    console.error('❌ Failed to create profile under Shop B:', profileBRes.body);
    process.exit(1);
  }

  const profileB = profileBRes.body.data;
  console.log(`✅ Shop B created profile "Self" (ID: ${profileB.id}, Chest: ${profileB.currentVersion.values.Chest})\n`);

  // 5. Using Shop A's JWT, fetch customer's measurement profiles
  console.log("--- Step 5: Verify Shop A's perspective ---");
  const fetchProfilesARes = await apiRequest(`/api/customers/${customer.id}/measurements`, {
    method: 'GET',
    token: shopA.token,
  });

  const profilesUnderA = fetchProfilesARes.body.data || [];
  console.log(`Shop A received ${profilesUnderA.length} profile(s):`, JSON.stringify(profilesUnderA, null, 2));

  const hasOnlyShopAProfile =
    profilesUnderA.length === 1 &&
    profilesUnderA[0].id === profileA.id &&
    profilesUnderA[0].name === 'Self' &&
    Number(profilesUnderA[0].versions[0]?.values?.Chest) === 40;

  const leakedShopBIntoA = profilesUnderA.some(
    (p: any) => p.id === profileB.id || Number(p.versions[0]?.values?.Chest) === 42
  );

  const testAPassed = hasOnlyShopAProfile && !leakedShopBIntoA;

  // 6. Using Shop B's JWT, fetch customer's measurement profiles
  console.log("\n--- Step 6: Verify Shop B's perspective ---");
  const fetchProfilesBRes = await apiRequest(`/api/customers/${customer.id}/measurements`, {
    method: 'GET',
    token: shopB.token,
  });

  const profilesUnderB = fetchProfilesBRes.body.data || [];
  console.log(`Shop B received ${profilesUnderB.length} profile(s):`, JSON.stringify(profilesUnderB, null, 2));

  const hasOnlyShopBProfile =
    profilesUnderB.length === 1 &&
    profilesUnderB[0].id === profileB.id &&
    profilesUnderB[0].name === 'Self' &&
    Number(profilesUnderB[0].versions[0]?.values?.Chest) === 42;

  const leakedShopAIntoB = profilesUnderB.some(
    (p: any) => p.id === profileA.id || Number(p.versions[0]?.values?.Chest) === 40
  );

  const testBPassed = hasOnlyShopBProfile && !leakedShopAIntoB;

  // Cross-tenant direct access security check: Shop A trying to read Shop B's profile ID directly
  console.log("\n--- Extra Isolation Check: Direct Profile Access by ID across tenants ---");
  const directAccessRes = await apiRequest(`/api/measurements/${profileB.id}`, {
    method: 'GET',
    token: shopA.token,
  });
  console.log(`Shop A GET /api/measurements/${profileB.id} -> Status: ${directAccessRes.status} (Expected 404)`);
  const directAccessBlocked = directAccessRes.status === 404;

  // 7. Verify Version History: Update Shop A's profile to Chest=41, fetch profile history
  console.log('\n--- Step 7: Update Shop A profile to Chest=41 and verify Version History ---');
  const updateRes = await apiRequest(`/api/measurements/${profileA.id}/versions`, {
    method: 'POST',
    token: shopA.token,
    body: {
      values: {
        Chest: 41,
      },
    },
  });

  if (updateRes.status !== 201 || !updateRes.body.data?.versionNumber) {
    console.error('❌ Failed to add measurement version:', updateRes.body);
    process.exit(1);
  }
  console.log(`✅ Version ${updateRes.body.data.versionNumber} created with Chest: ${updateRes.body.data.values.Chest}`);

  const historyRes = await apiRequest(`/api/measurements/${profileA.id}`, {
    method: 'GET',
    token: shopA.token,
  });

  if (historyRes.status !== 200 || !historyRes.body.data?.versions) {
    console.error('❌ Failed to fetch profile history:', historyRes.body);
    process.exit(1);
  }

  const profileHistory = historyRes.body.data;
  const versions = profileHistory.versions || [];
  console.log(`Retrieved ${versions.length} versions from history:`);
  for (const v of versions) {
    console.log(` - Version ${v.versionNumber} (isCurrent: ${v.isCurrent}): Chest = ${v.values.Chest}`);
  }

  const v1 = versions.find((v: any) => v.versionNumber === 1);
  const v2 = versions.find((v: any) => v.versionNumber === 2);

  const v1Correct = v1 && Number(v1.values?.Chest) === 40 && v1.isCurrent === false;
  const v2Correct = v2 && Number(v2.values?.Chest) === 41 && v2.isCurrent === true;
  const currentVersionMatches = Number(profileHistory.currentVersion?.values?.Chest) === 41;

  const testCPassed = Boolean(v1Correct && v2Correct && currentVersionMatches && versions.length === 2);

  // Summary Report
  console.log('\n================================================================');
  console.log(' FINAL TEST RESULTS SUMMARY');
  console.log('================================================================');
  console.log(`(a) Shop A sees only its own profile:       ${testAPassed ? 'PASS' : 'FAIL'}`);
  console.log(`(b) Shop B sees only its own profile:       ${testBPassed ? 'PASS' : 'FAIL'}`);
  console.log(`(c) Version history preserved correctly:    ${testCPassed ? 'PASS' : 'FAIL'}`);
  console.log(`(d) Direct cross-tenant access blocked:    ${directAccessBlocked ? 'PASS (404)' : 'FAIL'}`);
  console.log('================================================================\n');

  if (testAPassed && testBPassed && testCPassed && directAccessBlocked) {
    console.log('🎉 ALL CROSS-TENANT ISOLATION & VERSION HISTORY CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ ONE OR MORE CHECKS FAILED!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
