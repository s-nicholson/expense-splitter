// @ts-check
const { test, expect } = require('@playwright/test');
const { loadApp, createTrip } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
});

test('shows empty state with no trips', async ({ page }) => {
  await expect(page.locator('#no-trip')).toBeVisible();
  await expect(page.locator('#trip-ui')).toBeHidden();
});

test('creates a new trip and shows trip UI', async ({ page }) => {
  await createTrip(page, 'Ibiza 2025');
  await expect(page.locator('#trip-title')).toHaveText('Ibiza 2025');
  await expect(page.locator('#trip-ui')).toBeVisible();
  await expect(page.locator('#no-trip')).toBeHidden();
});

test('multiple trips appear in sidebar list', async ({ page }) => {
  await createTrip(page, 'Trip A');
  // Open sidebar and add second trip
  await page.click('[aria-label="Trips menu"]');
  page.once('dialog', d => d.accept('Trip B'));
  await page.click('text=New trip');
  await page.click('[aria-label="Trips menu"]');
  await expect(page.locator('.trip-item')).toHaveCount(2);
});

test('selecting a different trip switches context', async ({ page }) => {
  await createTrip(page, 'Trip A');
  await page.click('[aria-label="Trips menu"]');
  page.once('dialog', d => d.accept('Trip B'));
  await page.click('text=New trip');
  // Go back to Trip A
  await page.click('[aria-label="Trips menu"]');
  await page.click('.trip-item:has-text("Trip A")');
  await expect(page.locator('#trip-title')).toHaveText('Trip A');
});

test('deleting a trip returns to empty state when no trips remain', async ({ page }) => {
  await createTrip(page, 'Doomed Trip');
  await page.click('[aria-label="Trips menu"]');
  page.once('dialog', d => d.accept()); // confirm delete
  await page.click('.trip-item [title="Delete"]');
  await expect(page.locator('#no-trip')).toBeVisible();
});

test('persists trips across page reload', async ({ page }) => {
  await createTrip(page, 'Persistent Trip');
  await page.reload();
  await expect(page.locator('#trip-title')).toHaveText('Persistent Trip');
});
