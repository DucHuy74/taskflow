const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, 'react-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);

  const pages = [
    { name: 'login', url: 'http://localhost:5173/login' },
    { name: 'dashboard', url: 'http://localhost:5173/', delay: 2000 },
    { name: 'backlog', url: 'http://localhost:5173/workspace/test/backlog' },
    { name: 'settings', url: 'http://localhost:5173/settings' },
    { name: 'profile', url: 'http://localhost:5173/profile' },
  ];

  for (const p of pages) {
    try {
      console.log(`Taking screenshot: ${p.name}`);
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
      if (p.delay) await page.waitForTimeout(p.delay);

      const filename = `${p.name}_${timestamp}.png`;
      await page.screenshot({
        path: path.join(screenshotDir, filename),
        fullPage: true
      });
      console.log(`  Saved: ${filename}`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  // Mobile screenshots
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 }
  });
  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.screenshot({
      path: path.join(screenshotDir, `login_mobile_${timestamp}.png`)
    });
    console.log('Saved: login_mobile.png');
  } catch (e) {
    console.error(`Mobile error: ${e.message}`);
  }

  await browser.close();
  console.log('Done!');
}

takeScreenshots().catch(console.error);
