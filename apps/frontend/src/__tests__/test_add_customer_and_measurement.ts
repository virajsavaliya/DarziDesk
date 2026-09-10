import { chromium } from 'playwright';

async function testAddCustomerAndMeasurement() {
  console.log('🚀 Testing Add Customer and Add Measurement Workflows...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login as Owner
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('owner@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('  Logged in, URL:', page.url());

    // 2. Navigate to Customers directory
    await page.goto('http://localhost:5173/dashboard/customers');
    await page.waitForLoadState('networkidle');
    console.log('  Navigated to:', page.url());

    // Verify "Add Customer" and "Record Measurements" buttons are present
    const addCustBtn = page.locator('#btn-add-customer');
    const recordMeasBtn = page.locator('#btn-record-measurements');
    if (await addCustBtn.count() === 0) throw new Error('FAIL: #btn-add-customer not found');
    if (await recordMeasBtn.count() === 0) throw new Error('FAIL: #btn-record-measurements not found');
    console.log('  ✅ Verified "Add Customer" and "Record Measurements" buttons exist in UI');

    // 3. Test Add Customer Flow
    console.log('  Opening Add Customer Drawer...');
    await addCustBtn.click();
    await page.waitForSelector('text=Add New Customer');

    const testCustName = `TestCustomer_${Date.now()}`;
    const testPhone = `9825${Math.floor(100000 + Math.random() * 900000)}`;

    await page.locator('#input-customer-firstname').fill(testCustName);
    await page.locator('#input-customer-lastname').fill('Patel');
    await page.locator('#input-customer-phone').fill(testPhone);
    await page.locator('#input-customer-email').fill(`${testCustName.toLowerCase()}@test.com`);

    console.log('  Submitting Add Customer form...');
    await page.locator('#btn-save-customer').click();
    await page.waitForSelector(`text=${testCustName}`, { timeout: 8000 });
    console.log(`  ✅ Successfully created new customer: ${testCustName}`);

    // 4. Test Record Measurement Flow
    console.log('  Opening Record Measurements Drawer...');
    const addMeasForCust = page.locator('#btn-add-measurement-for-customer');
    await addMeasForCust.click();
    await page.waitForSelector('text=Record New Measurements');

    // Set profile name
    await page.locator('#input-profile-name').fill('Executive 2-Piece Suit');

    // Click SHIRT garment type
    await page.getByRole('button', { name: 'SHIRT', exact: true }).click();

    // Fill in measurement values (Chest, Waist, Collar)
    await page.locator('#input-dimension-chest').fill('42.5');
    await page.locator('#input-dimension-waist').fill('36');

    // Add notes
    await page.locator('#input-fit-notes').fill('Slim fit cut with double cuffs and mother of pearl buttons');

    console.log('  Submitting Record Measurements form...');
    await page.locator('#btn-save-measurements').click();
    await page.waitForSelector('text=Executive 2-Piece Suit', { timeout: 8000 });
    console.log('  ✅ Successfully created new measurement profile: Executive 2-Piece Suit');

    // Verify measurement card displays the values
    const chestDisplay = await page.locator('text=42.5').count();
    const waistDisplay = await page.locator('text=36').count();
    if (chestDisplay === 0 || waistDisplay === 0) {
      throw new Error('FAIL: Measurement values not rendered on card');
    }
    console.log('  ✅ Measurement card properly rendered with Chest 42.5in and Waist 36in');

    console.log('\n🎉 ALL CUSTOMER AND MEASUREMENT ADDITION FLOWS VERIFIED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testAddCustomerAndMeasurement().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
