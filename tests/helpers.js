// Shared helpers for trip-splitter tests
const path = require('path');

/**
 * Load the app fresh (clears localStorage first).
 */
async function loadApp(page) {
  await page.goto(`file://${path.resolve(__dirname, '../index.html')}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/**
 * Open the sidebar and create a new trip.
 */
async function createTrip(page, name = 'Test Trip') {
  // Register dialog handler BEFORE triggering the click that opens it
  page.once('dialog', d => d.accept(name));
  // Wait for sidebar to expand and button to be in viewport before clicking
  await page.locator('#sidebar .sidebar-footer button').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#sidebar .sidebar-footer button');
  await page.waitForSelector('#trip-ui', { state: 'visible' });
}

/**
 * Add a person (single or couple) via the People tab.
 */
async function addPerson(page, name, size = 1) {
  await page.fill('#person-name', name);
  if (size === 2) await page.click('#toggle-couple');
  else await page.click('#toggle-single');
  await page.click('#person-name ~ button');
}

/**
 * Switch to a named tab.
 */
async function goToTab(page, label) {
  await page.click(`#trip-ui .nav-link:has-text("${label}")`);
}

/**
 * Add an expense. splitNames defaults to everyone (leave empty).
 * Assumes people have already been added.
 */
async function addExpense(page, { desc, amount, payer, splitNames = [] }) {
  await goToTab(page, 'Expenses');
  await page.fill('#exp-desc', desc);
  await page.fill('#exp-amount', String(amount));
  await page.selectOption('#exp-payer', { label: payer });
  for (const name of splitNames) {
    await page.click(`#split-chips .pchip:has-text("${name}")`);
  }
  await page.click('#tab-expenses button:has-text("Add expense")');
}

module.exports = { loadApp, createTrip, addPerson, goToTab, addExpense };
