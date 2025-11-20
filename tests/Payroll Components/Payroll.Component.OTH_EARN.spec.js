import { test, expect } from '@playwright/test';

const BASE_URL = 'https://theabbapayroll.com';
const DEFAULT_EMAIL = 'yahshuabba.ecpmac@gmail.com';
const DEFAULT_PASSWORD = 'Test1@56';

// --- Static Test Data ---
const TEST_STATIC_EDIT_NAME = 'TEST_STATIC_OTHER_EDIT';
const TEST_STATIC_EDIT_CODE = 'SOT-EDIT-STATIC';

// -------------------------------------------------------------
// HELPER FUNCTIONS 🛠️
// -------------------------------------------------------------

async function loginPayroll(page, email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: /Email/i }).fill(email);
    await page.getByRole('textbox', { name: /Password/i }).fill(password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/(dashboard|\/)$/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
}

async function navigateToOtherEarning(page) {
    await page.getByRole('button', { name: 'Setup' }).click();
    await page.getByText('Miscellaneous').click();
    await page.getByRole('link', { name: 'Other Earning' }).click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/other-earning/);
    await expect(page.locator('table tbody')).toBeVisible();
}

async function createOtherEarning(page, name, code, options = {}) {
    const { isTaxable = false, isDeMinimis = false, include13thMonth = false } = options;

    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByPlaceholder('Enter Name...').fill(name);
    await page.getByPlaceholder('Enter Code...').fill(code);

    if (isDeMinimis) await page.getByRole('checkbox', { name: 'Is De Minimis' }).check();
    if (isTaxable) await page.getByRole('checkbox', { name: 'Is Taxable' }).check();
    if (include13thMonth) await page.getByRole('checkbox', { name: 'Include in 13th Month Pay' }).check();

    await page.getByText('Save', { exact: true }).click();
    await expect(page.getByText(/successfully/i)).toBeVisible();
}

async function ensureRecordExists(page, name, baseCode) {
    const searchField = page.getByPlaceholder('Search...');
    await searchField.fill(name);
    await page.waitForTimeout(500);

    const existingRow = page.locator(`table tbody tr:has(td:text-is("${name}"))`);
    if (await existingRow.isVisible()) {
        await searchField.clear();
        return name;
    }

    await searchField.clear();
    const uniqueCode = `${baseCode}-${Date.now()}`;
    await createOtherEarning(page, name, uniqueCode, { isTaxable: false, isDeMinimis: false, include13thMonth: false });
    await expect(page.getByText(name)).toBeVisible();
    return name;
}

