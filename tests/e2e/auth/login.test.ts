import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DashboardPage } from '../../../src/modules/auth/pages/DashboardPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testLogin() {
  const browser = new BrowserManager();
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Login Test');
    logger.info('='.repeat(60));

    // Inicializar browser
    await browser.initialize();
    
    // Crear instancia de LoginPage
    const loginPage = new LoginPage(browser.getPage());

    // ========================================
    // TEST 1: Login con credenciales válidas
    // ========================================
    logger.info('\n📝 TEST 1: Login with valid credentials');
    
    // Obtener usuario de test
    const user = getTestUser('regular');
    
    logger.info(`Using credentials: ${user.username}`);
    
    // Realizar login
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    // Verificar éxito
    const isSuccess = await loginPage.isLoginSuccessful();
    
    if (isSuccess) {
      logger.info('✅ TEST 1 PASSED: Login successful');
      await loginPage.takeScreenshot('login-success');
    } else {
      logger.error('❌ TEST 1 FAILED: Login unsuccessful');
      await loginPage.takeScreenshot('login-failure');
    }

    // Esperar para ver el resultado
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ Login Test Completed');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed with error', error);
    
    // Tomar screenshot del error
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

testLogin();