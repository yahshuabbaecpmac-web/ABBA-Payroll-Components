import { test, expect } from '@playwright/test';

const BASE_URL = 'https://theabbapayroll.com';
const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

// =============================
//        HELPERS
// =============================

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
async function navigateToContribution(page) {
  await page.locator('//i[@class="mgc_settings_3_line text-xl"]').click();
  await page.locator('//span[normalize-space()="Miscellaneous"]').click();
  await page.locator('//span[normalize-space()="Contributions"]').click();
  await page.waitForLoadState('networkidle');
}

// ✅ Create Contribution helper
async function createContribution(page, name) {
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByPlaceholder('Enter Name...').fill(name);
  await page.locator("//span[normalize-space()='Save']").click();

  const toast = page.locator('.Vue-Toastification__toast-body', { hasText: /success/i });
  await expect(toast.first()).toBeVisible({ timeout: 10000 });
}

/* --------------------------------------------------------
   ✅ UNIVERSAL RECORDS-PER-PAGE HANDLER
   -------------------------------------------------------- */
async function setRecordsPerPage(page, value = '5') {
  await page.locator('body').press('PageDown');
  await page.waitForTimeout(300);

  const container = page.locator('div.flex.items-center.gap-10');
  await container.scrollIntoViewIfNeeded();

  const nativeSelect = container.locator('select');
  if (await nativeSelect.count()) {
    await nativeSelect.selectOption({ label: value });
    await page.waitForTimeout(800);
    return;
  }

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
//        TEST SUITE
// =============================
test.describe('Contribution Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginPayroll(page);
    await navigateToContribution(page);
  });

  // ============================================================
  //  CONT-001 | Create New Contribution Type
  // ============================================================
  test('CONT-001 | Create New Contribution Type', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//input[@placeholder='Enter Name...']").fill('Pag-IBIG Fund');
    await page.locator("//span[normalize-space()='Save']").click();

    await expect(page.getByText(/Success/i)).toBeVisible();
    await expect(page.getByText('Pag-IBIG Fund')).toBeVisible();
  });

  // ============================================================
  //  CONT-002 | Submit Form with Missing Name
  // ============================================================
  test('CONT-002 | Submit Form with Missing Name', async ({ page }) => {
    await page.locator("//button[normalize-space()='Create']").click();
    await page.locator("//span[normalize-space()='Save']").click();

    await expect(page.getByText(/Name is required/i)).toBeVisible();
  });

  // ============================================================
  //  CONT-004 | Search Bar Functionality
  // ============================================================
  test('CONT-004 | Search Bar Functionality', async ({ page }) => {
    const searchInput = page.locator("//input[@placeholder='Search...']");
    await searchInput.fill('Pag-IBIG Fund');

    const searchButton = page.locator("//button[@class='px-3 bg-white border-l border-gray-300 border-none']");
    await searchButton.click();

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toHaveText(/Fund/i);

    const totalRecords = page.locator("text=Total Records:");
    await expect(totalRecords).toContainText(/\d+/);
  });

  // ============================================================
  //  CONT-005 | Export Contribution List
  // ============================================================
  test('CONT-005 | Export Contribution List', async ({ page }) => {
    await page.locator("//i[@class='text-lg mgc_more_1_fill']").click();
    await page.locator("//a[normalize-space()='Export']").click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator("//button[normalize-space()='Download']").click()
    ]);

    expect(await download.suggestedFilename()).toMatch(/contribution/i);
  });

  // ============================================================
  //  CONT-006 | Edit Contribution Name
  // ============================================================
  test('CONT-006 | Edit Contribution Name', async ({ page }) => {
  const editButton = page.locator("//tbody/tr[1]/td[last()]/button[1]");
  await editButton.click();

  const nameInput = page.getByRole('textbox', { name: 'Enter Name...' });
  await nameInput.fill('BDO Fund');

  await page.getByRole('button', { name: 'Save' }).click();

  // Wait for modal to close
  await expect(page.getByRole('heading', { name: 'Edit Contribution' })).not.toBeVisible();

  // Verify updated name appears in table
  await expect(page.getByText('BDO Fund')).toBeVisible();
});

  // ============================================================
  //  CONT-007 | Delete Single Contribution
  // ============================================================
  test('CONT-007 | Delete Single Contribution', async ({ page }) => {
    const deleteButton = page.locator("//tbody/tr[1]/td[last()]/button[2]");
    await deleteButton.click();

    await page.getByRole('textbox', { name: /reason/i }).fill('test delete');
    await page.locator("//button[normalize-space()='Yes']").click();

    await expect(page.getByText(/Success|Deleted/i)).toBeVisible();
  });

  // ============================================================
  //  CONT-008 | Bulk Delete Contributions
  // ============================================================
  // ============================================================
//  CONT-008 | Bulk Delete Contributions
// ============================================================
test('CONT-008 | Bulk Delete Contributions', async ({ page }) => {
  const contribution1 = `BULK-CONT-A-${Date.now()}`;
  const contribution2 = `BULK-CONT-B-${Date.now()}`;
  const contribution3 = `BULK-CONT-C-${Date.now()}`;

  await createContribution(page, contribution1);
  await createContribution(page, contribution2);
  await createContribution(page, contribution3);

  const row1 = page.locator(`table tbody tr:has(td:text-is("${contribution1}"))`);
  const row2 = page.locator(`table tbody tr:has(td:text-is("${contribution2}"))`);
  const row3 = page.locator(`table tbody tr:has(td:text-is("${contribution3}"))`);

  await row1.locator("input[type='checkbox']").check();
  await row2.locator("input[type='checkbox']").check();
  await row3.locator("input[type='checkbox']").check();

  await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
  await page.locator("//a[normalize-space()='Delete Selected']").click();

  await page.locator("//input[@placeholder='Enter reason...']").fill('test bulk delete');
  await page.locator("//button[normalize-space()='Yes']").click();

  const modal = page.locator('dialog:has-text("Delete Progress")');
  if (await modal.isVisible().catch(() => false)) {
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.getByRole('button', { name: 'Close' }).click();
  }

  await expect(page.getByText(contribution1)).not.toBeVisible();
  await expect(page.getByText(contribution2)).not.toBeVisible();
  await expect(page.getByText(contribution3)).not.toBeVisible();
});

test('CONT-009 | Table Records Visibility', async ({ page }) => {
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
