// Captures every page in light and dark theme into docs/img using Playwright and mocked API responses.
//
// Usage (dev server must be running: `npm run dev`):
//   npm run screenshots              # all pages
//   npm run screenshots -- backlog   # one page, both themes
//
// SCREENSHOT_BASE_URL overrides the app URL (default http://localhost:5173).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { mockBackend, fakeToken } = require('./mock-api.cjs');

const OUT = path.resolve(__dirname, '../../docs/img');
const BASE = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173';

const pages = [
  { name: 'login', route: '/login', auth: false },
  { name: 'register', route: '/register', auth: false },
  { name: 'home-workspaces', route: '/' },
  { name: 'create-workspace', route: '/workspace/create' },
  { name: 'backlog', route: '/workspace/ws/backlog' },
  { name: 'sprint-board', route: '/workspace/ws/sprint/sprint-1' },
  { name: 'story-graph-3d', route: '/workspace/ws/graph', graph: true },
  { name: 'story-graph-table', route: '/workspace/ws/graph', graph: true, after: (p) => p.getByRole('button', { name: 'Table view' }).click() },
  { name: 'sprint-graph-3d', route: '/workspace/ws/sprint/sprint-1/graph', graph: true },
  { name: 'recommendations', route: '/workspace/ws/recommendations' },
  { name: 'invite-members', route: '/workspace/ws/invite' },
  { name: 'workspace-settings', route: '/workspace/ws/settings' },
  { name: 'user-settings', route: '/settings' },
  { name: 'profile', route: '/profile' },
  { name: 'notifications', route: '/', after: (p) => p.getByRole('button', { name: /notification/i }).first().click() },
];

async function newPage(browser, theme, authenticated) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => console.warn(`  page error: ${error.message}`));
  await page.addInitScript(([t, token, auth]) => {
    localStorage.setItem('taskflow-theme', t);
    if (auth) localStorage.setItem('accessToken', token);
  }, [theme, fakeToken(), authenticated]);
  await mockBackend(page);
  return page;
}

async function waitForGraph(page) {
  await page.getByText('Arranging graph…').waitFor({ state: 'hidden', timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function shoot(browser, item, theme) {
  const page = await newPage(browser, theme, item.auth !== false);
  await page.goto(BASE + item.route, { waitUntil: 'networkidle' });
  if (item.graph) await waitForGraph(page);
  else await page.waitForTimeout(700);
  if (item.after) {
    await item.after(page);
    await page.waitForTimeout(700);
  }
  const file = path.join(OUT, `${item.name}-${theme}.png`);
  await page.screenshot({ path: file, fullPage: !item.graph });
  console.log(`saved docs/img/${path.basename(file)}`);
  await page.close();
}

async function shootThemeTransition(browser) {
  const page = await newPage(browser, 'light', true);
  await page.goto(`${BASE}/workspace/ws/graph`, { waitUntil: 'networkidle' });
  await waitForGraph(page);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.waitForTimeout(200); // mid-way through the circular reveal
  await page.screenshot({ path: path.join(OUT, 'theme-toggle-transition.png') });
  console.log('saved docs/img/theme-toggle-transition.png');
  await page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // SwiftShader keeps WebGL working in headless Chromium on machines without a GPU.
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const only = process.argv[2];
  const selected = pages.filter((item) => !only || item.name === only);
  if (only && !selected.length) throw new Error(`Unknown page "${only}". Known: ${pages.map((item) => item.name).join(', ')}`);
  try {
    for (const item of selected) {
      for (const theme of ['light', 'dark']) await shoot(browser, item, theme);
    }
    if (!only) await shootThemeTransition(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
