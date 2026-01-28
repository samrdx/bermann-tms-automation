import { BrowserManager } from '../src/core/BrowserManager.js';
import { LoginPage } from '../src/pages/LoginPage.js';
import { logger } from '../src/utils/logger.js';

async function testLoginNegative() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Negative Login Tests');
    logger.info('='.repeat(60));

    await browser.initialize();
    const loginPage = new LoginPage(browser.getPage());

    // ========================================
    // TEST 1: Usuario incorrecto
    // ========================================
    logger.info('\n❌ TEST 1: Invalid Username');
    
    await loginPage.login('usuario_invalido_xyz', 'password123');
    await browser.getPage().waitForTimeout(2000);
    
    const hasError1 = await loginPage.hasErrorMessage();
    const errorMsg1 = await loginPage.getErrorMessage();
    
    if (hasError1) {
      logger.info('✅ TEST 1 PASSED: Error message displayed');
      logger.info(`Error message: ${errorMsg1}`);
    } else {
      logger.warn('⚠️  TEST 1 WARNING: No error message found');
    }
    
    await loginPage.takeScreenshot('01-invalid-username');
    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // TEST 2: Contraseña incorrecta
    // ========================================
    logger.info('\n❌ TEST 2: Invalid Password');
    
    await loginPage.clearFields();
    await loginPage.login('arivas', 'password_incorrecto_xyz');
    await browser.getPage().waitForTimeout(2000);
    
    const hasError2 = await loginPage.hasErrorMessage();
    const errorMsg2 = await loginPage.getErrorMessage();
    
    if (hasError2) {
      logger.info('✅ TEST 2 PASSED: Error message displayed');
      logger.info(`Error message: ${errorMsg2}`);
    } else {
      logger.warn('⚠️  TEST 2 WARNING: No error message found');
    }
    
    await loginPage.takeScreenshot('02-invalid-password');
    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // TEST 3: Campos vacíos
    // ========================================
    logger.info('\n❌ TEST 3: Empty Fields');
    
    await loginPage.clearFields();
    await loginPage.clickLoginButton();
    await browser.getPage().waitForTimeout(2000);
    
    const hasInvalidFields = await loginPage.hasInvalidFields();
    
    if (hasInvalidFields) {
      logger.info('✅ TEST 3 PASSED: Invalid field markers displayed');
    } else {
      logger.warn('⚠️  TEST 3 WARNING: No invalid field markers found');
    }
    
    await loginPage.takeScreenshot('03-empty-fields');
    await browser.getPage().waitForTimeout(2000);

    // ========================================
    // RESUMEN
    // ========================================
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 NEGATIVE LOGIN TESTS COMPLETED');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed with error', error);
    await browser.getPage().screenshot({ 
      path: `./reports/screenshots/negative-error-${Date.now()}.png`,
      fullPage: true 
    });
    throw error;
  } finally {
    await browser.close();
  }
}

testLoginNegative();