// @ts-check
const { test, expect } = require('@playwright/test');
const { loadApp, createTrip, addPerson, addExpense, goToTab } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
});

test('migrates old string-format people on load', async ({ page }) => {
  // Inject old-format data directly into localStorage
  await page.evaluate(() => {
    const id = 'oldtrip';
    localStorage.setItem('trips_v2', JSON.stringify({
      [id]: {
        name: 'Old Trip',
        people: ['Alice', 'Bob'],   // old string format
        expenses: [{
          id: 1, desc: 'Lunch', amount: 20, payer: 'Alice', split: ['Alice', 'Bob']
        }]
      }
    }));
  });
  await page.reload();

  // Should load without errors and show the trip
  await expect(page.locator('#trip-title')).toHaveText('Old Trip');
  await goToTab(page, 'Settle');
  // Settle should render (not crash)
  await expect(page.locator('#settle-result')).toContainText('Alice');
});

test('share URL round-trips trip data', async ({ page }) => {
  await createTrip(page, 'URL Trip');
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob & Carol', 2);
  await addExpense(page, { desc: 'Hotel', amount: 90, payer: 'Alice' });

  // Click share and capture the URL written to clipboard
  await page.evaluate(() => {
    // Override clipboard to capture value
    window._clipboardValue = '';
    navigator.clipboard.writeText = async (text) => { window._clipboardValue = text; };
  });
  await page.click('#share-btn');
  const url = await page.evaluate(() => window._clipboardValue);

  expect(url).toContain('#trip=');

  // Load the URL in a fresh context
  await page.evaluate(() => localStorage.clear());
  page.once('dialog', d => d.accept()); // confirm import
  await page.goto(url);

  await expect(page.locator('#trip-title')).toHaveText('URL Trip');
  await expect(page.locator('#people-list')).toContainText('Alice');
  await expect(page.locator('#people-list')).toContainText('Bob & Carol');
});

test('invalid share URL hash is ignored gracefully', async ({ page }) => {
  await page.goto(`file://${require('path').resolve(__dirname, '../index.html')}#trip=NOTVALIDDATA`);
  // Should not crash — empty state shown
  await expect(page.locator('#no-trip')).toBeVisible();
});
