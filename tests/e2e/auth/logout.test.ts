import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Auth - Logout', () => {

  test('Should logout successfully', async ({
    page,
    loginPage,
    dashboardPage
  }) => {
    
    // Test data
    const user = getTestUser('regular');

    await test.step('Fase 1: Login', async () => {
        logger.info('🔐 FASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await dashboardPage.isOnDashboard()).toBe(true);
        logger.info('✅ Login exitoso');
        await page.screenshot({ path: './reports/screenshots/logout-01-login.png' });
    });

    await test.step('Fase 2: Logout', async () => {
        logger.info('🚪 FASE 2: Logout');
        await dashboardPage.logout();
        logger.info('✅ Acción de Logout completada');
        await page.screenshot({ path: './reports/screenshots/logout-02-after-logout.png' });
    });

    await test.step('Fase 3: Verificar', async () => {
        logger.info('✅ FASE 3: Verificación');
        await page.waitForTimeout(2000);
        
        const isOnLoginPage = await loginPage.isOnLoginPage();
        expect(isOnLoginPage).toBe(true);
        
        logger.info('✅ Redirigido exitosamente a la página de login');
        await page.screenshot({ path: './reports/screenshots/logout-03-verification.png' });
    });
  });
});