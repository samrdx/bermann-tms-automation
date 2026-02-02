import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Auth - Login', () => {

  test('Should login successfully with valid credentials', async ({
    loginPage,
  }) => {
    
    // Test data
    const user = getTestUser('regular');
    logger.info(`Using credentials: ${user.username}`);

    await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        
        const isSuccess = await loginPage.isLoginSuccessful();
        expect(isSuccess).toBe(true);
        if (isSuccess) {
            await loginPage.takeScreenshot('login-success');
            logger.info('✅ Login successful');
        } else {
            await loginPage.takeScreenshot('login-failure');
            logger.error('❌ Login unsuccessful');
        }
    });
  });
});