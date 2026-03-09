import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Auth - Full Flow', () => {

  test('Should complete full login-logout flow', async ({
    loginPage,
    dashboardPage
  }) => {
    const user = getTestUser('regular');

    await test.step('Phase 1: Login', async () => {
      logger.info('🔐 FASE 1: Login');
      await loginPage.loginAndWaitForDashboard(user.username, user.password);

      const isSuccess = await loginPage.isLoginSuccessful();
      expect(isSuccess).toBe(true);
      logger.info('✅ Login exitoso');
    });

    await test.step('Phase 2: Navigate Dashboard', async () => {
      logger.info('🧭 FASE 2: Navegar al Dashboard');

      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBe(true);

      logger.info('✅ Dashboard verificado');
    });

    await test.step('Fase 3: Cierre de Sesión', async () => {
      logger.info('🚪 FASE 3: Logout');
      await dashboardPage.logout();  // Now with proper navigation wait from Fix 2
      logger.info('✅ Acción de Logout completada');
    });

    await test.step('Fase 4: Verificación', async () => {
      logger.info('✅ FASE 4: Verificación Final');

      const isOnLoginPage = await loginPage.isOnLoginPage();
      expect(isOnLoginPage).toBe(true);

      logger.info('✅ Flujo completo finalizado: Login → Dashboard → Logout');
    });
  });
});
