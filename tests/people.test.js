// @ts-check
const { test, expect } = require('@playwright/test');
const { loadApp, createTrip, addPerson } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await createTrip(page, 'Test Trip');
});

test('adds a single person', async ({ page }) => {
  await addPerson(page, 'Alice');
  await expect(page.locator('#people-list')).toContainText('Alice');
});

test('adds a couple with ×2 badge', async ({ page }) => {
  await addPerson(page, 'Bob & Carol', 2);
  await expect(page.locator('#people-list')).toContainText('Bob & Carol');
  await expect(page.locator('#people-list .couple-badge')).toBeVisible();
});

test('does not add duplicate names', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Alice');
  await expect(page.locator('#people-list > div')).toHaveCount(1);
});

test('removes a person', async ({ page }) => {
  await addPerson(page, 'Alice');
  await page.click('[aria-label="Remove Alice"]');
  await expect(page.locator('#people-list')).not.toContainText('Alice');
});

test('couple appears in payer dropdown', async ({ page }) => {
  await addPerson(page, 'Dave & Eve', 2);
  await page.click('.nav-link:has-text("Expenses")');
  await expect(page.locator('#exp-payer option:has-text("Dave & Eve")')).toHaveCount(1);
});

test('couple appears with ×2 badge in split chips', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob & Carol', 2);
  await page.click('.nav-link:has-text("Expenses")');
  await expect(page.locator('#split-chips .couple-badge')).toBeVisible();
});

test('toggle resets to Single after adding a person', async ({ page }) => {
  await addPerson(page, 'Bob & Carol', 2);
  // Single button should be active again
  await expect(page.locator('#toggle-single')).toHaveClass(/btn-primary/);
  await expect(page.locator('#toggle-couple')).not.toHaveClass(/btn-primary/);
});
