import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { NamingHelper } from '../../../../../src/utils/NamingHelper.js';
import { allure } from 'allure-playwright';

test.describe('[CONFIG05] - Ruta', () => {
  test.setTimeout(120000);

  test('Crear Ruta con origen/destino en rango 1_ a 467_', async ({
    page,
    rutaPage,
  }) => {
    const startTime = Date.now();
    const isDemo = process.env.ENV?.toUpperCase() === 'DEMO';
    const envLabel = isDemo ? 'DEMO' : 'QA';
    const expectedPrefix = isDemo ? 'Demo_RT_' : 'Qa_RT_';
    const rutaData = NamingHelper.getRutaData();

    let originSelected = '';
    let destinationSelected = '';

    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuracion');
    await allure.story('Rutas');
    await allure.parameter('Ambiente', envLabel);
    await allure.parameter('Nombre Ruta', rutaData.nombreRuta);
    await allure.parameter('Nro Ruta', rutaData.nroRuta);

    logger.info('='.repeat(60));
    logger.info(`🚚 Iniciando test: Creacion de Ruta [ENV: ${envLabel}]`);
    logger.info('='.repeat(60));

    try {
      await test.step('Phase 1: Navegar a /ruta/crear', async () => {
        logger.info('🚚 PHASE 1: Navegacion a creacion de Ruta');
        await rutaPage.navigateToCreate();
        logger.info('✅ Navegacion completada');
      });

      await test.step('Phase 2: Crear Ruta con zonas aleatorias en rango 1_..467_', async () => {
        logger.info('📍 ZONAS: seleccion aleatoria en rango 1_..467_');
        expect(rutaData.nombreRuta.startsWith(expectedPrefix)).toBeTruthy();

        const creationResult = await rutaPage.crearRuta({
          nombreRuta: rutaData.nombreRuta,
          nroRuta: rutaData.nroRuta,
        });

        originSelected = creationResult.origen;
        destinationSelected = creationResult.destino;

        await allure.parameter('Origen', originSelected);
        await allure.parameter('Destino', destinationSelected);
        logger.info(`📍 Origen seleccionado: ${originSelected}`);
        logger.info(`📍 Destino seleccionado: ${destinationSelected}`);

        logger.info('✅ Ruta creada y formulario guardado');
      });

      await test.step('Phase 3: Verificar guardado', async () => {
        const isSaved = await rutaPage.isFormSaved();
        expect(isSaved).toBeTruthy();
        logger.info('✅ Verificacion de guardado correcta');
      });

      await test.step('Phase 4: Buscar en indice y verificar ruta creada', async () => {
        logger.info('📍 PHASE 4: Busqueda en /ruta/index usando #search y #buscar');
        await rutaPage.navigateToIndex();
        await rutaPage.searchRuta(rutaData.nombreRuta);

        const existsInResults = await rutaPage.isRutaInSearchResults(
          rutaData.nombreRuta,
          rutaData.nroRuta
        );
        expect(existsInResults).toBeTruthy();
        logger.info('✅ Ruta encontrada en resultados de busqueda');
      });

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      const summary = {
        ambiente: envLabel,
        expectedPrefix,
        ruta: rutaData.nombreRuta,
        nroRuta: rutaData.nroRuta,
        origen: originSelected,
        destino: destinationSelected,
        verificadaEnBusqueda: true,
        durationSeconds,
      };

      await allure.parameter('Duracion (s)', durationSeconds);
      await allure.attachment('Ruta - Resumen Final', JSON.stringify(summary, null, 2), 'application/json');

      logger.info('='.repeat(60));
      logger.info(`📊 RESUMEN FINAL [${envLabel}]`);
      logger.info(`✅ Ruta: ${rutaData.nombreRuta}`);
      logger.info(`✅ Nro Ruta: ${rutaData.nroRuta}`);
      logger.info(`📍 Origen: ${originSelected}`);
      logger.info(`📍 Destino: ${destinationSelected}`);
      logger.info(`✅ Duracion: ${durationSeconds}s`);
      logger.info('='.repeat(60));
    } catch (error) {
      logger.error('❌ El test de Ruta fallo', error);
      await page.screenshot({ path: `./reports/screenshots/ERROR-RutaCrear-${Date.now()}.png`, fullPage: true });
      throw error;
    }
  });
});
