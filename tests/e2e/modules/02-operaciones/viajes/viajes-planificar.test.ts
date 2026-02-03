import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';

test.describe('Viajes - Planificar (Create)', () => {

  test('Should planificar a new Viaje successfully', async ({
    page,
    loginPage,
    dashboardPage,
    viajesPlanificarPage
  }) => {

    // Test data
    const user = getTestUser('regular');
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`Generated Nro Viaje: ${nroViaje}`);

    await test.step('Phase 1: Login', async () => {
      logger.info('🔐 PHASE 1: Login');
      await loginPage.loginAndWaitForDashboard(user.username, user.password);
      expect(await dashboardPage.isOnDashboard()).toBe(true);
      logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate', async () => {
      logger.info('Compass PHASE 2: Navigate to Planificar Viajes');
      await viajesPlanificarPage.navigate();
      logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Fill Form', async () => {
      logger.info('📝 PHASE 3: Fill Complete Viaje Form');
      await viajesPlanificarPage.fillNroViaje(nroViaje);
      await viajesPlanificarPage.selectTipoOperacion('tclp2210');
      await viajesPlanificarPage.selectCliente('Clientedummy');
      await viajesPlanificarPage.selectTipoServicio('tclp2210');
      await viajesPlanificarPage.selectTipoViaje('1');
      await viajesPlanificarPage.selectUnidadNegocio('1');
      await viajesPlanificarPage.selectCodigoCarga('CONT-Bobinas-Sider14');

      // Modal interaction
      await viajesPlanificarPage.agregarRuta('05082025-1');

      await viajesPlanificarPage.selectOrigen('1_agunsa_lampa_RM');
      await viajesPlanificarPage.selectDestino('225_Starken_Sn Bernardo');

      logger.info('✅ Form filled completely');
    });

    await test.step('Phase 4: Save', async () => {
      logger.info('💾 PHASE 4: Save Viaje');
      await viajesPlanificarPage.clickGuardar();
      logger.info('✅ Save clicked');
    });

    await test.step('Phase 5: Verify', async () => {
      logger.info('✅ PHASE 5: Verification');
      const isSaved = await viajesPlanificarPage.isFormSaved();
      expect(isSaved).toBeTruthy();

      const foundInAsignar = await viajesPlanificarPage.verifyInAsignar(nroViaje);
      if (foundInAsignar) {
        logger.info(`✅ Viaje ${nroViaje} verified in /viajes/asignar`);
      } else {
        logger.warn(`⚠️ Viaje ${nroViaje} not found in /viajes/asignar`);
      }
      // We assert true here if strict verify is needed, or just log visual result
      expect(foundInAsignar).toBe(true);
    });
  });
});