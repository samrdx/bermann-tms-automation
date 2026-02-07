import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Auth - Full Flow', () => {

  test('Should complete full login-logout flow', async ({
    loginPage,
    dashboardPage
  }) => {
    const user = getTestUser('regular');

    await test.step('Phase 1: Login', async () => {
      logger.info('🔐 PHASE 1: Login');
      await loginPage.loginAndWaitForDashboard(user.username, user.password);

      const isSuccess = await loginPage.isLoginSuccessful();
      expect(isSuccess).toBe(true);
      logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate Dashboard', async () => {
      logger.info('🧭 PHASE 2: Navigate Dashboard');

      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBe(true);

      logger.info('✅ Dashboard verified');
    });

    await test.step('Phase 3: Logout', async () => {
      logger.info('🚪 PHASE 3: Logout');
      await dashboardPage.logout();  // Now with proper navigation wait from Fix 2
      logger.info('✅ Logout action completed');
    });

    await test.step('Phase 4: Verify', async () => {
      logger.info('✅ PHASE 4: Final Verification');

      const isOnLoginPage = await loginPage.isOnLoginPage();
      expect(isOnLoginPage).toBe(true);

      logger.info('✅ Full flow completed: Login → Dashboard → Logout');
    });
  });
});
