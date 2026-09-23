import { chromium } from 'playwright';

async function captureDashboard() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');

  await page.locator('#business-slug').fill('shree-ganesh-tailors');
  await page.locator('#business-email').fill('owner@shreeganesh.com');
  await page.locator('#business-password').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });

  // Wait for activity items to load
  await page.locator('text=moved to').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Scroll the main content container to bottom
  await page.locator('main').evaluate((el) => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(800);

  await page.screenshot({
    path: '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7/dashboard_recent_activity_scrolled.png',
  });

  await browser.close();
}

captureDashboard().catch(console.error);
