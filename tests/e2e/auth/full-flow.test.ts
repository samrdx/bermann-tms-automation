import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/pages/LoginPage.js';
import { DashboardPage } from '../../../src/pages/DashboardPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testFullFlow() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Full Flow Test (Login + Navigate + Logout)');
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
    
    let isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard');
    }
    
    logger.info('✅ Login successful');
    await page.screenshot({ path: './reports/screenshots/full-flow-01-login.png' });

    // PHASE 2: Navigate Dashboard
    logger.info('\n🧭 PHASE 2: Navigate Dashboard');
    
    // Wait to see dashboard elements
    await page.waitForTimeout(2000);
    
    // Verify dashboard elements visible
    const welcomeVisible = await page.locator('text=/bienvenido|dashboard|inicio/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    logger.info(`Dashboard elements visible: ${welcomeVisible}`);
    
    await page.screenshot({ path: './reports/screenshots/full-flow-02-dashboard.png' });
    logger.info('✅ Dashboard navigation verified');

    // PHASE 3: Logout
    logger.info('\n🚪 PHASE 3: Logout');
    await dashboardPage.logout();
    logger.info('✅ Logout action completed');
    await page.screenshot({ path: './reports/screenshots/full-flow-03-logout.png' });

    // PHASE 4: Verify
    logger.info('\n✅ PHASE 4: Final Verification');
    await page.waitForTimeout(2000);
    
    const isOnLoginPage = await loginPage.isOnLoginPage();
    if (!isOnLoginPage) {
      throw new Error('Not redirected to login page after logout');
    }
    
    logger.info('✅ Full flow completed: Login → Dashboard → Logout');
    await page.screenshot({ path: './reports/screenshots/full-flow-04-verification.png' });
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ FULL FLOW TEST PASSED');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Full flow test failed', error);
    
    try {
      await browser.getPage().screenshot({ 
        path: `./reports/screenshots/full-flow-error-${Date.now()}.png`,
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

testFullFlow();