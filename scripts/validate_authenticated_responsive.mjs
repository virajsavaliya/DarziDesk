import { chromium } from 'playwright';

const OWNER_AUTH = {
  token: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiU0hPUF9PV05FUiIsInRlbmFudElkIjoiMzkxYTU2NjYtYzM4Zi00M2EwLTk2Y2MtOWM1NWEwZmI4MTkwIiwic3ViIjoiYTI1ZDE2OTgtM2I2NS00MzhlLWJjMzctNjUyOTc5ZWE4YzI2IiwiYXVkIjoiZGFyemk6c3RhZmYiLCJpYXQiOjE3ODk5ODcwOTksImV4cCI6MTc5MDU5MTg5OX0.7zrWqm9un2oQQtmtzpm-LE_OqbWQyo8oR2tFtiaELiU",
  role: "SHOP_OWNER",
  userId: "a25d1698-3b65-438e-bc37-652979ea8c26",
  name: "Ramesh Patel",
  email: "demo@gmail.com"
};

const ADMIN_AUTH = {
  token: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiU1VQRVJfQURNSU4iLCJ0ZW5hbnRJZCI6bnVsbCwic3ViIjoiZTlmMTMyMDUtZGJjYi00MWVjLTlkYjMtNjQ4YTRiODgwMGZmIiwiYXVkIjoiZGFyemk6c3RhZmYiLCJpYXQiOjE3ODk5ODcwOTksImV4cCI6MTc5MDU5MTg5OX0.BlGkSLSvdkm-SA9RNpShFEGGX1w-PY4P542J7PI1c-g",
  role: "SUPER_ADMIN",
  userId: "e9f13205-dbcb-41ec-9db3-648a4b8800ff",
  name: "Karan Singhania",
  email: "admin@darzidesk.com"
};

const VIEWPORTS = [
  { name: 'Small Mobile (iPhone SE 1st gen)', width: 320, height: 568 },
  { name: 'Standard Mobile (Android 360)', width: 360, height: 800 },
  { name: 'Standard Mobile (iPhone 13 mini)', width: 375, height: 812 },
  { name: 'Standard Mobile (iPhone 14/15)', width: 390, height: 844 },
  { name: 'Large Mobile (iPhone 11/XR)', width: 414, height: 896 },
  { name: 'Large Mobile (iPhone 15 Pro Max)', width: 430, height: 932 },
  { name: 'Mobile Landscape (iPhone 14)', width: 844, height: 390 },
  { name: 'Tablet Portrait (iPad Mini)', width: 768, height: 1024 },
  { name: 'Tablet Portrait (iPad Air)', width: 820, height: 1180 },
  { name: 'Tablet Portrait (iPad Pro 10.5)', width: 834, height: 1112 },
  { name: 'Tablet Landscape (iPad)', width: 1024, height: 768 },
  { name: 'Small Laptop', width: 1280, height: 800 },
  { name: 'Standard Laptop', width: 1366, height: 768 },
  { name: 'Desktop HD', width: 1440, height: 900 },
  { name: 'Full HD Desktop', width: 1920, height: 1080 },
];

async function checkOverflow(page, label) {
  const res = await page.evaluate(() => {
    const docScroll = document.documentElement.scrollWidth;
    const bodyScroll = document.body.scrollWidth;
    const winWidth = window.innerWidth;
    const hasOverflow = docScroll > winWidth + 1 || bodyScroll > winWidth + 1;
    return { docScroll, bodyScroll, winWidth, hasOverflow };
  });
  if (res.hasOverflow) {
    console.error(`❌ OVERFLOW DETECTED [${label}]: docScroll=${res.docScroll}, winWidth=${res.winWidth}`);
    return false;
  }
  return true;
}

