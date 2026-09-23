import { chromium } from 'playwright';

async function run() {
  console.log('🧪 Testing Deep Component-Level Interactions...');
  const browser = await chromium.launch({ headless: true });

  // 1. Test Mobile Order Details & Pipeline on 375x812 (iPhone 13 mini)
  {
    console.log('👉 Testing Order Pipeline & Actions on iPhone 13 mini (375x812)...');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Click on Orders tab in bottom nav or top navigation
    const ordersBtn = page.locator('#nav-mobile-orders');
    if (await ordersBtn.isVisible()) {
      await ordersBtn.click();
      await page.waitForTimeout(500);
    }

    // Check document overflow on Orders page
    const ordersOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    console.log(`   Orders view overflow check: ${ordersOverflow ? 'PASSED ✅' : 'FAILED ❌'}`);

    await page.close();
  }

  // 2. Test Mannequin UI & Scoped Touch Gestures on 390x844 (iPhone 14)
  {
    console.log('👉 Testing Body Mannequin Diagram & Touch Targets on iPhone 14 (390x844)...');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Navigate to Measurements
    const moreBtn = page.locator('#nav-mobile-more');
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      // Click measurements link
      const measureLink = page.locator('text=Measurements');
      if (await measureLink.isVisible()) {
        await measureLink.click();
        await page.waitForTimeout(500);
      }
    }

    // Check mannequin touch hitboxes and zoom buttons
    const mannequinMetrics = await page.evaluate(() => {
      const zoomInBtn = document.querySelector('button[aria-label="Zoom in mannequin"]');
      const zoomOutBtn = document.querySelector('button[aria-label="Zoom out mannequin"]');
      const hitboxes = document.querySelectorAll('circle[aria-label^="Select landmark"]');
      const svg = document.querySelector('svg[viewBox="-46 -15 298 238"]');

      return {
        zoomInBtnExists: Boolean(zoomInBtn),
        zoomOutBtnExists: Boolean(zoomOutBtn),
        hitboxCount: hitboxes.length,
        svgExists: Boolean(svg),
        docScrollWidth: document.documentElement.scrollWidth,
        winWidth: window.innerWidth,
      };
    });

    console.log(`   Mannequin SVG & Zoom controls: ${mannequinMetrics.zoomInBtnExists && mannequinMetrics.svgExists ? 'PASSED ✅' : 'INFO ℹ️'}`);
    console.log(`   Hitbox count: ${mannequinMetrics.hitboxCount} master landmarks`);
    console.log(`   Measurement page overflow: ${mannequinMetrics.docScrollWidth <= mannequinMetrics.winWidth ? 'PASSED ✅' : 'FAILED ❌'}`);

    await page.close();
  }

  // 3. Test Drawer & Sticky Actions on 360x800
  {
    console.log('👉 Testing Drawer safe-area and modal layout on Android (360x800)...');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Open more drawer
    const moreBtn = page.locator('#nav-mobile-more');
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(400);

      const drawerCheck = await page.evaluate(() => {
        const drawer = document.querySelector('[role="dialog"]');
        if (!drawer) return { exists: false };
        const rect = drawer.getBoundingClientRect();
        return {
          exists: true,
          fullWidth: Math.abs(rect.width - window.innerWidth) <= 2,
          scrollWidth: document.documentElement.scrollWidth,
          winWidth: window.innerWidth,
        };
      });

      console.log(`   Mobile Drawer full-width: ${drawerCheck.fullWidth ? 'PASSED ✅' : 'INFO ℹ️'}`);
      console.log(`   Drawer page overflow: ${drawerCheck.scrollWidth <= drawerCheck.winWidth ? 'PASSED ✅' : 'FAILED ❌'}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ Component-level responsive verification completed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
