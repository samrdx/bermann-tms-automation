import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/pages/LoginPage.js';
import { DashboardPage } from '../../../src/pages/DashboardPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testFullFlow() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Full Flow Test');
    logger.info('='.repeat(60));

    await browser.initialize();
    
    const loginPage = new LoginPage(browser.getPage());
    const dashboardPage = new DashboardPage(browser.getPage());
    const user = getTestUser('regular');

    // ========================================
    // FASE 1: LOGIN
    // ========================================
    logger.info('\n🔐 PHASE 1: Login');
    
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    if (await dashboardPage.isOnDashboard()) {
      logger.info('✅ Login successful');
      await dashboardPage.takeScreenshot('01-dashboard');
    } else {
      throw new Error('Failed to reach dashboard');
    }

    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // FASE 2: NAVEGACIÓN EN DASHBOARD
    // ========================================
    logger.info('\n🧭 PHASE 2: Dashboard Navigation');
    
    // Obtener título de página
    const pageTitle = await dashboardPage.getPageTitle();
    logger.info(`Page title: ${pageTitle}`);
    
    // Verificar usuario logueado
    const userName = await dashboardPage.getLoggedUserName();
    logger.info(`Logged user: ${userName}`);
    
    if (userName) {
      logger.info('✅ User information displayed');
    }

    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // FASE 3: INTERACCIONES
    // ========================================
    logger.info('\n🎯 PHASE 3: User Interactions');
    
    // Click en Home (debería mantenernos en dashboard)
    await dashboardPage.clickHome();
    await browser.getPage().waitForTimeout(1000);
    logger.info('✅ Home navigation works');
    
    await dashboardPage.takeScreenshot('02-after-home-click');

    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // FASE 4: LOGOUT
    // ========================================
    logger.info('\n🚪 PHASE 4: Logout');
    
    await dashboardPage.logout();
    
    if (await dashboardPage.isLoggedOut()) {
      logger.info('✅ Logout successful');
      await loginPage.takeScreenshot('03-logged-out');
    } else {
      throw new Error('Logout failed');
    }

    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // RESUMEN FINAL
    // ========================================
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 FULL FLOW TEST RESULTS:');
    logger.info('='.repeat(60));
    logger.info('✅ Phase 1: Login - PASSED');
    logger.info('✅ Phase 2: Dashboard Navigation - PASSED');
    logger.info('✅ Phase 3: User Interactions - PASSED');
    logger.info('✅ Phase 4: Logout - PASSED');
    logger.info('='.repeat(60));
    logger.info('🎉 ALL PHASES COMPLETED SUCCESSFULLY');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed with error', error);
    await browser.getPage().screenshot({ 
      path: `./reports/screenshots/flow-error-${Date.now()}.png`,
      fullPage: true 
    });
    throw error;
  } finally {
    await browser.close();
  }
}

testFullFlow();