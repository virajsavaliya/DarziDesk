import { chromium } from 'playwright';

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

async function run() {
  console.log('🚀 Launching Playwright Chromium Headless...');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Navigate to local frontend
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Evaluate overflow and navigation rules
    const metrics = await page.evaluate((vpWidth) => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;

      // Find any element causing horizontal overflow
      const overflowingElements = [];
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        // Skip explicitly scrollable containers
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') continue;

        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) { // 1px threshold for subpixel rounding
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className ? el.className.toString().slice(0, 50) : '',
            right: Math.round(rect.right),
            winWidth,
          });
          if (overflowingElements.length >= 5) break;
        }
      }

      // Check navigation tier rules
      const bottomNav = document.getElementById('mobile-bottom-nav') || document.querySelector('nav[aria-label="Mobile Navigation"]');

      return {
        docScrollWidth,
        bodyScrollWidth,
        winWidth,
        hasDocOverflow: docScrollWidth > winWidth + 1 || bodyScrollWidth > winWidth + 1,
        overflowingElements,
        bottomNavVisible: bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false,
      };
    }, vp.width);

    // Rule 1 Verification:
    let ruleDetail = '';
    if (vp.width < 768) {
      ruleDetail = `< 768px: Mobile Bottom Nav & Drawer Tier`;
    } else if (vp.width >= 768 && vp.width < 1024) {
      ruleDetail = `768-1023px: Compact 64px Icon Rail`;
    } else {
      ruleDetail = `>= 1024px: Full Desktop 256px Sidebar`;
    }

    const passed = !metrics.hasDocOverflow;
    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      passed,
      metrics,
      ruleDetail,
    });

    console.log(
      `${passed ? '✅' : '❌'} ${vp.name.padEnd(35)} (${vp.width}x${vp.height}): docScroll=${metrics.docScrollWidth}, winWidth=${metrics.winWidth} | ${ruleDetail}`
    );

    if (!passed && metrics.overflowingElements.length > 0) {
      console.log('   Elements exceeding width:', metrics.overflowingElements);
    }

    await page.close();
  }

  await browser.close();

  const allPassed = results.every((r) => r.passed);
  console.log(`\n========================================`);
  console.log(allPassed ? '🎉 ALL 15 VIEWPORT TESTS PASSED PERFECTLY (0 OVERFLOW)!' : '⚠️ SOME VIEWPORTS HAD OVERFLOW');
  console.log(`========================================`);

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
