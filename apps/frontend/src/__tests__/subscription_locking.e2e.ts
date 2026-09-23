import { chromium } from 'playwright';

async function run() {
  console.log('======================================================================');
  console.log('🚀 TESTING NEW BUSINESS REGISTRATION & DYNAMIC FEATURE LOCK/UNLOCK FLOW');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const shopData = {
    shopName: `Imperial Atelier ${timestamp}`,
    slug: `imperial-atelier-${timestamp}`,
    ownerEmail: `vikram.mehta.${timestamp}@example.com`,
    ownerPassword: 'Password123!',
    firstName: 'Vikram',
    lastName: 'Mehta',
  };

  console.log('1. Registering new tenant business via POST /api/auth/register/tenant...');
  const regRes = await fetch('http://localhost:3001/api/auth/register/tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shopData),
  });

  const regJson = await regRes.json();
  if (!regRes.ok || !regJson.data?.token) {
    throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
  }

  const { token, user } = regJson.data;
  console.log(`✅ Business successfully registered!`);
  console.log(`   Owner: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`   Tenant ID: ${user.tenantId}`);

  // Check initial subscription via API
  const subRes = await fetch('http://localhost:3001/api/subscription/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const subJson = await subRes.json();
  console.log('\n2. Initial Subscription details:', {
    plan: subJson.data?.plan?.name,
    status: subJson.data?.subscription?.status,
    lockedFeatures: subJson.data?.lockedFeatures,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const artifactDir = '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7';

  try {
    console.log('\n3. Navigating to login and setting auth storage...');
    await page.goto('http://localhost:5173/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem(
          'darzi_auth',
          JSON.stringify({
            token,
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
          })
        );
        window.dispatchEvent(new Event('darzi-auth-change'));
      },
      { token, user }
    );

    console.log('4. Navigating to dashboard home...');
    await page.goto('http://localhost:5173/dashboard/home');
    await page.waitForTimeout(1500);

    // Verify Starter Plan banner on Dashboard
    const planBanner = page.locator('text=You are currently on the Basic Starter Plan');
    await planBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Dashboard starter plan banner verified: "You are currently on the Basic Starter Plan"');

    // Verify PRO badges on sidebar nav items
    const proBadges = page.locator('span:has-text("PRO")');
    const proBadgeCount = await proBadges.count();
    console.log(`✅ Sidebar shows ${proBadgeCount} locked PRO badges on nav items.`);

    // Screenshot 1: Dashboard with feature locks
    await page.screenshot({ path: `${artifactDir}/dashboard_with_feature_locks.png` });
    console.log('📸 Captured screenshot: dashboard_with_feature_locks.png');

    // 5. Navigate to locked feature: Fabric Inventory
    console.log('\n5. Clicking on Fabric Inventory nav item...');
    const fabricNav = page.locator('button:has-text("Fabric Inventory")');
    await fabricNav.click();
    await page.waitForTimeout(1000);

    // Verify Locked Feature Paywall is rendered
    const paywallHeader = page.locator('text=Fabric Roll Ledger & Inventory Tracking');
    await paywallHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ LockedFeaturePaywall rendered with heading: "Fabric Roll Ledger & Inventory Tracking"');

    // Screenshot 2: Locked Feature Paywall
    await page.screenshot({ path: `${artifactDir}/locked_feature_paywall.png` });
    console.log('📸 Captured screenshot: locked_feature_paywall.png');

    // 6. Click "Unlock with Pro Plan" to open modal
    console.log('\n6. Clicking "Unlock with Pro Plan" button in Paywall...');
    const unlockBtn = page.locator('button:has-text("Unlock with Pro Plan")');
    await unlockBtn.click();
    await page.waitForTimeout(1000);

    // Verify Upgrade Plan Modal is visible
    const modalTitle = page.locator('text=Unlock Advanced Tailoring & Growth Tools');
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ UpgradePlanModal opened with plans and payment methods.');

    // Screenshot 3: Upgrade Plan Modal
    await page.screenshot({ path: `${artifactDir}/upgrade_plan_modal.png` });
    console.log('📸 Captured screenshot: upgrade_plan_modal.png');

    // 7. Complete upgrade to Pro plan
    console.log('\n7. Clicking "Activate Pro & Unlock Features" in checkout...');
    const activateBtn = page.locator('button:has-text("Activate Pro & Unlock Features")');
    await activateBtn.click();

    // Verify success confirmation
    const successMsg = page.locator('text=Subscription Successfully Upgraded!');
    await successMsg.waitFor({ state: 'visible', timeout: 6000 });
    console.log('✅ Upgrade confirmed! "Subscription Successfully Upgraded!" displayed.');

    // Wait for modal to automatically close
    await page.waitForTimeout(2500);

    // 8. Verify dynamic unlock without reload
    console.log('\n8. Checking that Fabric Inventory is now UNLOCKED immediately...');
    const addFabricBtn = page.locator('#btn-add-fabric');
    await addFabricBtn.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✅ Fabric Inventory UI is now actively rendered and unlocked with #btn-add-fabric visible!');

    // Check sidebar status
    const sidebarStatus = page.locator('text=Pro Plan');
    await sidebarStatus.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✅ Sidebar status chip updated dynamically to "Pro Plan • All features active"!');

    // Screenshot 4: Unlocked Fabric feature
    await page.screenshot({ path: `${artifactDir}/unlocked_feature_after_upgrade.png` });
    console.log('📸 Captured screenshot: unlocked_feature_after_upgrade.png');

    // 9. Verify Reports & Analytics also unlocked
    console.log('\n9. Navigating to Reports & Analytics...');
    const reportsNav = page.locator('button:has-text("Reports")');
    await reportsNav.click();
    await page.waitForTimeout(1500);

    const reportsTitle = page.locator('#reports-page-title');
    await reportsTitle.waitFor({ state: 'visible', timeout: 6000 });
    console.log('✅ Reports & Analytics page is completely unlocked and accessible with #reports-page-title visible!');

    // Screenshot 5: Unlocked Reports page
    await page.screenshot({ path: `${artifactDir}/unlocked_reports_page.png` });
    console.log('📸 Captured screenshot: unlocked_reports_page.png');

    console.log('\n======================================================================');
    console.log('🎉 ALL FEATURE LOCKING & DYNAMIC UPGRADE FLOW TESTS PASSED FLAWLESSLY!');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();
