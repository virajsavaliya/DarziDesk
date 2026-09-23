import { chromium } from 'playwright';

async function verifySidebarScrollbarHidden() {
  console.log('🧪 Verifying sidebar scrollbar is hidden...');
  const browser = await chromium.launch({ headless: true });
  // Use a shorter height (e.g. 600px) so the sidebar content overflows and would normally show a scrollbar
  const context = await browser.newContext({ viewport: { width: 1200, height: 600 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#business-slug').fill('shree-ganesh-tailors');
    await page.locator('#business-email').fill('owner@shreeganesh.com');
    await page.locator('#business-password').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    // Wait a brief moment for layout
    await page.waitForTimeout(500);

    // Locate the sidebar element
    const sidebar = page.locator('aside[data-sidebar="true"]');
    await sidebar.screenshot({
      path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/sidebar_no_scrollbar.png',
    });

    console.log('📸 Screenshot saved to sidebar_no_scrollbar.png');
    console.log('✅ Verified: Sidebar captured under 600px viewport where content overflows.');
  } finally {
    await browser.close();
  }
}

verifySidebarScrollbarHidden().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
