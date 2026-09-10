import { chromium } from 'playwright';

async function testRefreshPersistence() {
  console.log('🚀 Testing Auth Persistence across Page Refreshes...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('owner@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('  1. Logged in successfully. Current URL:', page.url());

    // 2. Perform 3 consecutive reloads on /dashboard/home
    for (let i = 1; i <= 3; i++) {
      console.log(`  2.${i} Reloading page (attempt ${i})...`);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error(`FAIL: Got logged out and redirected to /login on reload #${i}`);
      }
      console.log(`     ✅ Kept login after reload #${i}, URL: ${currentUrl}`);
    }

    // 3. Navigate to /dashboard/customers and reload
    console.log('  3. Navigating to /dashboard/customers...');
    await page.goto('http://localhost:5173/dashboard/customers');
    await page.waitForLoadState('networkidle');
    console.log('     Current URL before reload:', page.url());

    console.log('     Reloading /dashboard/customers...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      throw new Error('FAIL: Got logged out on /dashboard/customers reload');
    }
    console.log('     ✅ Maintained session on /dashboard/customers, URL:', page.url());

    // 4. Navigate to /dashboard/measurements and reload
    console.log('  4. Navigating to /dashboard/measurements...');
    await page.goto('http://localhost:5173/dashboard/measurements');
    await page.waitForLoadState('networkidle');

    console.log('     Reloading /dashboard/measurements...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      throw new Error('FAIL: Got logged out on /dashboard/measurements reload');
    }
    console.log('     ✅ Maintained session on /dashboard/measurements, URL:', page.url());

    console.log('\n🎉 ALL REFRESH TESTS PASSED: User session survives all page reloads perfectly without logging out!');
  } finally {
    await browser.close();
  }
}

testRefreshPersistence().catch((err) => {
  console.error('\n❌ REFRESH TEST FAILED:', err);
  process.exit(1);
});
