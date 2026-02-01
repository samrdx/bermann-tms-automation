import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/pages/LoginPage.js';
import { logger } from '../../../src/utils/logger.js';

async function testLoginNegative() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Login Negative Test');
    logger.info('='.repeat(60));

    // PHASE 0: Setup
    await browser.initialize();
    const page = browser.getPage();
    const loginPage = new LoginPage(page);

    // PHASE 1: Navigate
    logger.info('\n🧭 PHASE 1: Navigate to Login');
    await loginPage.navigate();
    logger.info('✅ On login page');
    await page.screenshot({ path: './reports/screenshots/login-negative-01-navigate.png' });

    // PHASE 2: Test Invalid Credentials
    logger.info('\n❌ PHASE 2: Attempt Login with Invalid Credentials');
    
    await loginPage.fillUsername('invalid_user');
    await loginPage.fillPassword('wrong_password');
    await page.screenshot({ path: './reports/screenshots/login-negative-02-filled.png' });
    
    await loginPage.clickLoginButton();
    await page.waitForTimeout(2000);
    
    logger.info('✅ Login button clicked with invalid credentials');
    await page.screenshot({ path: './reports/screenshots/login-negative-03-after-submit.png' });

    // PHASE 3: Verify Error Message
    logger.info('\n✅ PHASE 3: Verify Error Handling');
    
    const hasError = await loginPage.hasErrorMessage();
    if (!hasError) {
      logger.warn('⚠️ No explicit error message found (checking URL)');
    } else {
      logger.info('✅ Error message displayed correctly');
    }
    
    // Verify still on login page (not redirected)
    const stillOnLogin = await loginPage.isOnLoginPage();
    if (!stillOnLogin) {
      throw new Error('Unexpectedly redirected despite invalid credentials');
    }
    
    logger.info('✅ Correctly stayed on login page');
    await page.screenshot({ path: './reports/screenshots/login-negative-04-verification.png' });
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ LOGIN NEGATIVE TEST PASSED');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Login negative test failed', error);
    
    try {
      await browser.getPage().screenshot({ 
        path: `./reports/screenshots/login-negative-error-${Date.now()}.png`,
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

testLoginNegative();