const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const APP_URL = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/images');
const CHROME_PATH = process.env.CHROME_PATH;

const workspaces = [
  { id: 'ws', name: 'Product Discovery', description: 'Turn customer needs into a clear, connected delivery plan.' },
  { id: 'platform', name: 'Platform Engineering', description: 'Reliability, developer experience, and infrastructure work.' },
  { id: 'mobile', name: 'Mobile Experience', description: 'A focused roadmap for the cross-platform TaskFlow client.' },
];

const graph = {
  nodes: [
    { id: 'pm', label: 'product manager', type: 'SUBJECT', priority: 0.92, betweenness: 0.68 },
    { id: 'prioritize', label: 'prioritize', type: 'ACTION', priority: 0.88, betweenness: 0.54 },
    { id: 'backlog', label: 'backlog', type: 'OBJECT', priority: 0.85, betweenness: 0.72 },
    { id: 'team', label: 'delivery team', type: 'SUBJECT', priority: 0.8, betweenness: 0.46 },
    { id: 'plan', label: 'plan', type: 'ACTION', priority: 0.76, betweenness: 0.42 },
    { id: 'sprint', label: 'sprint', type: 'OBJECT', priority: 0.81, betweenness: 0.58 },
    { id: 'story-1', label: 'Prioritize valuable work', type: 'USER_STORY', priority: 0.9, betweenness: 0.35 },
    { id: 'story-2', label: 'Plan the next sprint', type: 'USER_STORY', priority: 0.84, betweenness: 0.31 },
  ],
  edges: [
    { from: 'pm', to: 'prioritize', type: 'PERFORM' },
    { from: 'prioritize', to: 'backlog', type: 'TARGET' },
    { from: 'team', to: 'plan', type: 'PERFORM' },
    { from: 'plan', to: 'sprint', type: 'TARGET' },
    { from: 'story-1', to: 'pm', type: 'CONTAINS' },
    { from: 'story-1', to: 'backlog', type: 'CONTAINS' },
    { from: 'story-2', to: 'team', type: 'CONTAINS' },
    { from: 'story-2', to: 'sprint', type: 'CONTAINS' },
    { from: 'backlog', to: 'sprint', type: 'RELATED_TO', weight: 0.74 },
  ],
};

const recommendations = {
  data: [
    {
      id: 'rec-1',
      type: 'POSSIBLE_DUPLICATE',
      status: 'OPEN',
      confidence: { band: 'HIGH', score: 0.91, calibrated: false },
      title: 'These stories may describe the same backlog outcome',
      stories: [
        { id: 'US-142', text: 'As a product manager, I want to prioritize backlog items by customer value.', graphRelevanceScore: 0.93, parseConfidence: 0.96 },
        { id: 'US-187', text: 'As a product owner, I want to rank stories by business value so the team builds the most valuable work first.', graphRelevanceScore: 0.9, parseConfidence: 0.94 },
      ],
      evidence: [
        { code: 'SEMANTIC', label: 'Strong semantic overlap', value: 0.91 },
        { code: 'SAME_OBJECT', label: 'Shared backlog concept' },
        { code: 'SAME_INTENT', label: 'Matching prioritization intent' },
      ],
      suggestedAction: { type: 'MERGE_REVIEW', representativeStoryId: 'US-142' },
      modelVersion: 'readme-fixture-v1',
      policyVersion: 'v1',
      generatedAt: '2026-10-04T08:30:00Z',
      version: 1,
    },
    {
      id: 'rec-2',
      type: 'POSSIBLE_DUPLICATE',
      status: 'OPEN',
      confidence: { band: 'MEDIUM', score: 0.74, calibrated: false },
      title: 'Review this pair before sprint planning',
      stories: [
        { id: 'US-203', text: 'As a delivery lead, I want to plan sprint capacity with the team.', graphRelevanceScore: 0.81, parseConfidence: 0.89 },
        { id: 'US-219', text: 'As a scrum master, I want to estimate team capacity for the next sprint.', graphRelevanceScore: 0.79, parseConfidence: 0.87 },
      ],
      evidence: [
        { code: 'SEMANTIC', label: 'Related sprint-planning intent', value: 0.74 },
        { code: 'SHARED_CONTEXT', label: 'Same workspace context' },
      ],
      suggestedAction: { type: 'MERGE_REVIEW', representativeStoryId: 'US-203' },
      modelVersion: 'readme-fixture-v1',
      policyVersion: 'v1',
      generatedAt: '2026-10-04T08:30:00Z',
      version: 1,
    },
  ],
  page: { nextCursor: null, hasMore: false },
  summary: { open: 2, high: 1, medium: 1 },
};

