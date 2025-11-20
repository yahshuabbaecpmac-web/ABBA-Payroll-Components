import { test, expect } from '@playwright/test';

const BASE_URL = 'https://theabbapayroll.com';
const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

// ✅ Login helper
async function loginPayroll(page, email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: /Email/i }).fill(email);
  await page.getByRole('textbox', { name: /Password/i }).fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/(dashboard|\/)$/);
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
}

// ✅ Navigation helper
async function navigateToRecurringDeduction(page) {
  await page.locator('//i[@class="mgc_settings_3_line text-xl"]').click();
  await page.locator('//span[normalize-space()="Miscellaneous"]').click();
  await page.locator('//span[normalize-space()="Recurring Deduction"]').click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Recurring Deduction Types' })).toBeVisible();
}

// ✅ Create helper
async function createRecurringDeduction(page, name, code) {
  await page.locator("//button[normalize-space()='Create']").click();
  await page.locator("//input[@placeholder='Enter Name...']").fill(name);
  await page.locator("//input[@placeholder='Enter Code...']").fill(code);
  await page.locator("//span[normalize-space()='Save']").click();
  await expect(page.getByText(/success/i)).toBeVisible({ timeout: 8000 });
  return { name, code };
}

test.describe('Recurring Deduction Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginPayroll(page);
    await navigateToRecurringDeduction(page);
  });

  // DED-REC-001 | Create New Recurring Deduction
  test('DED-REC-001 | Create New Recurring Deduction', async ({ page }) => {
    const name = `Union Dues ${Date.now()}`;
    const code = `U-DUES-${Date.now().toString().slice(-4)}`;
    await createRecurringDeduction(page, name, code);
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible();
  });

  // DED-REC-001A | Cancel Create
  test('DED-REC-001A | Cancel Create', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//input[@placeholder='Enter Name...']").fill('Cancel Deduction');
    await page.locator("//button[normalize-space()='Close']").click();
    await expect(page.getByRole('heading', { name: 'Add Recurring Deduction Type' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cancel Deduction' })).not.toBeVisible();
  });

  // DED-REC-002 | Name/Code Required Validation
  test('DED-REC-002 | Submit Empty Form', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//span[normalize-space()='Save']").click();
    await expect(page.getByText(/Recurring deduction type name is required/i)).toBeVisible();
    await expect(page.getByText(/Recurring deduction type code is required/i)).toBeVisible();
  });

  // DED-REC-004 | Export Functionality
  test('DED-REC-004 | Export Functionality', async ({ page }) => {
    await page.locator("//i[@class='text-lg mgc_more_1_fill']").click();
    await page.locator("//a[normalize-space()='Export']").click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator("//button[normalize-space()='Download']").click()
    ]);

    expect(await download.suggestedFilename()).toMatch(/recurring_deduction_types/i);
  });


  // DED-REC-006 | Delete Single Recurring Deduction
  test('DED-REC-006 | Delete Single Recurring Deduction', async ({ page }) => {
    const code = await page.locator("//tbody/tr[1]/td[2]").innerText();
    await page.locator("//tbody/tr[1]/td[4]/button[2]").click();
    await page.locator("//input[@placeholder='Enter reason...']").fill('Test delete');
    await page.locator("//button[normalize-space()='Yes']").click();
    await expect(page.getByRole('cell', { name: code, exact: true })).not.toBeVisible();
  });

  // DED-REC-006A | Cancel Single Delete
  test('DED-REC-006A | Cancel Single Delete', async ({ page }) => {
    await page.locator("//tbody/tr[1]/td[4]/button[2]").click();
    await page.locator("//button[normalize-space()='No']").click();
    await expect(page.getByText(/deleted/i)).not.toBeVisible();
  });

  // -----------------------------------------------------------
  // DED-REC-008 | Bulk Delete Recurring Deduction
  // -----------------------------------------------------------
  // DED-REC-008 | Bulk Delete Recurring Deduction
test('DED-REC-008 | Bulk Delete REC Deduction', async ({ page }) => {

  // Create 3 recurring deductions
  const n1 = `BULK-DEL-A-${Date.now()}`;
  const c1 = `BDA-${Date.now().toString().slice(-4)}`;
  await createRecurringDeduction(page, n1, c1);

  const n2 = `BULK-DEL-B-${Date.now()}`;
  const c2 = `BDB-${Date.now().toString().slice(-4)}`;
  await createRecurringDeduction(page, n2, c2);

  const n3 = `BULK-DEL-C-${Date.now()}`;
  const c3 = `BDC-${Date.now().toString().slice(-4)}`;
  await createRecurringDeduction(page, n3, c3);

  // Locate rows by NAME
  const row1 = page.locator(`tbody tr:has(td:text-is("${n1}"))`);
  const row2 = page.locator(`tbody tr:has(td:text-is("${n2}"))`);
  const row3 = page.locator(`tbody tr:has(td:text-is("${n3}"))`);

  // Select checkboxes
  await row1.locator("input[type='checkbox']").check();
  await row2.locator("input[type='checkbox']").check();
  await row3.locator("input[type='checkbox']").check();

  // Open bulk actions dropdown
  await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
  await page.locator("//a[normalize-space()='Delete Selected']").click();

  // Confirm delete
  await page.locator("//input[@placeholder='Enter reason...']").fill('test bulk delete');
  await page.locator("//button[normalize-space()='Yes']").click();

  // ✅ Assert toast safely
  await expect(
    page.locator('.Vue-Toastification__toast-body', { hasText: /success/i }).first()
  ).toBeVisible({ timeout: 8000 });

  // Optionally, verify the deleted rows no longer exist
  await expect(row1).not.toBeVisible();
  await expect(row2).not.toBeVisible();
  await expect(row3).not.toBeVisible();
});

  // -----------------------------------------------------------
  // TABLE VISIBILITY
  // -----------------------------------------------------------
  test('DED-REC-008 | Table Records Visibility', async ({ page }) => {

    const tableBody = page.locator('table tbody');
    await expect(tableBody).toBeVisible();

    const visibleRows = tableBody.locator('tr', { has: page.locator('td'), visible: true });
    const rowCount = await visibleRows.count();

    expect(rowCount).toBeGreaterThan(0);

    const totalRecordsLabel = page.locator('text=Total Records:');
    await expect(totalRecordsLabel).toBeVisible();
    const labelText = await totalRecordsLabel.textContent();
    const totalRecords = parseInt(labelText?.match(/\d+/)?.[0] || '0', 10);

    expect(rowCount).toBeLessThanOrEqual(totalRecords);
  });

});
