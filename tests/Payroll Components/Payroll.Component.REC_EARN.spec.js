import { test, expect } from '@playwright/test';

const BASE_URL = 'https://theabbapayroll.com';
const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

// --- Static Test Data ---
const TEST_STATIC_EDIT_NAME = 'TEST_STATIC_EDIT_RECUR';
const TEST_STATIC_EDIT_CODE = 'STATIC_EDIT';

// -------------------------------------------------------------
// HELPER FUNCTIONS 🛠️
// -------------------------------------------------------------
async function loginPayroll(page, email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: /Email/i }).fill(email);
    await page.getByRole('textbox', { name: /Password/i }).fill(password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
}

async function navigateToRecurringEarning(page) {
    await page.getByRole('button', { name: 'Setup' }).click();
    await page.getByText('Miscellaneous').click();
    await page.getByRole('link', { name: 'Recurring Earning' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table tbody')).toBeVisible();
}

async function setRecordsPerPage(page, value = '5') {
    await page.locator('body').press('PageDown');
    await page.waitForTimeout(200);

    const container = page.locator('div.flex.items-center.gap-10');
    const nativeSelect = container.locator('select');
    if (await nativeSelect.count()) {
        await nativeSelect.selectOption(value);
        await page.waitForTimeout(500);
        await expect(page.getByText(/Total Records:/, { exact: false })).toBeVisible();
        return;
    }

    const combo = container.getByRole('combobox');
    if (await combo.count()) {
        await combo.click();
        await combo.fill(value);
        await combo.press('Enter');
        await page.waitForTimeout(500);
        await expect(page.getByText(/Total Records:/, { exact: false })).toBeVisible();
        return;
    }

    throw new Error('Records-per-page selector not found');
}

async function createRecurringEarning(page, name, code) {
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByPlaceholder('Enter Name...').fill(name);
    await page.getByPlaceholder('Enter Code...').fill(code);
    await page.locator("//span[normalize-space()='Save']").click();

    await page.waitForSelector(`table tbody tr:has-text("${name}")`, { state: 'visible', timeout: 5000 });
}

async function ensureRecordExists(page, name, baseCode) {
    const search = page.getByPlaceholder('Search...');
    await search.fill(name);
    await page.waitForTimeout(400);

    const row = page.locator(`table tbody tr:has-text("${name}")`);
    if (await row.isVisible()) {
        await search.clear();
        return name;
    }

    await search.clear();
    const uniqueCode = `${baseCode}-${Date.now()}`;
    await createRecurringEarning(page, name, uniqueCode);
    await expect(page.getByText(name)).toBeVisible();
    return name;
}

// -------------------------------------------------------------
// TEST SUITE 🧪
// -------------------------------------------------------------
test.describe('Recurring Earnings Module', () => {

    test.beforeEach(async ({ page }) => {
        await loginPayroll(page);
        await navigateToRecurringEarning(page);
    });

    // -----------------------------
    // CREATE
    // -----------------------------
    test('EARN-REC-001 | Create Recurring Earning', async ({ page }) => {
        const uniqueName = `Car Allowance ${Date.now()}`;
        await createRecurringEarning(page, uniqueName, 'CAR-ALW');
        await expect(page.getByText(uniqueName)).toBeVisible();
    });

    // -----------------------------
    // VALIDATION
    // -----------------------------
    test('EARN-REC-002 | Validation — Missing Name/Code', async ({ page }) => {
        await page.getByRole('button', { name: 'Create' }).click();
        await page.locator("//span[normalize-space()='Save']").click();

        await expect(page.getByText(/Name is required/i)).toBeVisible();
    });

    // -----------------------------
    // EXPORT
    // -----------------------------
   test('DED-REG-004 | Export Functionality', async ({ page }) => {
    await page.locator("//i[@class='text-lg mgc_more_1_fill']").click();
    await page.locator("//a[normalize-space()='Export']").click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator("//button[normalize-space()='Download']").click()
    ]);

    expect(await download.suggestedFilename()).toMatch(/recurring_earning_types/i);
  });

    // -----------------------------
    // EDIT
    // -----------------------------
    test('EARN-REC-004 | Edit Existing Recurring Earning - Toggle All Checkboxes', async ({ page }) => {
    // Ensure a static record exists
    const originalName = await ensureRecordExists(page, TEST_STATIC_EDIT_NAME, TEST_STATIC_EDIT_CODE);

    // Use direct row selector to click the edit button
    const editButton = page.locator(`//tbody/tr[td[text()="${originalName}"]]/td[last()]/button[1]/i[1]`);
    await editButton.click();

    // Fill in a new name
    const newName = `Edited Recurring ${Date.now()}`;
    await page.getByPlaceholder('Enter Name...').fill(newName);

    // Toggle checkboxes: Is Taxable, Is De Minimis, Include in 13th Month
    const checkboxes = [
        page.getByRole('checkbox', { name: 'Is Taxable' }),
        page.getByRole('checkbox', { name: 'Is De Minimis' }),
        page.getByRole('checkbox', { name: 'Include in 13th Month Pay' })
    ];

    for (const box of checkboxes) {
        if (!(await box.isChecked())) {
            await box.check();
        }
    }

    // Save changes
    await page.getByText('Save', { exact: true }).click();

    // Verify updated record
    const updatedRow = page.locator(`table tbody tr:has(td:text-is("${newName}"))`);
    await expect(updatedRow).toBeVisible();

    // Ensure all checkboxes are reflected as 'Yes' in the table
    await expect(updatedRow.locator('td', { hasText: 'Yes' })).toHaveCount(3);
});

    // -----------------------------
    // DELETE SINGLE
    // -----------------------------
     test('EARN-REC-005 | Delete Single Recurring Earning', async ({ page }) => {
    const deleteName = `Delete-Single-Recurring-${Date.now()}`;
    await createRecurringEarning(page, deleteName, 'DSR-1');

    const rowLocator = page.locator(`table tbody tr:has(td:text-is("${deleteName}"))`);
    await rowLocator.locator('td:last-child >> button:nth-child(2)').click();

    await page.getByPlaceholder('Enter reason...').fill('test single delete');
    await page.locator("//button[normalize-space()='Yes']").click();

    await expect(page.getByText('Recurring Earning Type deleted successfully')).toBeVisible();
    await expect(page.getByText(deleteName)).not.toBeVisible();
});

    // -----------------------------
    // BULK DELETE
    // -----------------------------
    test('EARN-REC-006 | Bulk Delete Recurring Earnings', async ({ page }) => {
        const A = `BULK-A-${Date.now()}`;
        const B = `BULK-B-${Date.now()}`;

        await createRecurringEarning(page, A, 'BKA');
        await createRecurringEarning(page, B, 'BKB');

        await page.locator(`table tbody tr:has-text("${A}") input[type="checkbox"]`).check();
        await page.locator(`table tbody tr:has-text("${B}") input[type="checkbox"]`).check();

        await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
        await page.locator("//a[normalize-space()='Delete Selected']").click();

        await page.getByPlaceholder('Enter reason...').fill('bulk delete');
        await page.getByRole('button', { name: 'Yes' }).click();

        await expect(page.getByText(A)).not.toBeVisible();
        await expect(page.getByText(B)).not.toBeVisible();
    });

    // -----------------------------
    // SEARCH
    // -----------------------------
    test('EARN-REC-007 | Search Bar Functionality', async ({ page }) => {
    const searchInput = page.locator("//input[@placeholder='Search...']");
    await searchInput.fill('Car'); 

    const searchButton = page.locator("//button[@class='px-3 bg-white border-l border-gray-300 border-none']");
    await searchButton.click();

    await expect(page.locator('tbody tr').first()).toHaveText(/Car/i);
    await expect(page.locator("text=Total Records:")).toContainText(/\d+/);
});

    // -----------------------------
    // TABLE VISIBILITY
    // -----------------------------
    test('EARN-REC-008 | Table Records Visibility', async ({ page }) => {
        const tableBody = page.locator('table tbody');
        await expect(tableBody).toBeVisible();

        const visibleRows = tableBody.locator('tr', { has: page.locator('td'), visible: true });
        const rowCount = await visibleRows.count();
        await expect(rowCount).toBeGreaterThan(0);

        const totalRecordsLabel = page.locator('text=Total Records:');
        await expect(totalRecordsLabel).toBeVisible();
        const labelText = await totalRecordsLabel.textContent();
        const totalRecords = parseInt(labelText?.match(/\d+/)?.[0] || '0', 10);

        console.log(`Visible rows: ${rowCount}, Total Records: ${totalRecords}`);
        expect(rowCount).toBeLessThanOrEqual(totalRecords);
    });


});
