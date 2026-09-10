import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('workspace graph renders TERM nodes after a Strict Mode mount', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'test-token'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/graphql')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { workspaceGraph: {
        nodes: [
          { id: 'operator', label: 'operator', type: 'TERM', priority: 0.8 },
          { id: 'review', label: 'review', type: 'TERM', priority: 0.6 },
          { id: 'flight-plan', label: 'flight plan', type: 'TERM', priority: 0.4 },
        ],
        edges: [
          { from: 'operator', to: 'review', type: 'PERFORM' },
          { from: 'review', to: 'flight-plan', type: 'TARGET' },
        ],
      } } }) });
      return;
    }
    if (url.pathname.endsWith('/user-stories/workspace/ws/backlog')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 1000, result: [] }) });
      return;
    }
    const result = url.pathname.endsWith('/workspace/ws') ? { id: 'ws', name: 'Flight workspace' } : [{ id: 'ws', name: 'Flight workspace' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 1000, result }) });
  });

  await page.goto('/workspace/ws/graph');
  await expect(page.getByText('fCoSE overview')).toBeVisible();
  await expect(page.getByText('operator', { exact: true }).last()).toBeVisible();
  const graphHost = page.getByRole('img', { name: /Interactive S–V–O graph/ });
  const bounds = await graphHost.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    return { width: box.width, height: box.height, parentWidth: parent?.width, parentHeight: parent?.height };
  });
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.height).toBeGreaterThan(0);
  await expect(graphHost.locator('canvas')).toHaveCount(3);
  await expect(page.getByText('Subjects').locator('..').getByText('1', { exact: true })).toBeVisible();
  await expect(page.getByText('Arranging graph…')).toBeHidden({ timeout: 15_000 });
  await graphHost.locator('..').screenshot({ path: 'test-results/workspace-graph-regression.png' });
});

test('home create workspace button navigates to the create page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'test-token'));
  await page.route('http://localhost:8080/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 1000, result: [] }) }));
  await page.goto('/');

  await page.getByRole('button', { name: 'Create Workspace', exact: true }).first().click();

  await expect(page).toHaveURL(/\/workspace\/create$/);
  await expect(page.getByRole('heading', { name: 'Space templates' })).toBeVisible();
});

test('backlog can open and start a sprint without corrupting sprint story data', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'test-token'));
  let startRequests = 0;
  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url());
    let result: unknown = [];
    if (url.pathname.endsWith('/graphql')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { workspaceGraph: {
        nodes: [{ id: 'operator', label: 'operator', type: 'SUBJECT', priority: 0.8 }], edges: [],
      } } }) });
      return;
    }
    if (url.pathname.endsWith('/sprints/sprint-1/start')) startRequests += 1;
    else if (url.pathname.endsWith('/sprints/workspace/ws')) result = [{ id: 'sprint-1', name: 'Sprint 1', status: 'ToDo' }];
    else if (url.pathname.endsWith('/sprints/sprint-1/user-stories')) result = [{ id: 'story-1', storyText: 'As an operator, I want a safe flight plan', status: 'ToDo', sprintId: 'sprint-1' }];
    else if (url.pathname.endsWith('/workspace/ws')) result = { id: 'ws', name: 'Flight workspace' };
    else if (url.pathname.endsWith('/workspace')) result = [{ id: 'ws', name: 'Flight workspace' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 1000, result }) });
  });

  await page.goto('/workspace/ws/backlog');
  await page.getByRole('button', { name: 'View Graph' }).click();
  await expect(page).toHaveURL(/\/workspace\/ws\/sprint\/sprint-1\/graph$/);
  await expect(page.getByText('fCoSE overview')).toBeVisible();
  await page.goto('/workspace/ws/backlog');
  await page.getByRole('button', { name: 'Start sprint' }).click();
  await expect.poll(() => startRequests).toBe(1);
  await expect(page).toHaveURL(/\/workspace\/ws\/sprint\/sprint-1\/graph$/);
});
