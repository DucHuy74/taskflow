import { test, expect } from './setup';
import { describe } from '@playwright/test';

describe('Navigation Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'duchuy1');
    await page.fill('#password', 'duchuy123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  describe('Sidebar Navigation', () => {

    test('should display sidebar with navigation items', async ({ page }) => {
      // Check sidebar is visible
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Check main menu items
      await expect(page.locator('text=For you')).toBeVisible();
      await expect(page.locator('text=Recent')).toBeVisible();
      await expect(page.locator('text=Starred')).toBeVisible();

      // Check bottom items
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Help')).toBeVisible();
    });

    test('should navigate to For you (home) page', async ({ page }) => {
      // Click on For you
      await page.click('text=For you');

      // Should be on home page
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1:has-text("For you")')).toBeVisible();
    });

    test('should navigate to Recent page', async ({ page }) => {
      await page.click('text=Recent');
      await expect(page).toHaveURL(/\/recent/);
    });

    test('should navigate to Settings page', async ({ page }) => {
      await page.click('text=Settings');
      await expect(page).toHaveURL(/\/settings/);
    });

    test('should collapse and expand sidebar', async ({ page }) => {
      // Find collapse button (chevron in sidebar)
      const collapseButton = page.locator('aside button').first();

      // Get initial sidebar width
      const sidebar = page.locator('aside');
      const initialWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);

      // Click collapse
      await collapseButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be narrower
      const collapsedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
      expect(collapsedWidth).toBeLessThan(initialWidth);

      // Click expand again
      await collapseButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be back to original width
      const expandedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
      expect(expandedWidth).toBe(initialWidth);
    });

    test('should highlight active menu item', async ({ page }) => {
      // Navigate to Settings
      await page.click('text=Settings');
      await expect(page).toHaveURL(/\/settings/);

      // Settings should have active styling (blue background)
      const settingsLink = page.locator('aside a:has-text("Settings")').first();
      await expect(settingsLink).toHaveClass(/bg-\[#DEEBFF\]|bg-blue|text-blue/);
    });
  });

  describe('Route Protection', () => {

    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      // Clear any existing auth state
      await page.evaluate(() => localStorage.clear());
      await page.context().clearCookies();

      // Try to access workspace page
      await page.goto('/workspace/test-id');

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
    });

    test('should access workspace route when authenticated', async ({ page }) => {
      // Navigate to workspace dashboard
      await page.goto('/workspace/test-workspace');

      // Should load without redirect
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/workspace/);
    });

    test('should access backlog route when authenticated', async ({ page }) => {
      await page.goto('/workspace/test-workspace/backlog');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/backlog/);
    });

    test('should access sprint route when authenticated', async ({ page }) => {
      await page.goto('/workspace/test-workspace/sprint');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/sprint/);
    });

    test('should redirect authenticated user away from login page', async ({ page }) => {
      // Already logged in from beforeEach

      // Navigate to login page
      await page.goto('/login');

      // Should redirect to home page
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page).toHaveURL('/');
    });
  });

  describe('Mobile Responsive Menu', () => {

    test('should show mobile menu button on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.goto('/');
      await page.waitForTimeout(500);

      // Should see hamburger/menu button
      const menuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i], button:has(svg)').first();
      await expect(menuButton).toBeVisible();
    });

    test('should toggle mobile menu on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/');
      await page.waitForTimeout(500);

      // Find and click menu button
      const menuButton = page.locator('button[aria-label*="menu" i], button:has(svg)').first();
      await menuButton.click();

      // Mobile menu should appear
      await page.waitForTimeout(300);

      // Sidebar or mobile menu should be visible
      const sidebar = page.locator('aside');
      const isVisible = await sidebar.isVisible();
      expect(isVisible).toBe(true);
    });

    test('should adapt layout on different viewport sizes', async ({ page }) => {
      // Desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Sidebar should be visible and expanded
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForTimeout(500);

      // Sidebar should still be visible
      await expect(sidebar).toBeVisible();

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(500);

      // Mobile menu button should appear
      const menuButton = page.locator('button').first();
      await expect(menuButton).toBeVisible();
    });
  });
});
