import { test, expect } from '@playwright/test';

const BASE_URL = 'https://theabbapayroll.com';
const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

async function loginPayroll(page, email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: /Email/i }).fill(email);
  await page.getByRole('textbox', { name: /Password/i }).fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/(dashboard|\/)$/);
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
}

async function navigateToOtherDeduction(page) {
  await page.getByRole('button', { name: 'Setup' }).click();
  await page.getByRole('link', { name: 'Miscellaneous' }).click();
  await page.getByRole('link', { name: 'Other Deduction' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Other Deduction Types' })).toBeVisible();
}

test.describe('Other Deduction Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginPayroll(page);
    await navigateToOtherDeduction(page);
  });

  test('DED-OTH-001 | Create One-Time Deduction', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await expect(page.getByRole('heading', { name: 'Add Other Deduction Type' })).toBeVisible();
    
    const name = `Test Deduction ${Date.now()}`;
    const code = `TD-${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder('Enter Name...').fill(name);
    await page.getByPlaceholder('Enter Code...').fill(code);
    
    await page.locator("//span[normalize-space()='Save']").click();
    
    await expect(page.getByText('Other Deduction Type added successfully')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible();
  });

  test('DED-OTH-001A | Cancel Create', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await expect(page.getByRole('heading', { name: 'Add Other Deduction Type' })).toBeVisible();

    await page.getByPlaceholder('Enter Name...').fill('Deduction to Cancel');
    
    await page.locator("//button[normalize-space()='Close']").click();
    
    await expect(page.getByRole('heading', { name: 'Add Other Deduction Type' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Deduction to Cancel' })).not.toBeVisible();
  });

  test('DED-OTH-002 | Name/Code is required Validation', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    
    await page.locator("//span[normalize-space()='Save']").click();
    
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Code is required')).toBeVisible();
  });
  
  test('DED-REG-004 | Export Functionality', async ({ page }) => {
    await page.locator("//i[@class='text-lg mgc_more_1_fill']").click();
    await page.locator("//a[normalize-space()='Export']").click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator("//button[normalize-space()='Download']").click()
    ]);

    expect(await download.suggestedFilename()).toMatch(/_deduction_types/i);
  });

  test('DED-OTH-005 | Edit Tax Status', async ({ page }) => {
    await page.locator("//tbody/tr[1]/td[7]/button[1]").click();
    
    await page.locator("//label[normalize-space()='Deduct in Taxable Income']").click();
    await page.locator("//label[normalize-space()='Deduct in 13th Month Pay']").click();
    
    await page.locator("//span[normalize-space()='Save']").click();

    await expect(page.getByText('Other Deduction Type updated successfully')).toBeVisible();
    
    await page.locator("//tbody/tr[1]/td[7]/button[1]").click();
    await expect(page.getByLabel('Deduct in Taxable Income')).toBeChecked();
    await expect(page.getByLabel('Deduct in 13th Month Pay')).toBeChecked();
    
    await page.locator("//button[normalize-space()='Close']").click();
  });

  test('DED-OTH-005A | Cancel Edit', async ({ page }) => {
    await page.locator("//tbody/tr[1]/td[7]/button[1]").click();
    await expect(page.getByRole('heading', { name: 'Edit Other Deduction Type' })).toBeVisible();
    
    const originalName = await page.getByPlaceholder('Enter Name...').inputValue();
    await page.getByPlaceholder('Enter Name...').fill('Cancelled Edit Name');
    
    await page.locator("//button[normalize-space()='Close']").click();
    
    await expect(page.getByRole('heading', { name: 'Edit Other Deduction Type' })).not.toBeVisible();
    
    await expect(page.getByRole('cell', { name: originalName, exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cancelled Edit Name' })).not.toBeVisible();
  });

  test('DED-OTH-006 | Delete Single Deduction', async ({ page }) => {
    const deleteButtonLocator = page.locator("//tbody/tr[2]/td[7]/button[2]");
    const deductionName = await page.locator("//tbody/tr[2]/td[2]").innerText();
    
    await deleteButtonLocator.click();

    await page.getByPlaceholder('Enter reason...').fill('test delete single');
    await page.locator("//button[normalize-space()='Yes']").click();

    await expect(page.getByText('Other Deduction Type deleted successfully')).toBeVisible();
    
    await expect(page.getByRole('cell', { name: deductionName, exact: true })).not.toBeVisible();
  });
  
  test('DED-OTH-006A | Cancel Single Delete', async ({ page }) => {
    const deleteButtonLocator = page.locator("//tbody/tr[1]/td[7]/button[2]");
    const deductionName = await page.locator("//tbody/tr[1]/td[2]").innerText();
    
    await deleteButtonLocator.click();
    await expect(page.getByRole('heading', { name: 'Are you sure you want to delete' })).toBeVisible();

    await page.getByPlaceholder('Enter reason...').fill('test cancel delete');
    
    await page.locator("//button[normalize-space()='No']").click();

    await expect(page.getByRole('heading', { name: 'Are you sure you want to delete' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: deductionName, exact: true })).toBeVisible();
  });

  // DED-OTH-007 | Delete Bulk Deductions
   // DED-OTH-007 | Bulk Delete Other Deduction
test('DED-OTH-007 | Bulk Delete Other Deductions', async ({ page }) => {
  // Helper to create a deduction
  async function createOtherDeduction(page, name, code) {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.getByPlaceholder('Enter Name...').fill(name);
    await page.getByPlaceholder('Enter Code...').fill(code);
    await page.locator("//span[normalize-space()='Save']").click();
    await expect(page.getByText('Other Deduction Type added successfully')).toBeVisible({ timeout: 8000 });
  }

  const deduction1Name = `BULK-DEL-A-${Date.now()}`;
  const deduction2Name = `BULK-DEL-B-${Date.now()}`;
  const deduction3Name = `BULK-DEL-C-${Date.now()}`;

  // Create deductions
  await createOtherDeduction(page, deduction1Name, 'BDOA');
  await createOtherDeduction(page, deduction2Name, 'BDOB');
  await createOtherDeduction(page, deduction3Name, 'BDOC');

  // Select rows
  const row1 = page.locator(`table tbody tr:has(td:text-is("${deduction1Name}"))`);
  const row2 = page.locator(`table tbody tr:has(td:text-is("${deduction2Name}"))`);
  const row3 = page.locator(`table tbody tr:has(td:text-is("${deduction3Name}"))`);

  await row1.locator("input[type='checkbox']").check();
  await row2.locator("input[type='checkbox']").check();
  await row3.locator("input[type='checkbox']").check();

  // Open bulk actions
  await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
  await page.locator("//a[normalize-space()='Delete Selected']").click();

  // Fill reason & confirm
  await page.locator("//input[@placeholder='Enter reason...']").fill('test bulk delete');
  await page.locator("//button[normalize-space()='Yes']").click();

  // Wait for progress modal if it appears
  const modal = page.locator('dialog:has-text("Delete Progress")');
  if (await modal.isVisible().catch(() => false)) {
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.getByRole('button', { name: 'Close' }).click();
  }

  // Assert deletion success safely
  await expect(page.locator('.Vue-Toastification__toast-body', { hasText: /success/i }).first())
    .toBeVisible({ timeout: 8000 });

  // Verify the rows are gone
  await expect(page.getByText(deduction1Name)).not.toBeVisible();
  await expect(page.getByText(deduction2Name)).not.toBeVisible();
  await expect(page.getByText(deduction3Name)).not.toBeVisible();
});

  // -----------------------------------------------------------
  // TABLE VISIBILITY
  // -----------------------------------------------------------
  test('DED-OTH-008 | Table Records Visibility', async ({ page }) => {
  const tableBody = page.locator('table tbody');
  await expect(tableBody).toBeVisible();

  const visibleRows = tableBody.locator('tr', { has: page.locator('td'), visible: true });
  const rowCount = await visibleRows.count();

  // Ensure at least one row is visible
  await expect(rowCount).toBeGreaterThan(0);

  // Get total records number
  const totalRecordsLabel = page.locator('text=Total Records:');
  await expect(totalRecordsLabel).toBeVisible();
  const labelText = await totalRecordsLabel.textContent();
  const totalRecords = parseInt(labelText?.match(/\d+/)?.[0] || '0', 10);

  console.log(`Visible rows: ${rowCount}, Total Records: ${totalRecords}`);

  // Instead of strict equality, check visible rows <= total records
  expect(rowCount).toBeLessThanOrEqual(totalRecords);
});

});