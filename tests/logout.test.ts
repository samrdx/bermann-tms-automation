import { BrowserManager } from '../src/core/BrowserManager.js';
import { LoginPage } from '../src/pages/LoginPage.js';
import { DashboardPage } from '../src/pages/DashboardPage.js';
import { getTestUser } from '../src/config/credentials.js';
import { logger } from '../src/utils/logger.js';

async function testLogout() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Logout Test');
    logger.info('='.repeat(60));

    await browser.initialize();
    
    const loginPage = new LoginPage(browser.getPage());
    const dashboardPage = new DashboardPage(browser.getPage());

    // ========================================
    // PASO 1: Login
    // ========================================
    logger.info('\n📝 STEP 1: Login to TMS');
    
    const user = getTestUser('regular');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    const isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard after login');
    }
    
    logger.info('✅ STEP 1 PASSED: Successfully logged in');
    await dashboardPage.takeScreenshot('01-logged-in');

    // Esperar un momento
    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // PASO 2: Verificar usuario logueado
    // ========================================
    logger.info('\n📝 STEP 2: Verify logged user');
    
    const userName = await dashboardPage.getLoggedUserName();
    logger.info(`Logged user: ${userName}`);
    
    if (userName) {
      logger.info('✅ STEP 2 PASSED: User name displayed');
    } else {
      logger.warn('⚠️  STEP 2 WARNING: Could not get user name');
    }

    // ========================================
    // PASO 3: Logout
    // ========================================
    logger.info('\n📝 STEP 3: Logout');
    
    await dashboardPage.logout();
    
    const isLoggedOut = await dashboardPage.isLoggedOut();
    
    if (isLoggedOut) {
      logger.info('✅ STEP 3 PASSED: Logout successful');
      await loginPage.takeScreenshot('02-logged-out');
    } else {
      logger.error('❌ STEP 3 FAILED: Logout unsuccessful');
      await dashboardPage.takeScreenshot('logout-failure');
      throw new Error('Logout failed - still on dashboard');
    }

    // Esperar para ver resultado
    await browser.getPage().waitForTimeout(2000);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ Logout Test Completed Successfully');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed with error', error);
    
    const page = browser.getPage();
    await page.screenshot({ 
      path: `./reports/screenshots/test-error-${Date.now()}.png`,
      fullPage: true 
    });
    
    throw error;
  } finally {
    await browser.close();
  }
}

testLogout();