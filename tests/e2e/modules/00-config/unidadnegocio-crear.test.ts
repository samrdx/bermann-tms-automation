import { test, expect } from '../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../src/config/credentials.js';
import { logger } from '../../../../src/utils/logger.js';
import { UnidadNegocioHelper } from '../../../api-helpers/UnidadNegocioHelper.js';
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
    const isDemo = process.env.ENV?.toUpperCase() === 'DEMO';
    const envLabel = isDemo ? 'DEMO' : 'QA';
    const expectedPrefix = isDemo ? 'Demo_' : 'Qa_';

    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuracion');
    await allure.story('Unidad de Negocio');
    await allure.parameter('Ambiente', envLabel);

    logger.info('='.repeat(60));
    logger.info(`\u{1F680} Iniciando test: Creacion Atomica de Unidad de Negocio [ENV: ${envLabel}]`);
    logger.info('='.repeat(60));

    const user = getTestUser('regular');
    let dataPathUsed = '';

    try {
      await test.step('Phase 1: Login', async () => {
        logger.info('\u{1F510} PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await loginPage.isLoginSuccessful()).toBe(true);
        logger.info('\u2705 Login exitoso');
      });

      const createdUnidadNegocio = await test.step('Phase 2: Crear Unidad de Negocio via UI', async () => {
        logger.info('\u{1F4DD} PHASE 2: Creando Unidad de Negocio via UI...');
        const created = await UnidadNegocioHelper.createUnidadNegocioViaUI(page);

        expect(created).toHaveProperty('id');
        expect(created.id).not.toBe('0');
        expect(created).toHaveProperty('nombre');
        expect(created.nombre.startsWith(expectedPrefix)).toBeTruthy();

        await allure.parameter('UnidadNegocio', created.nombre);
        await allure.parameter('UnidadNegocioID', created.id);
        await allure.parameter('UnidadNegocioPrefix', expectedPrefix);

        logger.info(`\u2705 Unidad de Negocio creada: ${created.nombre} (ID: ${created.id})`);
        return created;
      });

      await test.step('Phase 3: Guardar datos para tests subsiguientes', async () => {
        logger.info('\u{1F4BE} PHASE 3: Guardando ID y nombre de Unidad de Negocio...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        dataPathUsed = dataPath;

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
        logger.info(`\u2705 Datos de Unidad de Negocio guardados en ${dataPath}`);
      });

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      await allure.parameter('Duracion (s)', durationSeconds);
      await allure.attachment('Unidad de Negocio - Resumen', JSON.stringify({
        ambiente: envLabel,
        prefijoEsperado: expectedPrefix,
        unidadNegocio: createdUnidadNegocio.nombre,
        unidadNegocioId: createdUnidadNegocio.id,
        workerDataPath: dataPathUsed,
        durationSeconds,
      }, null, 2), 'application/json');

      logger.info('='.repeat(60));
      logger.info(`\u{1F4CA} TEST COMPLETO: Creacion Atomica de Unidad de Negocio PASSED. Duracion: ${durationSeconds}s`);
      logger.info('\u{1F4CB} RESUMEN DE ENTIDAD CREADA');
      logger.info(`\u{1F30D} Ambiente: ${envLabel}`);
      logger.info(`\u{1F4DD} Prefijo esperado: ${expectedPrefix}`);
      logger.info(`\u{1F9F1} Unidad de Negocio: ${createdUnidadNegocio.nombre}`);
      logger.info(`\u{1F194} ID: ${createdUnidadNegocio.id}`);
      logger.info(`\u{1F4BE} Data file: ${dataPathUsed}`);
      logger.info('='.repeat(60));

    } catch (error) {
      logger.error('\u274C El test fallo', error);
      await page.screenshot({ path: `./reports/screenshots/ERROR-UnidadNegocioCrear-${Date.now()}.png`, fullPage: true });
      throw error;
    }
  });
});
