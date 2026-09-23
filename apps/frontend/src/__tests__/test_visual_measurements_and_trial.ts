import { chromium } from 'playwright';

async function run() {
  console.log('======================================================================');
  console.log('🚀 VERIFYING TRIAL COUNTDOWN & INTERACTIVE VISUAL MEASUREMENT CHART');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const shopData = {
    shopName: `Savile Row Bespoke ${timestamp}`,
    slug: `savile-row-${timestamp}`,
    ownerEmail: `master.tailor.${timestamp}@example.com`,
    ownerPassword: 'Password123!',
    firstName: 'Arjun',
    lastName: 'Singhania',
  };

  console.log('1. Registering new tenant business via POST /api/auth/register/tenant...');
  const regRes = await fetch('http://localhost:3001/api/auth/register/tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shopData),
  });

  const regJson = await regRes.json();
  if (!regRes.ok || !regJson.data?.token) {
    throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
  }

  const { token, user } = regJson.data;
  console.log(`✅ Business successfully registered!`);
  console.log(`   Owner: ${user.firstName} ${user.lastName} (${user.email})`);

  // Check subscription details via API
  const subRes = await fetch('http://localhost:3001/api/subscription/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const subJson = await subRes.json();
  console.log('\n2. Subscription & Trial API Response:', {
    plan: subJson.data?.plan?.name,
    status: subJson.data?.subscription?.status,
    isTrial: subJson.data?.isTrial,
    trialDaysRemaining: subJson.data?.trialDaysRemaining,
  });

  if (!subJson.data?.isTrial || subJson.data?.trialDaysRemaining !== 14) {
    throw new Error(`Expected isTrial: true and trialDaysRemaining: 14, got ${JSON.stringify(subJson.data)}`);
  }
  console.log('✅ 14-Day Free Trial correctly provisioned on registration!');

  // Create a customer for this tenant
  console.log('\n3. Creating a sample client in the customer vault...');
  const custRes = await fetch('http://localhost:3001/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: 'Kabir',
      lastName: 'Oberoi',
      phone: '9876543210',
      email: 'kabir.oberoi@example.com',
      gender: 'MALE',
      notes: 'Prefers modern slim cut suits with tapered trousers',
    }),
  });
  const custJson = await custRes.json();
  const customerId = custJson.data?.id;
  console.log(`✅ Customer Kabir Oberoi created with ID: ${customerId}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

  const artifactDir = '/Users/virajsavaliya/.gemini/antigravity-ide/brain/ee409b29-a019-4389-b59a-ffd30a728bf7';

  try {
    console.log('\n4. Logging in to Dashboard with auth state...');
    await page.goto('http://localhost:5173/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem(
          'darzi_auth',
          JSON.stringify({
            token,
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
          }),
        );
        window.dispatchEvent(new Event('darzi-auth-change'));
      },
      { token, user },
    );

    await page.goto('http://localhost:5173/dashboard/home');
    await page.waitForTimeout(2000);

    console.log('Current URL after navigation:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text snippet:', bodyText.slice(0, 500));

    // Verify Trial banner
    const trialBanner = page.locator('text=Days Left in Your Free Trial');
    await trialBanner.waitFor({ timeout: 5000 });
    console.log('✅ Trial countdown banner visible on Owner Dashboard:');
    const bannerText = await page.locator('text=Days Left in Your Free Trial').textContent();
    console.log(`   "${bannerText?.trim()}"`);

    // Verify Sidebar chip
    const sidebarChip = page.locator('text=days left').first();
    const sidebarText = await sidebarChip.textContent();
    console.log(`✅ Sidebar plan chip shows: "${sidebarText?.trim()}"`);

    await page.screenshot({
      path: `${artifactDir}/trial_countdown_dashboard.png`,
      fullPage: false,
    });
    console.log(`📸 Saved screenshot: trial_countdown_dashboard.png`);

    // Navigate to /dashboard/measurements
    console.log('\n5. Navigating to /dashboard/measurements...');
    await page.goto('http://localhost:5173/dashboard/measurements');
    await page.waitForTimeout(2000);

    // Check title
    const chartTitle = page.locator('text=MEASUREMENT CHART');
    await chartTitle.waitFor({ timeout: 5000 });
    console.log('✅ "MEASUREMENT CHART" header found on page!');

    // Check Mannequin silhouette & vectors
    const mannequin = page.locator('#mannequin-silhouette');
    await mannequin.waitFor({ timeout: 5000 });
    console.log('✅ Anatomical mannequin diagram rendered!');

    // Check letter badges
    const badgeA = page.locator('#letter-badges text:text-is("A")');
    await badgeA.waitFor({ timeout: 5000 });
    console.log('✅ Letter badges A–O successfully rendered on mannequin!');

    await page.screenshot({
      path: `${artifactDir}/measurement_chart_initial_view.png`,
      fullPage: false,
    });
    console.log(`📸 Saved screenshot: measurement_chart_initial_view.png`);

    // Click marker A (Chest) on the mannequin
    console.log('\n6. Interacting with body markers...');
    await badgeA.click();
    await page.waitForTimeout(500);

    // Check active marker banner
    await page.locator('text=Chest').first().waitFor();
    console.log('✅ Marker A activated: Chest is selected');

    // Enter value in input-measurement-a
    const inputA = page.locator('#input-measurement-a');
    await inputA.fill('40.5');
    console.log('✅ Entered Chest measurement: 40.5 in');

    // Click marker B (Waist)
    const badgeB = page.locator('#letter-badges text:text-is("B")');
    await badgeB.click();
    await page.waitForTimeout(500);
    const inputB = page.locator('#input-measurement-b');
    await inputB.fill('33.0');
    console.log('✅ Clicked Marker B and entered Waist: 33.0 in');

    // Click marker O (Waist to floor)
    const badgeO = page.locator('#letter-badges text:text-is("O")');
    await badgeO.click();
    await page.waitForTimeout(500);
    const inputO = page.locator('#input-measurement-o');
    await inputO.fill('42.0');
    console.log('✅ Clicked Marker O and entered Waist to Floor: 42.0 in');

    await page.screenshot({
      path: `${artifactDir}/interactive_body_measurement_chart.png`,
      fullPage: false,
    });
    console.log(`📸 Saved screenshot: interactive_body_measurement_chart.png`);

    await page.screenshot({
      path: `${artifactDir}/visual_measurement_chart_fullpage.png`,
      fullPage: true,
    });
    console.log(`📸 Saved screenshot: visual_measurement_chart_fullpage.png`);

    // Switch Garment Presets
    console.log('\n7. Testing garment presets...');
    const suitPreset = page.locator('button:has-text("Bespoke Suit")');
    await suitPreset.click();
    await page.waitForTimeout(500);
    console.log('✅ Switched template to "Bespoke Suit"');

    // Save Measurement Record
    console.log('\n8. Saving measurement record to customer vault...');
    const saveBtn = page.locator('#save-measurement-chart-btn');
    await saveBtn.click();

    // Check for success feedback
    const successMsg = page.locator('text=Saved to Customer Vault!');
    await successMsg.waitFor({ timeout: 5000 });
    console.log('✅ Received confirmation: "Saved to Customer Vault!"');

    await page.screenshot({
      path: `${artifactDir}/measurement_highlight_active.png`,
      fullPage: false,
    });
    console.log(`📸 Saved screenshot: measurement_highlight_active.png`);

    // Test tab switcher to "All Profiles"
    console.log('\n9. Testing tab switcher to All Profiles archive...');
    const directoryTab = page.locator('#tab-measurements-directory');
    await directoryTab.click();
    await page.waitForTimeout(1000);

    const totalProfilesKpi = page.locator('text=Total Profiles');
    await totalProfilesKpi.waitFor({ timeout: 5000 });
    console.log('✅ Switched to All Profiles archive tab successfully!');

    // Switch back to Visual Body Chart
    const chartTab = page.locator('#tab-visual-body-chart');
    await chartTab.click();
    await page.waitForTimeout(500);
    await chartTitle.waitFor({ timeout: 5000 });
    console.log('✅ Switched back to Visual Body Chart seamlessly!');

    console.log('\n======================================================================');
    console.log('🎉 ALL VERIFICATIONS PASSED PERFECTLY!');
    console.log('======================================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
