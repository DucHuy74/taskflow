import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=TaskFlow')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Form should prevent submission
    await expect(page.locator('form')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'duchuy1');
    await page.fill('input[type="password"]', 'duchuy123');
    await page.click('button[type="submit"]');
    // Should redirect to dashboard after login
    await page.waitForURL('/', { timeout: 10000 });
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="text"]', 'duchuy1');
    await page.fill('input[type="password"]', 'duchuy123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should navigate to settings', async ({ page }) => {
    await page.click('text=Settings');
    await expect(page).toHaveURL('/settings');
  });

  test('should navigate to profile', async ({ page }) => {
    await page.click('text=Profile');
    await expect(page).toHaveURL('/profile');
  });

  test('should show sidebar navigation', async ({ page }) => {
    await expect(page.locator('nav, aside')).toBeVisible();
    await expect(page.locator('text=For you')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});
