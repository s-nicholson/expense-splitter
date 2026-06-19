// @ts-check
const { test, expect } = require('@playwright/test');
const { loadApp, createTrip, addPerson, addExpense, goToTab } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await createTrip(page, 'Test Trip');
});

// Read settle balances from the UI as { name: number } (positive = gets back)
async function getBalances(page) {
  await goToTab(page, 'Settle');
  const cards = page.locator('.d-flex.gap-2.mb-3.flex-wrap > div');
  const count = await cards.count();
  const result = {};
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    // Strip couple-badge child elements, keep only text nodes
    const rawName = await card.locator('div').first().evaluate(el =>
      Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join('').trim()
    );
    const amtText = (await card.locator('div').nth(1).textContent()).trim();
    const statusText = (await card.locator('div').nth(2).textContent()).trim();
    // UI shows "£30.00" without a minus sign — use the status label to determine sign
    const magnitude = parseFloat(amtText.replace(/[£+]/g, ''));
    result[rawName] = statusText === 'owes' ? -magnitude : magnitude;
  }
  return result;
}

// Read transfer list
async function getTransfers(page) {
  await goToTab(page, 'Settle');
  const cards = page.locator('.transfer-card');
  const count = await cards.count();
  const result = [];
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const names = await card.locator('span[style*="font-weight:500"]').allTextContents();
    const amt = parseFloat((await card.locator('.amount').textContent()).replace('£', ''));
    result.push({ from: names[0].trim(), to: names[1].trim(), amt });
  }
  return result;
}

test('equal 3-way split: payer gets back 2/3, others owe 1/3', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob');
  await addPerson(page, 'Carol');
  await addExpense(page, { desc: 'Dinner', amount: 90, payer: 'Alice' });

  const bal = await getBalances(page);
  expect(bal['Alice']).toBeCloseTo(60, 1);
  expect(bal['Bob']).toBeCloseTo(-30, 1);
  expect(bal['Carol']).toBeCloseTo(-30, 1);
});

test('couple pays 2x share when split equally', async ({ page }) => {
  // £90, 4 heads total → £22.50/head; couple owes £45
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob');
  await addPerson(page, 'Carol & Dave', 2);
  await addExpense(page, { desc: 'Hotel', amount: 90, payer: 'Alice' });

  const bal = await getBalances(page);
  expect(bal['Alice']).toBeCloseTo(67.5, 1);
  expect(bal['Bob']).toBeCloseTo(-22.5, 1);
  const coupleEntry = Object.entries(bal).find(([k]) => k.includes('Carol'));
  expect(coupleEntry).toBeDefined();
  expect(coupleEntry[1]).toBeCloseTo(-45, 1);
});

test('couple as sole payer gets back correct amount', async ({ page }) => {
  // £30, 3 heads → £10/head; couple paid £30, owes £20 → net +£10
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob & Carol', 2);
  await addExpense(page, { desc: 'Taxi', amount: 30, payer: 'Bob & Carol' });

  const bal = await getBalances(page);
  const coupleEntry = Object.entries(bal).find(([k]) => k.includes('Bob'));
  expect(coupleEntry).toBeDefined();
  expect(coupleEntry[1]).toBeCloseTo(10, 1);
  expect(bal['Alice']).toBeCloseTo(-10, 1);
});

test('minimises transfers', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob');
  await addPerson(page, 'Carol');
  await addExpense(page, { desc: 'Lunch', amount: 30, payer: 'Alice', splitNames: ['Alice', 'Bob'] });
  await addExpense(page, { desc: 'Drinks', amount: 30, payer: 'Bob', splitNames: ['Bob', 'Carol'] });

  const transfers = await getTransfers(page);
  expect(transfers.length).toBeLessThanOrEqual(2);
});

test('shows settled message when all square', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob');
  await addExpense(page, { desc: 'Lunch', amount: 20, payer: 'Alice' });
  await addExpense(page, { desc: 'Dinner', amount: 20, payer: 'Bob' });

  await goToTab(page, 'Settle');
  await expect(page.locator('#settle-result')).toContainText('settled up');
});

test('multiple expenses accumulate correctly', async ({ page }) => {
  await addPerson(page, 'Alice');
  await addPerson(page, 'Bob');
  await addExpense(page, { desc: 'Lunch', amount: 40, payer: 'Alice' });
  await addExpense(page, { desc: 'Dinner', amount: 60, payer: 'Alice' });

  const bal = await getBalances(page);
  expect(bal['Alice']).toBeCloseTo(50, 1);
  expect(bal['Bob']).toBeCloseTo(-50, 1);
});