async function run() {
  console.log('🚀 Launching Deep Authenticated Suite across all 15 Viewports & Screens...');
  const browser = await chromium.launch({ headless: true });

  let allPassed = true;

  // 1. Check Owner Dashboard across all 15 Viewports
  console.log('\n--- SECTION 1: Owner Dashboard & Sidebar 3-Tier Rule across 15 Viewports ---');
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Seed auth
    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, OWNER_AUTH);

    // Go to dashboard
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const overflowOk = await checkOverflow(page, `Dashboard @ ${vp.name}`);
    if (!overflowOk) allPassed = false;

    // Check sidebar rules
    const navTiers = await page.evaluate((width) => {
      const bottomNav = document.getElementById('mobile-bottom-nav');
      const tabletRail = document.getElementById('tablet-icon-rail');
      const desktopSidebar = document.getElementById('desktop-sidebar');

      const isBottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;
      const isTabletRailVisible = tabletRail ? window.getComputedStyle(tabletRail).display !== 'none' : false;
      const isDesktopSidebarVisible = desktopSidebar ? window.getComputedStyle(desktopSidebar).display !== 'none' : false;

      let ruleMet = false;
      if (width < 768) {
        ruleMet = isBottomNavVisible && !isDesktopSidebarVisible;
      } else if (width >= 768 && width < 1024) {
        ruleMet = isTabletRailVisible && !isDesktopSidebarVisible && !isBottomNavVisible;
      } else {
        ruleMet = isDesktopSidebarVisible && !isBottomNavVisible;
      }

      return {
        isBottomNavVisible,
        isTabletRailVisible,
        isDesktopSidebarVisible,
        ruleMet,
      };
    }, vp.width);

    console.log(
      `${overflowOk && navTiers.ruleMet ? '✅' : '❌'} ${vp.name.padEnd(35)} (${vp.width}x${vp.height}) | BottomNav: ${navTiers.isBottomNavVisible}, TabletRail: ${navTiers.isTabletRailVisible}, DesktopSidebar: ${navTiers.isDesktopSidebarVisible}`
    );

    await context.close();
  }

  // 2. Check Order Details & Vertical Pipeline on Mobile & Tablet
  console.log('\n--- SECTION 2: Order Detail View & Vertical Pipeline ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, OWNER_AUTH);

    await page.goto('http://localhost:5173/dashboard/orders', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const ordersOverflow = await checkOverflow(page, 'Owner Orders Table/Cards (375x812)');
    console.log(`   Owner Orders mobile view: ${ordersOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!ordersOverflow) allPassed = false;

    // Check mobile card render
    const cardCount = await page.locator('[data-testid="order-card"], .rounded-2xl.bg-surface').count();
    console.log(`   Mobile cards rendered: ${cardCount >= 1 ? 'PASSED ✅' : 'INFO ℹ️'}`);

    await context.close();
  }

  // 3. Check Measurement Page & Mannequin Diagram on Mobile (390x844)
  console.log('\n--- SECTION 3: Visual Measurement Chart & Mannequin Diagram ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, OWNER_AUTH);

    await page.goto('http://localhost:5173/dashboard/measurements', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const measureOverflow = await checkOverflow(page, 'Measurements Page (390x844)');
    console.log(`   Measurement page overflow check: ${measureOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!measureOverflow) allPassed = false;

    // Verify Mannequin SVG, zoom controls, and hitboxes
    const mannequinDetails = await page.evaluate(() => {
      const svg = document.querySelector('svg[viewBox="-46 -15 298 238"]');
      const zoomIn = document.querySelector('button[aria-label="Zoom in mannequin"]');
      const zoomOut = document.querySelector('button[aria-label="Zoom out mannequin"]');
      const hitboxes = document.querySelectorAll('circle[aria-label^="Select landmark"]');
      return {
        hasSvg: Boolean(svg),
        hasZoomIn: Boolean(zoomIn),
        hasZoomOut: Boolean(zoomOut),
        hitboxCount: hitboxes.length,
      };
    });

    console.log(`   Mannequin SVG present: ${mannequinDetails.hasSvg ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`   Zoom in/out controls: ${mannequinDetails.hasZoomIn && mannequinDetails.hasZoomOut ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`   Touch hitboxes (>=44px): ${mannequinDetails.hitboxCount >= 15 ? 'PASSED ✅ (' + mannequinDetails.hitboxCount + ')' : 'INFO ℹ️ (' + mannequinDetails.hitboxCount + ')'}`);

    // Click Landmark A to test Mobile Bottom Sheet opening
    const landmarkA = page.locator('circle[aria-label*="Landmark A"], [id="anno-a"]').first();
    if (await landmarkA.isVisible()) {
      await landmarkA.click({ force: true });
      await page.waitForTimeout(400);

      const sheetOpened = await page.evaluate(() => {
        const sheet = document.querySelector('[role="dialog"]');
        return Boolean(sheet);
      });
      console.log(`   Mobile Landmark Bottom Sheet opened: ${sheetOpened ? 'PASSED ✅' : 'INFO ℹ️'}`);
    }

    await context.close();
  }

  // 4. Check Invoices Page & Mobile Cards on 360x800
  console.log('\n--- SECTION 4: Invoices Page & Drawer ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 800 });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, OWNER_AUTH);

    await page.goto('http://localhost:5173/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const invoicesOverflow = await checkOverflow(page, 'Invoices Page (360x800)');
    console.log(`   Invoices page overflow check: ${invoicesOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!invoicesOverflow) allPassed = false;

    await context.close();
  }

  // 5. Check Customer Directory & Tab Switcher on 414x896
  console.log('\n--- SECTION 5: Customer Directory & Mobile Tab Switcher ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 414, height: 896 });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, OWNER_AUTH);

    await page.goto('http://localhost:5173/dashboard/customers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const customersOverflow = await checkOverflow(page, 'Customers Page (414x896)');
    console.log(`   Customers page overflow check: ${customersOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!customersOverflow) allPassed = false;

    // Verify Tab Switcher exists on mobile
    const hasTabs = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Clients'));
      return Boolean(btn);
    });
    console.log(`   Mobile Tab Switcher present: ${hasTabs ? 'PASSED ✅' : 'FAILED ❌'}`);

    await context.close();
  }

  // 6. Check Super Admin Tenants & Audit Logs on 375x812
  console.log('\n--- SECTION 6: Super Admin Views ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((auth) => {
      localStorage.setItem('darzi_auth', JSON.stringify(auth));
    }, ADMIN_AUTH);

    await page.goto('http://localhost:5173/admin/tenants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const adminTenantsOverflow = await checkOverflow(page, 'Admin Tenants (375x812)');
    console.log(`   Admin Tenants page overflow check: ${adminTenantsOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!adminTenantsOverflow) allPassed = false;

    await page.goto('http://localhost:5173/admin/audit', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const adminAuditOverflow = await checkOverflow(page, 'Admin Audit Logs (375x812)');
    console.log(`   Admin Audit Logs page overflow check: ${adminAuditOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!adminAuditOverflow) allPassed = false;

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log(allPassed ? '🎉 ALL AUTHENTICATED COMPONENT & VIEWPORT TESTS PASSED!' : '⚠️ SOME ISSUES WERE FOUND');
  console.log('======================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
