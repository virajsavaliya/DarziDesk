import { chromium } from 'playwright';

async function testStaffDeleteAndRole() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Logging in as Shop Owner...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#business-slug').fill('shree-ganesh-tailors');
  await page.locator('#business-email').fill('owner@shreeganesh.com');
  await page.locator('#business-password').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });

  console.log('2. Navigating to /dashboard/staff...');
  await page.goto('http://localhost:5173/dashboard/staff');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot of the staff list with delete buttons and role selectors
  await page.screenshot({
    path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/staff_list_with_actions.png',
  });
  console.log('   📸 Captured staff list with action buttons.');

  // Check Add Staff drawer has role selector
  console.log('3. Opening Add Staff Drawer...');
  await page.locator('#btn-add-staff').click();
  await page.waitForSelector('#select-staff-role');
  await page.screenshot({
    path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/add_staff_drawer_with_role.png',
  });
  console.log('   📸 Captured Add Staff drawer with role selector.');
  await page.locator('button[aria-label="Close drawer"]').click();
  await page.waitForTimeout(400);

  // Test Delete Staff Member flow
  console.log('4. Testing Delete Staff Confirmation...');
  const firstDeleteBtn = page.locator('button[id^="btn-delete-staff-"]').first();
  await firstDeleteBtn.click();
  await page.waitForSelector('#confirm-delete-staff-btn');

  await page.screenshot({
    path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/delete_staff_confirmation_modal.png',
  });
  console.log('   📸 Captured delete staff confirmation modal.');

  // Click Confirm Delete
  await page.locator('#confirm-delete-staff-btn').click();
  await page.waitForSelector('text=Staff member removed successfully');
  await page.waitForTimeout(500);

  await page.screenshot({
    path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/staff_deleted_success.png',
  });
  console.log('   📸 Captured successful deletion state with notification toast.');

  await browser.close();
  console.log('🎉 Test completed successfully!');
}

testStaffDeleteAndRole().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
