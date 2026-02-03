import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';
import { generateValidChileanRUT } from '../../../../../src/utils/rutGenerator.js';

test.describe('Transport - Conductor Creation', () => {

  test('Should create a new Conductor successfully', async ({
    page,
    loginPage,
    dashboardPage,
    conductorPage,
  }) => {

    // Test data
    const user = getTestUser('regular');
    const testData = {
      rut: generateValidChileanRUT(),
      nombre: `Conductor Test ${Date.now()}`,
      email: `conductor.${Date.now()}@test.com`,
      telefono: '912345678',
      region: 'Metropolitana', // Adjust based on actual dropdown options
      comuna: 'Santiago', // Adjust based on actual dropdown options
      direccion: 'Calle Falsa 123'
    };

    await test.step('Phase 1: Login', async () => {
      logger.info('🔐 PHASE 1: Login');
      await loginPage.loginAndWaitForDashboard(user.username, user.password);
      expect(await dashboardPage.isOnDashboard()).toBe(true);
      logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate', async () => {
      logger.info('Compass PHASE 2: Navigate to Create Conductor');
      await conductorPage.navigate();
      logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Fill Form', async () => {
      logger.info('📝 PHASE 3: Fill Conductor Form');
      await conductorPage.fillUsuario(testData.rut);
      await conductorPage.fillClave(testData.rut.slice(-4));
      await conductorPage.fillNombre(testData.nombre);
      await conductorPage.fillApellido('TestApellido');
      await conductorPage.fillDocumento(testData.rut);
      await conductorPage.fillTelefono(testData.telefono);
      await conductorPage.fillEmail(testData.email);
      await conductorPage.selectLicencia('A5');
      logger.info('✅ Form filled');
    });

    await test.step('Phase 4: Save', async () => {
      logger.info('💾 PHASE 4: Save Conductor');
      await conductorPage.clickGuardar();
      await page.waitForTimeout(2000);
      logger.info('✅ Conductor saved');
    });

    await test.step('Phase 5: Verify', async () => {
      logger.info('✅ PHASE 5: Verification');
      const isSaved = await conductorPage.isFormSaved();
      expect(isSaved).toBeTruthy();
      logger.info('✅ Test PASSED');
    });
  });
});
