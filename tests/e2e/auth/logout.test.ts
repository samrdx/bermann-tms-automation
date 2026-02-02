import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/pages/LoginPage.js';
import { DashboardPage } from '../../../src/pages/DashboardPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testLogout() {
  const browser = new BrowserManager();
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Logout Test');
    logger.info('='.repeat(60));

    // PHASE 0: Setup
    await browser.initialize();
    const page = browser.getPage();
    
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    const user = getTestUser('regular');

    // PHASE 1: Login
    logger.info('\n🔐 PHASE 1: Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    const isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard');
    }
    
    logger.info('✅ Login successful');
    await page.screenshot({ path: './reports/screenshots/logout-01-login.png' });

    // PHASE 2: Logout
    logger.info('\n🚪 PHASE 2: Logout');
    await dashboardPage.logout();
    logger.info('✅ Logout action completed');
    await page.screenshot({ path: './reports/screenshots/logout-02-after-logout.png' });

    // PHASE 3: Verify
    logger.info('\n✅ PHASE 3: Verification');
    await page.waitForTimeout(2000);
    
    const isOnLoginPage = await loginPage.isOnLoginPage();
    if (!isOnLoginPage) {
      throw new Error('Not redirected to login page after logout');
    }
    
    logger.info('✅ Successfully redirected to login page');
    await page.screenshot({ path: './reports/screenshots/logout-03-verification.png' });
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ LOGOUT TEST PASSED');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Logout test failed', error);
    
    try {
      await browser.getPage().screenshot({ 
        path: `./reports/screenshots/logout-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (screenshotError) {
      logger.error('Could not take screenshot', screenshotError);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

testLogout();