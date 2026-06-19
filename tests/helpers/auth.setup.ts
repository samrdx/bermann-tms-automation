
import { test as setup, expect } from '../../src/fixtures/base.js';
import { getTestUser } from '../../src/config/credentials.js';
import path from 'path';
import fs from 'fs';

const envName = (process.env.ENV || 'QA').toLowerCase();
const authFile = path.resolve(`playwright/.auth/user-${envName}.json`);

setup('authenticate', async ({ page, loginPage }) => {
    // Ensure the auth directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Use environment variables if provided, otherwise fallback to existing credentials logic
    const username = process.env.TMS_USERNAME || getTestUser('regular').username;
    const password = process.env.TMS_PASSWORD || getTestUser('regular').password;

    // Perform login
    await loginPage.login(username, password);

    // Wait for validation - ensuring we are truly logged in
    await expect(page.locator('.logo-min')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.fal.fa-home')).toBeVisible();

    // Save storage state
    await page.context().storageState({ path: authFile });
});
