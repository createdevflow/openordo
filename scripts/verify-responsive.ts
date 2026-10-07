import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

const PAGES = [
  { name: 'overview', url: '/dashboard' },
  { name: 'appointments', url: '/dashboard/appointments' },
  { name: 'bookings', url: '/dashboard/bookings' },
  { name: 'patients', url: '/dashboard/patients' },
  { name: 'records', url: '/dashboard/records' },
  { name: 'prescriptions', url: '/dashboard/prescriptions' },
  { name: 'billing', url: '/dashboard/billing' },
  { name: 'inventory', url: '/dashboard/inventory' },
  { name: 'doctors', url: '/dashboard/doctors' },
  { name: 'addons', url: '/dashboard/addons' },
  { name: 'settings_clinic', url: '/dashboard/settings?tab=clinic' },
  { name: 'settings_subscription', url: '/dashboard/settings?tab=subscription' },
  { name: 'settings_billing', url: '/dashboard/settings?tab=billing' },
  { name: 'settings_account', url: '/dashboard/settings?tab=account' },
  { name: 'settings_data_requests', url: '/dashboard/settings?tab=data-requests' },
  { name: 'settings_storage', url: '/dashboard/settings?tab=storage' },
  { name: 'settings_notifs', url: '/dashboard/settings?tab=notifs' },
  { name: 'settings_developer', url: '/dashboard/settings?tab=developer' },
];

async function run() {
  console.log('Starting baseline generation...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 }
  });
  
  const page = await context.newPage();
  
  // Login
  console.log('Logging in as seed user...');
  await page.goto(`${BASE_URL}/demo-login`);
  await page.waitForTimeout(2000); // Wait for the demo login to redirect to /dashboard
  
  const outDir = path.join(process.cwd(), 'test-results', 'responsive', 'baseline');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const p of PAGES) {
    console.log(`Visiting ${p.name} at ${p.url}...`);
    await page.goto(`${BASE_URL}${p.url}`);
    await page.waitForLoadState('networkidle');
    // small wait for animations
    await page.waitForTimeout(1000);
    
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (hasOverflow) {
      console.log(`❌ OVERFLOW DETECTED at ${p.name}`);
    } else {
      console.log(`✅ No overflow at ${p.name}`);
    }
    
    const screenshotPath = path.join(outDir, `${p.name}_390.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved ${screenshotPath}`);
  }
  
  await browser.close();
  console.log('Baseline generation complete.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
