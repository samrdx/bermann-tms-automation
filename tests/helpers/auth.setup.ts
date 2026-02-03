
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../src/modules/auth/pages/LoginPage.js';
import { getTestUser } from '../../src/config/credentials.js';
import path from 'path';
import fs from 'fs';

// path.resolve starts from CWD (root), so this remains valid without changes
const authFile = path.resolve('playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // Ensure the auth directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Use environment variables if provided, otherwise fallback to existing credentials logic
    const username = process.env.TMS_USER || getTestUser('regular').username;
    const password = process.env.TMS_PASS || getTestUser('regular').password;

    const loginPage = new LoginPage(page);

    // Perform login
    await loginPage.login(username, password);

    // Wait for validation - ensuring we are truly logged in
    await expect(page.locator('.logo-min')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.fal.fa-home')).toBeVisible();

    // Save storage state
    await page.context().storageState({ path: authFile });
});
