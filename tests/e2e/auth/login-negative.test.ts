import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { logger } from '../../../src/utils/logger.js';

test('Should reject invalid credentials', async ({ page }) => {
    logger.info('='.repeat(60));
    logger.info('🚀 Iniciando Test Negativo de Login');
    logger.info('='.repeat(60));

    // PHASE 0: Setup
    const loginPage = new LoginPage(page);

    // PHASE 1: Navigate
    logger.info('\n🧭 FASE 1: Navegar al Login');
    await loginPage.navigate();
    logger.info('✅ On login page');
    
    // PHASE 2: Test Invalid Credentials
    logger.info('\n❌ FASE 2: Intentar Login con Credenciales Inválidas');
    
    await loginPage.fillUsername('invalid_user');
    await loginPage.fillPassword('wrong_password');
    
    await loginPage.clickLoginButton();
    await page.waitForTimeout(2000);
    
    logger.info('✅ Login button clicked with invalid credentials');

    // PHASE 3: Verify Error Message
    logger.info('\n✅ FASE 3: Verificar Manejo de Errores');
    
    const hasError = await loginPage.hasErrorMessage();
    if (!hasError) {
      logger.warn('⚠️ No explicit error message found (checking URL)');
    } else {
      logger.info('✅ Error message displayed correctly');
    }
    
    // Verify still on login page (not redirected)
    const stillOnLogin = await loginPage.isOnLoginPage();
    expect(stillOnLogin).toBeTruthy();
    
    logger.info('✅ Correctly stayed on login page');
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ LOGIN NEGATIVE TEST PASSED');
    logger.info('='.repeat(60));
});