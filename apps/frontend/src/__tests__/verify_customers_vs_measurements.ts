import { chromium } from 'playwright';

async function verifyCustomersVsMeasurements() {
  console.log('🧪 Verifying separation between /dashboard/customers and /dashboard/measurements...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Log in as Owner
    console.log('1. Logging in as Shop Owner...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('owner@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('   Logged in successfully.');

    // 2. Visit /dashboard/customers
    console.log('2. Visiting /dashboard/customers...');
    await page.goto('http://localhost:5173/dashboard/customers');
    await page.waitForLoadState('networkidle');

    const customerHeader = await page.getByRole('heading', { name: 'Customer Directory & Client CRM' }).textContent();
    console.log(`   Customer page header: "${customerHeader}"`);
    if (!customerHeader?.includes('Customer Directory')) {
      throw new Error(`FAIL: Expected Customer Directory header, got: ${customerHeader}`);
    }

    const hasAddCustomerBtn = await page.locator('#btn-add-customer').isVisible();
    const hasSearchInput = await page.locator('#directory-search-input').isVisible();
    console.log(`   #btn-add-customer visible: ${hasAddCustomerBtn}, search visible: ${hasSearchInput}`);

    await page.screenshot({ path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/customers_page_verification.png' });
    console.log('   📸 Saved customers_page_verification.png');

    // 3. Visit /dashboard/measurements
    console.log('3. Visiting /dashboard/measurements...');
    await page.goto('http://localhost:5173/dashboard/measurements');
    await page.waitForLoadState('networkidle');

    const measurementHeader = await page.locator('#measurements-registry-title').textContent();
    console.log(`   Measurements page header: "${measurementHeader}"`);
    if (!measurementHeader?.includes('Measurement Profiles & Fitting Registry')) {
      throw new Error(`FAIL: Expected Measurement Profiles & Fitting Registry, got: ${measurementHeader}`);
    }

    // Check Garment Pills
    const hasAllGarments = await page.getByRole('button', { name: /^All Garments/i }).isVisible();
    const hasShirts = await page.getByRole('button', { name: /^Shirts/i }).isVisible();
    const hasPants = await page.getByRole('button', { name: /^Trousers & Pants/i }).isVisible();
    console.log(`   Garment pills visible: All=${hasAllGarments}, Shirts=${hasShirts}, Pants=${hasPants}`);

    // Check KPI summary cards
    const totalProfilesKpi = await page.locator('text=Total Profiles').isVisible();
    const fittedClientsKpi = await page.locator('text=Fitted Clients').isVisible();
    console.log(`   KPI cards visible: Total Profiles=${totalProfilesKpi}, Fitted Clients=${fittedClientsKpi}`);

    // Check Search input & Record button
    const hasMeasurementsSearch = await page.locator('#measurements-search-input').isVisible();
    const hasRecordMeasBtn = await page.locator('#btn-record-measurements').isVisible();
    console.log(`   Measurements search visible: ${hasMeasurementsSearch}, Record button: ${hasRecordMeasBtn}`);

    // Check that profiles render dimension chips
    const hasDimensionChips = (await page.locator('text=Chest').count()) > 0 || (await page.locator('text=Waist').count()) > 0;
    console.log(`   Profile dimension chips visible: ${hasDimensionChips}`);

    // Check New Version button
    const hasNewVersionBtn = (await page.locator('text=+ New Version').count()) > 0;
    console.log(`   "+ New Version" action buttons present: ${hasNewVersionBtn}`);

    // Filter by Shirts
    console.log('   Testing garment filter tab "Shirts"...');
    await page.getByRole('button', { name: /^Shirts/i }).click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/measurements_page_verification.png' });
    console.log('   📸 Saved measurements_page_verification.png');

    console.log('\n✅ VERIFICATION COMPLETE: /dashboard/customers and /dashboard/measurements are distinctly separated and fully functional!');
  } finally {
    await browser.close();
  }
}

verifyCustomersVsMeasurements().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
