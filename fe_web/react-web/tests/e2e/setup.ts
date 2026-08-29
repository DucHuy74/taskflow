import { test as base, type Page, expect } from '@playwright/test';

// Custom fixtures for authentication
interface AuthFixtures {
  loggedInPage: Page;
}

export { expect };
export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    // Perform login before test
    await page.goto('/login');

    // Fill login form
    await page.fill('#email', 'duchuy1');
    await page.fill('#password', 'duchuy123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 });

    await use(page);

    // Cleanup: logout after test
    await page.goto('/');
    await page.click('button:has-text("Log out")').catch(() => {
      // If logout button not found, try clicking user menu
      page.click('[aria-label="User menu"]').catch(() => {});
    });
  },
});
