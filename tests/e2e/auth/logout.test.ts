import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Auth - Logout', () => {

  test('Should logout successfully', async ({
    page,
    loginPage,
    dashboardPage
  }) => {
    
    // Test data
    const user = getTestUser('regular');

    await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await dashboardPage.isOnDashboard()).toBe(true);
        logger.info('✅ Login successful');
        await page.screenshot({ path: './reports/screenshots/logout-01-login.png' });
    });

    await test.step('Phase 2: Logout', async () => {
        logger.info('🚪 PHASE 2: Logout');
        await dashboardPage.logout();
        logger.info('✅ Logout action completed');
        await page.screenshot({ path: './reports/screenshots/logout-02-after-logout.png' });
    });

    await test.step('Phase 3: Verify', async () => {
        logger.info('✅ PHASE 3: Verification');
        await page.waitForTimeout(2000);
        
        const isOnLoginPage = await loginPage.isOnLoginPage();
        expect(isOnLoginPage).toBe(true);
        
        logger.info('✅ Successfully redirected to login page');
        await page.screenshot({ path: './reports/screenshots/logout-03-verification.png' });
    });
  });
});