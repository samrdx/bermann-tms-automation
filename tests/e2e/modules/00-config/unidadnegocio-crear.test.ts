import { test, expect } from '../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../src/config/credentials.js';
import { logger } from '../../../../src/utils/logger.js';
import { UnidadNegocio, UnidadNegocioHelper } from '../../../api-helpers/UnidadNegocioHelper.js';
import { DataPathHelper } from '../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

test.describe('[CONFIG01] - Unidad de Negocio', () => {
  test.setTimeout(120000); // Increased timeout for UI interactions and setup

  test('Crear Unidad de Negocio', async ({
    page,
    loginPage,
  }, testInfo) => {
    const startTime = Date.now();
    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuración');
    await allure.story('Unidad de Negocio');

    logger.info('='.repeat(60));
    logger.info('🚀 Iniciando test: Creación Atómica de Unidad de Negocio');
    logger.info('='.repeat(60));

    const user = getTestUser('regular');
    let createdUnidadNegocio: UnidadNegocio;

    try {
      await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await loginPage.isLoginSuccessful()).toBe(true);
        logger.info('✅ Login exitoso');
      });

      await test.step('Phase 2: Crear Unidad de Negocio via UI', async () => {
        logger.info('📝 PHASE 2: Creando Unidad de Negocio via UI...');
        createdUnidadNegocio = await UnidadNegocioHelper.createUnidadNegocioViaUI(page);
        expect(createdUnidadNegocio).toHaveProperty('id');
        expect(createdUnidadNegocio.id).not.toBe('0');
        expect(createdUnidadNegocio).toHaveProperty('nombre');
        logger.info(`✅ Unidad de Negocio creada: ${createdUnidadNegocio.nombre} (ID: ${createdUnidadNegocio.id})`);
      });

      await test.step('Phase 3: Guardar datos para tests subsiguientes', async () => {
        logger.info('💾 PHASE 3: Guardando ID y nombre de Unidad de Negocio...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        let operationalData = {};
        if (fs.existsSync(dataPath)) {
          operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        }

        operationalData = {
          ...operationalData,
          unidadNegocio: {
            id: createdUnidadNegocio.id,
            nombre: createdUnidadNegocio.nombre,
            baseNombre: createdUnidadNegocio.baseNombre,
          },
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ Datos de Unidad de Negocio guardados en ${dataPath}`);
      });

      logger.info('='.repeat(60));
      logger.info(`📊 TEST COMPLETO: Creación Atómica de Unidad de Negocio PASSED. Duración: ${(Date.now() - startTime) / 1000}s`);
      logger.info('='.repeat(60));

    } catch (error) {
      logger.error('❌ El test falló', error);
      await page.screenshot({ path: `./reports/screenshots/ERROR-UnidadNegocioCrear-${Date.now()}.png`, fullPage: true });
      throw error;
    }
  });
});