// -------------------------------------------------------------
// TEST SUITE 🧪
// -------------------------------------------------------------
test.describe('Other Earnings Module', () => {

    test.beforeEach(async ({ page }) => {
        await loginPayroll(page);
        await navigateToOtherEarning(page);
    });

    // -----------------------------
    // CREATE
    // -----------------------------
    test('EARN-OTH-001 | Create One-Time Earning - All Checkboxes', async ({ page }) => {
        const uniqueName = `Year-End Bonus ${Date.now()}`;
        await createOtherEarning(page, uniqueName, 'YEB-001', {
            isTaxable: true,
            isDeMinimis: true,
            include13thMonth: true
        });

        await expect(page.getByText('Other Earning Type added successfully')).toBeVisible();
        await expect(page.getByText(uniqueName)).toBeVisible();
    });

    // -----------------------------
    // EDIT
    // -----------------------------
    test('EARN-OTH-002 | Edit Existing Record - Toggle All Checkboxes', async ({ page }) => {
    const originalName = await ensureRecordExists(page, TEST_STATIC_EDIT_NAME, TEST_STATIC_EDIT_CODE);

    // Use direct row selector instead of getByRole
    const editButton = page.locator('//tbody/tr[td[text()="' + originalName + '"]]/td[last()]/button[1]/i[1]');
    await editButton.click();

    const checkboxes = [
        page.getByRole('checkbox', { name: 'Is De Minimis' }),
        page.getByRole('checkbox', { name: 'Is Taxable' }),
        page.getByRole('checkbox', { name: 'Include in 13th Month Pay' })
    ];

    for (const box of checkboxes) {
        if (!(await box.isChecked())) {
            await box.check();
        }
    }

    await page.getByText('Save', { exact: true }).click();
    await expect(page.getByText('Other Earning Type updated successfully')).toBeVisible();
});

    // -----------------------------
    // EXPORT
    // -----------------------------
    test('EARN-OTH-003 | Export Functionality', async ({ page }) => {
        const moreButton = page.locator('//i[@class="text-lg mgc_more_1_fill"]');
        await expect(moreButton).toBeVisible({ timeout: 5000 });
        await moreButton.click();

        const exportLink = page.locator("//a[normalize-space()='Export']");
        await exportLink.click();

        const downloadButton = page.locator("//button[normalize-space()='Download']");
        await expect(downloadButton).toBeVisible({ timeout: 15000 });

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            downloadButton.click()
        ]);

        expect(await download.suggestedFilename()).toContain('other_earning_types');
        expect(await download.suggestedFilename()).toMatch(/\.csv$/);
    });

    // -----------------------------
    // DELETE SINGLE
    // -----------------------------
    test('EARN-OTH-005 | Delete Single Earning', async ({ page }) => {
        const deleteName = `Delete-Single-Other-${Date.now()}`;
        await createOtherEarning(page, deleteName, 'DSO-1');

        const rowLocator = page.locator(`table tbody tr:has(td:text-is("${deleteName}"))`);
        await rowLocator.locator('td:last-child >> button:nth-child(2)').click();

        await page.getByPlaceholder('Enter reason...').fill('test single delete');
        await page.locator("//button[normalize-space()='Yes']").click();

        await expect(page.getByText('Other Earning Type deleted successfully')).toBeVisible();
        await expect(page.getByText(deleteName)).not.toBeVisible();
    });

    // -----------------------------
    // BULK DELETE
    // -----------------------------
    test('EARN-OTH-006 | Bulk Delete Earnings', async ({ page }) => {
        const earning1 = `BULK-DEL-OTH-A-${Date.now()}`;
        const earning2 = `BULK-DEL-OTH-B-${Date.now()}`;
        const earning3 = `BULK-DEL-OTH-C-${Date.now()}`;

        await createOtherEarning(page, earning1, 'BDOA');
        await createOtherEarning(page, earning2, 'BDOB');
        await createOtherEarning(page, earning3, 'BDOC');

        const row1 = page.locator(`table tbody tr:has(td:text-is("${earning1}"))`);
        const row2 = page.locator(`table tbody tr:has(td:text-is("${earning2}"))`);
        const row3 = page.locator(`table tbody tr:has(td:text-is("${earning3}"))`);

        await row1.locator("input[type='checkbox']").check();
        await row2.locator("input[type='checkbox']").check();
        await row3.locator("input[type='checkbox']").check();

        await page.locator('//i[@class="text-lg mgc_down_fill"]').click();
        await page.locator("//a[normalize-space()='Delete Selected']").click();
        await page.locator("//input[@placeholder='Enter reason...']").fill('test bulk delete');
        await page.locator("//button[normalize-space()='Yes']").click();

        await expect(page.getByText('Delete Progress')).toBeVisible();
        await expect(page.getByText('3/3')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('3 Success')).toBeVisible();

        await page.getByRole('button', { name: 'Close' }).click();

        await expect(page.getByText(earning1)).not.toBeVisible();
        await expect(page.getByText(earning2)).not.toBeVisible();
        await expect(page.getByText(earning3)).not.toBeVisible();
    });

    // -----------------------------
    // ENSURE STATIC RECORD EXISTS
    // -----------------------------
    test('EARN-OTH-007 | Ensure Static Record Exists', async ({ page }) => {
        await ensureRecordExists(page, TEST_STATIC_EDIT_NAME, TEST_STATIC_EDIT_CODE);
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
