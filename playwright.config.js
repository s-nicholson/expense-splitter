// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  // Run each test file in parallel, tests within a file sequentially
  fullyParallel: false,
  reporter: 'list',
  use: {
    // Load index.html directly — no server needed
    baseURL: `file://${path.resolve(__dirname)}/index.html`,
    // Persist nothing between tests
    storageState: undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
