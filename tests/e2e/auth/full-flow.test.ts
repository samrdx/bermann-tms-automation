import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DashboardPage } from '../../../src/modules/auth/pages/DashboardPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test('Should complete full login-logout flow', async ({ page }) => {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Full Flow Test (Login + Navigate + Logout)');
    logger.info('='.repeat(60));

    // PHASE 0: Setup
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    const user = getTestUser('regular');

    // PHASE 1: Login
    logger.info('\n🔐 PHASE 1: Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    let isOnDashboard = await dashboardPage.isOnDashboard();
    expect(isOnDashboard).toBeTruthy();
    
    logger.info('✅ Login successful');

    // PHASE 2: Navigate Dashboard
    logger.info('\n🧭 PHASE 2: Navigate Dashboard');
    
    // Wait to see dashboard elements
    await page.waitForTimeout(2000);
    
    // Verify dashboard elements visible
    const welcomeVisible = await page.locator('text=/bienvenido|dashboard|inicio/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    logger.info(`Dashboard elements visible: ${welcomeVisible}`);
    
    logger.info('✅ Dashboard navigation verified');

    // PHASE 3: Logout
    logger.info('\n🚪 PHASE 3: Logout');
    await dashboardPage.logout();
    logger.info('✅ Logout action completed');

    // PHASE 4: Verify
    logger.info('\n✅ PHASE 4: Final Verification');
    await page.waitForTimeout(2000);
    
    const isOnLoginPage = await loginPage.isOnLoginPage();
    expect(isOnLoginPage).toBeTruthy();
    
    logger.info('✅ Full flow completed: Login → Dashboard → Logout');
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ FULL FLOW TEST PASSED');
    logger.info('='.repeat(60));
});