function apiResult(url) {
  const pathname = new URL(url).pathname;
  if (pathname.endsWith('/graphql')) return { data: { workspaceGraph: graph } };
  if (pathname.endsWith('/workspaces/ws/recommendations')) return { code: 1000, result: recommendations };
  if (pathname.endsWith('/workspaces/ws/recommendation-jobs/latest')) return { code: 1000, result: { id: 'job-1', status: 'SUCCEEDED', progress: 100, candidateCount: 2, completedAt: '2026-10-04T08:30:00Z' } };
  if (pathname.endsWith('/workspace/ws/my-access')) return { code: 1000, result: { role: 'ADMIN', permissions: ['RECOMMENDATION_REVIEW', 'RECOMMENDATION_ACCEPT'] } };
  if (pathname.endsWith('/workspace/ws')) return { code: 1000, result: workspaces[0] };
  if (pathname.endsWith('/workspace')) return { code: 1000, result: workspaces };
  if (pathname.endsWith('/user-stories/workspace/ws/backlog')) return { code: 1000, result: [
    { id: 'story-1', storyText: 'As a product manager, I want to prioritize the backlog', status: 'ToDo' },
    { id: 'story-2', storyText: 'As a delivery team, we want to plan the next sprint', status: 'ToDo' },
  ] };
  if (pathname.endsWith('/notifications/unread')) return { code: 1000, result: [] };
  if (pathname.endsWith('/my-profile')) return { code: 1000, result: { firstName: 'TaskFlow', lastName: 'Contributor' } };
  return { code: 1000, result: [] };
}

async function configurePage(browser, authenticated = false) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (authenticated) await page.evaluateOnNewDocument(() => {
    localStorage.setItem('accessToken', 'readme-screenshot-token');
    localStorage.setItem('taskflow-theme', 'light');
  });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.url().startsWith('http://localhost:8080/api/')) {
      await request.respond({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'access-control-allow-headers': 'Authorization, Content-Type, X-API-Key',
        },
        body: request.method() === 'OPTIONS' ? '' : JSON.stringify(apiResult(request.url())),
      });
      return;
    }
    await request.continue();
  });
  return page;
}

async function capture(page, route, selector, filename, settleTime = 800) {
  console.log(`Opening ${route}`);
  await page.goto(`${APP_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`Waiting for ${selector}`);
  await page.waitForSelector(selector, { visible: true, timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, settleTime));
  if (filename === 'react-knowledge-graph.png') {
    await page.click('button[aria-label="Fit entire graph"]');
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), type: 'png', fullPage: false });
  console.log(`Saved docs/images/${filename}`);
}

async function takeScreenshots() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const chromePath = CHROME_PATH || await puppeteer.executablePath('chrome');
  console.log(`Launching Chrome from ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 60000,
  });
  console.log('Chrome launched');
  try {
    const login = await configurePage(browser);
    await capture(login, '/login', 'button[type="submit"]', 'react-login.png');
    await login.close();
    const home = await configurePage(browser, true);
    await capture(home, '/', 'h2', 'react-workspaces.png');
    await home.close();
    const knowledgeGraph = await configurePage(browser, true);
    await capture(knowledgeGraph, '/workspace/ws/graph', '[role="img"] canvas', 'react-knowledge-graph.png', 4000);
    await knowledgeGraph.close();
    const recommendationReview = await configurePage(browser, true);
    await capture(recommendationReview, '/workspace/ws/recommendations', 'article', 'react-recommendations.png', 1200);
    await recommendationReview.close();
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
