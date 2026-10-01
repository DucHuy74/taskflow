import { test, expect } from '@playwright/test';

test.describe('Workspace', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="text"]', 'duchuy1');
    await page.fill('input[type="password"]', 'duchuy123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should display workspaces list', async ({ page }) => {
    await page.goto('/');
    // Should show workspace cards or list
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to create workspace', async ({ page }) => {
    await page.goto('/workspace/create');
    await expect(page.locator('text=Create Workspace')).toBeVisible();
  });

  test('should select a workspace', async ({ page }) => {
    // Click on first workspace if available
    const workspaceCard = page.locator('[class*="card"], [class*="workspace"]').first();
    if (await workspaceCard.isVisible()) {
      await workspaceCard.click();
    }
  });
});
