import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

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


test('User should be able to access Employee List page', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/employees/i);
  await expect(page.getByText(/Employee List/i)).toBeVisible();
});

test('Employee List table columns should be visible', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await expect(page.getByRole('columnheader', { name: /Employee ID/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible();
});

test('Create Employee modal should open and close properly', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(/Create Employee/i)).toBeVisible();
  await page.getByRole('button', { name: /Close/i }).click();
  await expect(page.getByText(/Create Employee/i)).toBeHidden();
});

test('Employee List should display Import, Export, and Populate Test Employees buttons', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.getByRole('button', { name: 'Create' }).locator('+ button').click();
  await expect(page.getByText('Import')).toBeVisible();
  await expect(page.getByText('Export')).toBeVisible();
  await expect(page.getByText('Populate Test Employees')).toBeVisible();
});

test('Import Employees modal should display correctly and upload a file from desktop', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.getByRole('button', { name: 'Create' }).locator('+ button').click();
  await page.getByText('Import').click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Import Employees')).toBeVisible();
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    modal.getByText(/Drop CSV file here or click to upload/i).click(),
  ]);

  const desktopPathOneDrive = 'C:\\Users\\Kylo\\OneDrive\\Desktop\\Test.import1.csv';
  const desktopPathLocal = path.join(os.homedir(), 'Desktop', 'Test.import1.csv');
  const filePath = fs.existsSync(desktopPathOneDrive) ? desktopPathOneDrive : desktopPathLocal;

  await fileChooser.setFiles(filePath);

  await Promise.race([
    expect(modal).toBeHidden({ timeout: 20000 }),
    expect(page.getByText(/Upload complete|successfully imported|Import finished/i)).toBeVisible({ timeout: 20000 }),
  ]);

  if (await modal.isVisible()) {
    await modal.getByRole('button').first().click();
    await expect(modal).toBeHidden();
  }

  await expect(page.getByText(/Employee List/i)).toBeVisible();
});

test('Export button should be clickable', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.getByRole('button', { name: 'Create' }).locator('+ button').click();
  await page.getByRole('link', { name: 'Export' }).click();
});

test('Populate Test Employees modal should open and save properly', async ({ page }) => {
  await loginpayroll(page);
  await page.getByRole('link', { name: 'Employees' }).click();
  await page.getByRole('button', { name: 'Create' }).locator('+ button').click();
  await page.getByText('Populate Test Employees').click();
  await expect(page.getByText('Generate Test Employees')).toBeVisible();
  await page.getByRole('button', { name: /Save/i }).click();
  await expect(page.getByText('Total Records:')).toBeVisible();
});
