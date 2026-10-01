import '@playwright/test';

// Extend the test context with our custom fixtures
declare module '@playwright/test' {
  interface Fixtures {
    loggedInPage: import('@playwright/test').Page;
  }
}

// Make describe available globally (it's already global in Playwright, but this helps TypeScript)
declare const describe: jest.Describe;
