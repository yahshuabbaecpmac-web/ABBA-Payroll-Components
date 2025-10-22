import { test, expect } from '@playwright/test';

const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

async function loginpayroll(page, email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  await page.goto('https://theabbapayroll.com/login');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/dashboard|\/$/);
}

test('Verify Dashboard main widgets are visible', async ({ page }) => {
  await loginpayroll(page);
  await expect(page.getByText('Present Today')).toBeVisible();
  await expect(page.getByText('Absent Today')).toBeVisible();
  await expect(page.getByText('Overtime Requests')).toBeVisible();
});

test('Verify Dashboard Overtime Requests redirects correctly', async ({ page }) => {
  await loginpayroll(page);
  const page1Promise = page.waitForEvent('popup');
  await page.getByText('Overtime Requests').click();
  const page1 = await page1Promise;
  await expect(page1).toHaveURL(/overtime/i);
});

test('Verify Dashboard Present Today is visible', async ({ page }) => {
  await loginpayroll(page);
  await expect(page.getByText('Present Today')).toBeVisible();
});

test('Verify Dashboard Absent Today is visible', async ({ page }) => {
  await loginpayroll(page);
  await expect(page.getByText('Absent Today')).toBeVisible();
});
