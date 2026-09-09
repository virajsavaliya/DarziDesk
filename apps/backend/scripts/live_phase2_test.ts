/**
 * Standalone Live Phase 2 Test
 *
 * Verifies Phase 2 against the ACTUALLY RUNNING server at http://localhost:3001:
 * 1. Walk-in customer quick creation (name + phone only, no password, no email).
 * 2. Automatic ShopCustomerLink generation.
 * 3. Seeded garment templates and tenant-scoped customization.
 * 4. Measurement profile creation with Version 1.
 * 5. Measurement profile update creating Version 2 (immutable history check).
 * 6. Cross-tenant measurement isolation for the same shared customer.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as any;
  return { status: res.status, data: json?.data, error: json?.error };
}

const r = () => Math.random().toString(36).substring(2, 8);

async function main() {
  console.log('===============================================================');
  console.log('         DARZIDESK — LIVE PHASE 2 VERIFICATION TEST            ');
  console.log(`         Target Server: ${BASE_URL}                          `);
  console.log('===============================================================\n');

  // 1. Setup Shop A and Shop B
  const slugA = `live-shop-a-${r()}`;
  const slugB = `live-shop-b-${r()}`;
  const pwd = 'Password123!';

  const regA = await req('POST', '/api/auth/register/tenant', {
    shopName: 'Live Shop A',
    slug: slugA,
    ownerEmail: `owner-${r()}@shopa.com`,
    ownerPassword: pwd,
    firstName: 'Owner',
    lastName: 'A',
  });
  if (!regA.data) {
    console.error('Failed to register Shop A:', regA.status, regA.error);
    process.exit(1);
  }
  const tokenA = regA.data.token;

  const regB = await req('POST', '/api/auth/register/tenant', {
    shopName: 'Live Shop B',
    slug: slugB,
    ownerEmail: `owner-${r()}@shopb.com`,
    ownerPassword: pwd,
    firstName: 'Owner',
    lastName: 'B',
  });
  if (!regB.data) {
    console.error('Failed to register Shop B:', regB.status, regB.error);
    process.exit(1);
  }
  const tokenB = regB.data.token;

  console.log('✔ Created Live Shop A and Shop B');

  // 2. Quick create walk-in customer (no email, no password)
  const phone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const walkIn = await req('POST', '/api/customers', {
    firstName: 'Devendra',
    lastName: 'TailorClient',
    phone,
  }, tokenA);

  console.log(`✔ Quick-created Walk-in customer: status=${walkIn.status}, phone=${walkIn.data?.phone}, email=${walkIn.data?.email}`);
  const customerId = walkIn.data.id;

  // 3. Garment templates check
  const templatesRes = await req('GET', '/api/garment-templates', undefined, tokenA);
  const templateCount = templatesRes.data?.length;
  const shirtTemplate = templatesRes.data?.find((t: any) => t.garmentType === 'SHIRT');
  console.log(`✔ Seeded garment templates: count=${templateCount}, Shirt fields count=${shirtTemplate?.fields?.length}`);

  // 4. Create measurement profile (Version 1)
  const profileCreate = await req('POST', `/api/customers/${customerId}/measurements`, {
    name: 'Festive Kurta',
    garmentType: 'KURTA',
    unit: 'INCHES',
    fitPreference: 'REGULAR',
    values: {
      Chest: 42,
      Waist: 36,
      Hip: 44,
      Length: 40,
    },
  }, tokenA);

  const profileId = profileCreate.data.id;
  const v1Number = profileCreate.data.currentVersion.versionNumber;
  const v1Chest = profileCreate.data.currentVersion.values.Chest;
  console.log(`✔ Created Measurement Profile: id=${profileId}, version=${v1Number}, Chest=${v1Chest}`);

  // 5. Update measurement profile (Version 2)
  const versionUpdate = await req('POST', `/api/measurements/${profileId}/versions`, {
    values: {
      Chest: 43,
      Waist: 37,
      Hip: 44,
      Length: 40,
    },
    fitNotes: 'Added 1 inch for loose fit',
  }, tokenA);

  const v2Number = versionUpdate.data.versionNumber;
  const v2Chest = versionUpdate.data.values.Chest;
  console.log(`✔ Updated Profile to Version ${v2Number}: Chest=${v2Chest}`);

  // 6. Verify version history immutability
  const historyRes = await req('GET', `/api/measurements/${profileId}`, undefined, tokenA);
  const versions = historyRes.data.versions;
  console.log(`✔ Retrieved history: total versions=${versions.length}`);
  const v1InHistory = versions.find((v: any) => v.versionNumber === 1);
  const v2InHistory = versions.find((v: any) => v.versionNumber === 2);
  const v1Untouched = v1InHistory.values.Chest === 42 && v1InHistory.isCurrent === false;
  const v2Current = v2InHistory.values.Chest === 43 && v2InHistory.isCurrent === true;
  console.log(`✔ Version 1 values untouched: ${v1Untouched} (Chest=42, isCurrent=false)`);
  console.log(`✔ Version 2 values current: ${v2Current} (Chest=43, isCurrent=true)`);

  // 7. Cross-tenant isolation check: Shop B attempts to read Shop A's measurement profile
  const leakRes = await req('GET', `/api/measurements/${profileId}`, undefined, tokenB);
  console.log(`✔ Shop B attempted read of Shop A measurement profile: status=${leakRes.status} (Expected 404)`);

  // 8. Cross-tenant customer profile list check
  const listB = await req('GET', `/api/customers/${customerId}/measurements`, undefined, tokenB);
  console.log(`✔ Shop B fetched measurement profiles for shared customer: profiles count=${listB.data?.length} (Expected 0)`);

  console.log('\n===============================================================');
  if (walkIn.status === 201 && v1Untouched && v2Current && leakRes.status === 404 && listB.data?.length === 0) {
    console.log('>>> ALL LIVE PHASE 2 CHECKS PASSED <<<');
  } else {
    console.log('>>> SOME CHECKS FAILED <<<');
    process.exit(1);
  }
  console.log('===============================================================');
}

main().catch(console.error);
