import { chromium } from 'playwright';

async function testReportsPage() {
  console.log('🚀 Starting E2E Click-through Audit of Reports & Analytics Page...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Log in as Shop Owner
    console.log('1. Logging in as Shop Owner...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('owner@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('   ✅ Owner logged in successfully.');

    // 2. Navigate to /dashboard/reports
    console.log('2. Navigating to /dashboard/reports...');
    await page.goto('http://localhost:5173/dashboard/reports');
    await page.waitForLoadState('networkidle');

    const titleText = await page.locator('#reports-page-title').textContent();
    console.log(`   Page Title: "${titleText}"`);
    if (!titleText?.includes('Reports & Business Analytics')) {
      throw new Error(`FAIL: Unexpected title: ${titleText}`);
    }

    // 3. Tab 1: Revenue & Financials
    console.log('3. Auditing Tab 1: Revenue & Financials...');
    await page.locator('#tab-revenue').click();
    await page.waitForTimeout(600);

    const totalRevText = await page.locator('#stat-total-revenue').textContent();
    const outBalText = await page.locator('#stat-outstanding-balance').textContent();
    console.log(`   Total Revenue rendered: ${totalRevText}`);
    console.log(`   Outstanding Balance rendered: ${outBalText}`);
    if (!totalRevText || !totalRevText.includes('₹')) {
      throw new Error('FAIL: Revenue metric card missing currency symbol');
    }

    await page.screenshot({
      path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/reports_revenue_tab.png',
    });
    console.log('   📸 Saved reports_revenue_tab.png');

    // 4. Tab 2: Order Volumes & SLA
    console.log('4. Auditing Tab 2: Order Volumes & SLA...');
    await page.locator('#tab-orders').click();
    await page.waitForTimeout(600);

    const totalOrdersText = await page.locator('#stat-total-orders').textContent();
    const turnaroundText = await page.locator('#stat-avg-turnaround').textContent();
    console.log(`   Total Orders rendered: ${totalOrdersText}`);
    console.log(`   Avg Turnaround SLA rendered: ${turnaroundText}`);
    if (!totalOrdersText || parseInt(totalOrdersText) <= 0) {
      console.warn('   Note: Total orders count is zero or empty in default range');
    }

    await page.screenshot({
      path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/reports_orders_tab.png',
    });
    console.log('   📸 Saved reports_orders_tab.png');

    // 5. Tab 3: Staff Performance
    console.log('5. Auditing Tab 3: Staff Performance (Owner Confidential)...');
    await page.locator('#tab-staff').click();
    await page.waitForTimeout(600);

    const staffCountText = await page.locator('#stat-staff-count').textContent();
    const staffRows = await page.locator('#table-staff-performance tbody tr').count();
    console.log(`   Staff Count: ${staffCountText}, Performance Table Rows: ${staffRows}`);
    if (staffRows === 0) {
      throw new Error('FAIL: Staff performance table has no rows');
    }

    await page.screenshot({
      path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/reports_staff_tab.png',
    });
    console.log('   📸 Saved reports_staff_tab.png');

    // 6. Tab 4: Fabric Consumption
    console.log('6. Auditing Tab 4: Fabric Consumption & Stock Valuation...');
    await page.locator('#tab-fabric').click();
    await page.waitForTimeout(600);

    const metersConsumedText = await page.locator('#stat-meters-consumed').textContent();
    const inStockValuationText = await page.locator('#stat-instock-valuation').textContent();
    const fabricRows = await page.locator('#table-fabric-ledger tbody tr').count();
    console.log(`   Meters Consumed: ${metersConsumedText}`);
    console.log(`   In-Stock Valuation: ${inStockValuationText}`);
    console.log(`   Fabric Ledger Rows: ${fabricRows}`);
    if (fabricRows === 0) {
      throw new Error('FAIL: Fabric consumption ledger table has no rows');
    }

    await page.screenshot({
      path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/reports_fabric_tab.png',
    });
    console.log('   📸 Saved reports_fabric_tab.png');

    // 7. Test Date Range Presets & Empty State Handling (Year 2099)
    console.log('7. Testing Custom Date Range in Year 2099 for Empty State Handling...');
    await page.locator('#preset-custom').click();
    await page.waitForTimeout(300);

    await page.locator('#input-custom-from').fill('2099-01-01');
    await page.locator('#input-custom-to').fill('2099-01-31');
    await page.locator('#btn-apply-custom-range').click();
    await page.waitForTimeout(800);

    const emptyMetersText = await page.locator('#stat-meters-consumed').textContent();
    console.log(`   Year 2099 meters consumed: ${emptyMetersText}`);
    if (emptyMetersText?.trim() !== '0 m') {
      throw new Error(`FAIL: Expected '0 m' in year 2099, got: ${emptyMetersText}`);
    }

    // Switch back to Revenue tab under year 2099 to verify empty state message
    await page.locator('#tab-revenue').click();
    await page.waitForTimeout(600);
    const emptyRevText = await page.locator('#stat-total-revenue').textContent();
    console.log(`   Year 2099 total revenue: ${emptyRevText}`);
    const hasEmptyMsg = await page.locator('text=No revenue data recorded for this period').isVisible();
    console.log(`   "No revenue data recorded for this period" empty state displayed: ${hasEmptyMsg}`);
    if (!hasEmptyMsg) {
      throw new Error('FAIL: Empty state message not displayed for zero revenue period');
    }

    // 8. Test Staff Role Access to Reports
    console.log('8. Testing Staff Role Navigation Protection...');
    // Log out or clear auth
    await page.evaluate(() => localStorage.removeItem('darzi_auth'));

    // Log in as Staff
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('priya.sales@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('   Logged in as Staff.');

    // Attempt direct URL access to /dashboard/reports
    console.log('   Attempting direct navigation to /dashboard/reports as Staff...');
    await page.goto('http://localhost:5173/dashboard/reports');
    await page.waitForTimeout(800);

    const currentUrl = page.url();
    console.log(`   Staff final URL after accessing reports: ${currentUrl}`);
    if (currentUrl.includes('/reports')) {
      throw new Error(`FAIL: Staff should have been redirected, but remained at: ${currentUrl}`);
    }
    console.log('   ✅ Staff was properly redirected to:', currentUrl);

    console.log('\n🎉 ALL REPORTS E2E BROWSER TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testReportsPage().catch((err) => {
  console.error('\n❌ REPORTS E2E TEST FAILED:', err);
  process.exit(1);
});
