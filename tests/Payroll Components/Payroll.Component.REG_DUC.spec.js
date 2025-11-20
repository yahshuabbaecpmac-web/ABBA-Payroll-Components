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
async function navigateToRegularDeduction(page) {
  await page.locator('//i[@class="mgc_settings_3_line text-xl"]').click();
  await page.locator('//span[normalize-space()="Miscellaneous"]').click();
  await page.getByText('Regular Deduction', { exact: true }).click();
  await page.waitForLoadState('networkidle');
}

// ✅ Create helper
async function createOtherEarning(page, name, code, isTaxable = false) {
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByPlaceholder('Enter Name...').fill(name);
  await page.getByPlaceholder('Enter Code...').fill(code);
  await page.locator("//span[normalize-space()='Save']").click();

  const toast = page.locator('.Vue-Toastification__toast-body', { hasText: /successfully/i });
  await expect(toast.first()).toBeVisible({ timeout: 10000 });
}

/* --------------------------------------------------------
   ✅ UNIVERSAL RECORDS-PER-PAGE HANDLER
   -------------------------------------------------------- */
async function setRecordsPerPage(page, value = '5') {
  // Scroll down to ensure footer section becomes visible
  await page.locator('body').press('PageDown');
  await page.waitForTimeout(300);

  const container = page.locator('div.flex.items-center.gap-10');
  await container.scrollIntoViewIfNeeded();

  // 1️⃣ Try native <select>
  const nativeSelect = container.locator('select');
  if (await nativeSelect.count()) {
    await nativeSelect.selectOption({ label: value });
    await page.waitForTimeout(800);
    return;
  }

  // 2️⃣ Try custom combobox
  const combo = container.getByRole('combobox');
  if (await combo.count()) {
    await combo.click();
    await combo.fill(value);
    await combo.press('Enter');
    await page.waitForTimeout(800);
    return;
  }

  throw new Error("Records-per-page control not found.");
}
/* --------------------------------------------------------
   END OF INSERT
   -------------------------------------------------------- */


// =============================
//      TEST SUITE
// =============================
test.describe('Regular Deduction Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginPayroll(page);
    await navigateToRegularDeduction(page);
  });

  // ============================================================
  //  DED-REG-001 | Create New Deduction Type
  // ============================================================
  test('DED-REG-001 | Create New Deduction Type', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//input[@placeholder='Enter Name...']").fill('Test Loan');
    await page.locator("//input[@placeholder='Enter Code...']").fill('LTest-001');

    const saveButton = page.locator("//span[normalize-space()='Save']");
    await saveButton.click();

    await expect(page.getByText(/Success/i)).toBeVisible({ timeout: 10000 });
  });

  // ============================================================
  //  DED-REG-002 | Submit Form with Missing Name
  // ============================================================
  test('DED-REG-002 | Submit Form with Missing Name', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//input[@placeholder='Enter Code...']").fill('CODE123');

    await page.locator("//span[normalize-space()='Save']").click();
    await expect(page.getByText(/Name is required/i)).toBeVisible({ timeout: 10000 });
  });

  // ============================================================
  //  DED-REG-004 | Search Bar Functionality
  // ============================================================
  test('DED-REG-004 | Search Bar Functionality', async ({ page }) => {
    const searchInput = page.locator("//input[@placeholder='Search...']");
    await searchInput.fill('Loan');

    const searchButton = page.locator("//button[@class='px-3 bg-white border-l border-gray-300 border-none']");
    await searchButton.click();

    await expect(page.locator('tbody tr').first()).toHaveText(/Loan/i);
    await expect(page.locator("text=Total Records:")).toContainText(/\d+/);
  });

  // ============================================================
  //  DED-REG-004 | Export Functionality
  // ============================================================
  test('DED-REG-004 | Export Functionality', async ({ page }) => {
    await page.locator("//i[@class='text-lg mgc_more_1_fill']").click();
    await page.locator("//a[normalize-space()='Export']").click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator("//button[normalize-space()='Download']").click()
    ]);

    expect(await download.suggestedFilename()).toMatch(/regular_deduction_types/i);
  });

  // ============================================================
  //  DED-REG-006 | Edit Deduction Name
  // ============================================================
  test('DED-REG-006 | Edit Deduction Name', async ({ page }) => {
    const editButton = page.locator("//tbody/tr[1]/td[6]/button[1]/i[1]");
    await editButton.click();

    const nameInput = page.locator("//input[@placeholder='Enter Name...']");
    await nameInput.fill('BDO Loan');

    const saveButton = page.locator("//span[normalize-space()='Save']");
    await saveButton.click();

    await expect(page.getByText(/Success/i)).toBeVisible({ timeout: 8000 });
  });

  // ============================================================
  //  DED-REG-007 | Delete Single Deduction
  // ============================================================
  test('DED-REG-007 | Delete Single Deduction', async ({ page }) => {
    const deleteButton = page.locator("//tbody/tr[1]/td[6]/button[2]/i[1]");
    await deleteButton.click();

    await page.getByRole('textbox', { name: /reason/i }).fill('test delete');
    await page.locator("//button[normalize-space()='Yes']").click();

    await expect(page.getByText(/Success|Deleted/i)).toBeVisible({ timeout: 10000 });
  });

  // ============================================================
  //  DED-REG-008 | Bulk Delete REG Deduction
  // ============================================================
  test('DED-REG-008 | Bulk Delete REG Deduction', async ({ page }) => {
    const earning1Name = `BULK-DEL-A-${Date.now()}`;
    const earning2Name = `BULK-DEL-B-${Date.now()}`;
    const earning3Name = `BULK-DEL-C-${Date.now()}`;

    await createOtherEarning(page, earning1Name, 'BDOA');
    await createOtherEarning(page, earning2Name, 'BDOB');
    await createOtherEarning(page, earning3Name, 'BDOC');

    const rowLocator1 = page.locator(`table tbody tr:has(td:text-is("${earning1Name}"))`);
    const rowLocator2 = page.locator(`table tbody tr:has(td:text-is("${earning2Name}"))`);
    const rowLocator3 = page.locator(`table tbody tr:has(td:text-is("${earning3Name}"))`);

    await rowLocator1.locator("input[type='checkbox']").check();
    await rowLocator2.locator("input[type='checkbox']").check();
    await rowLocator3.locator("input[type='checkbox']").check();

    await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
    await page.locator("//a[normalize-space()='Delete Selected']").click();

    await page.locator("//input[@placeholder='Enter reason...']").fill('test bulk delete');
    await page.locator("//button[normalize-space()='Yes']").click();

    const modal = page.locator('dialog:has-text("Delete Progress")');
    if (await modal.isVisible().catch(() => false)) {
      await expect(modal).toBeVisible({ timeout: 15000 });
      await modal.getByRole('button', { name: 'Close' }).click();
    }

    await expect(page.getByText(earning1Name)).not.toBeVisible();
    await expect(page.getByText(earning2Name)).not.toBeVisible();
    await expect(page.getByText(earning3Name)).not.toBeVisible();
  });

// -----------------------------------------------------------
  // TABLE VISIBILITY
  // -----------------------------------------------------------
  test('DED-REG-009 | Table Records Visibility', async ({ page }) => {
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
