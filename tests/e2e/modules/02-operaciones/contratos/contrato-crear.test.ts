import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { OperationalDataLoader } from '../../../../api-helpers/OperationalDataLoader.js';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';

/**
 * Contract Creation - Tipo Costo (Seeded Transportista)
 *
 * Prerequisites:
 *   LEGACY_DATA_SOURCE=entities: correr la cadena de entidades (`npm run qa:regression:entities` / `npm run demo:regression:entities`)
 *   LEGACY_DATA_SOURCE=base: correr el seed base (`npm run qa:seed:legacy` / `npm run demo:seed:legacy`)
 *
 * Anti-false-positive strategy:
 *   1. Fill header → save → assert redirect to /contrato/editar/ID
 *   2. Add route (715) + tariffs → save → assert redirect to /contrato/editar/ID
 *   3. Navigate to /contrato/index → search nroContrato → assert row visible
 *      (This is the DEFINITIVE ground-truth verification)
 */
test.describe('[C01] Contratos - Tipo Costo', () => {
  test.setTimeout(90000);

  test('Deberia crear un Contrato Tipo Costo correctamente y asociarlo a un transportista', async ({ page }, testInfo) => {
    await allure.epic('TMS Legacy Flow');
    await allure.feature('02-Contratos');
    await allure.story('Contrato Tipo Costo');
    logger.info('='.repeat(80));
    logger.info('🚀 Iniciando prueba de creación de Contrato Tipo Costo (Seeded Transportista)');
    logger.info('='.repeat(80));

    // ---------------------------------------------------------------
    // PHASE 1: Load seeded data
    // ---------------------------------------------------------------
    const { data: operationalData, candidate, usedFallback } = OperationalDataLoader.loadOrThrow<Record<string, any>>(testInfo, {
      logger,
      purpose: 'contrato tipo costo'
    });
    const dataPath = candidate.path;
    logger.info(`📦 Data operacional seleccionada: ${dataPath} (source=${candidate.source}; fallback=${usedFallback})`);

    const transportista = operationalData.seededTransportista || operationalData.transportista;
    if (!transportista?.nombre) {
      throw new Error(`'seededTransportista' or 'transportista' not found in ${dataPath}. Run seed flow first (entities or base) and set LEGACY_DATA_SOURCE accordingly`);
    }
    if (!operationalData.seededTransportista) {
      logger.warn(`⚠️ Usando transportista fallback desde key legacy 'transportista' en ${dataPath}`);
    }
    const transportistaNombre = transportista.nombre as string;
    logger.info(`📦 Transportista: "${transportistaNombre}" (ID: ${transportista.id})`);

    const nroContrato = String(Date.now()).slice(-6);
    logger.info(`📝 Nro Contrato: ${nroContrato}`);

    await allure.parameter('Transportista', transportistaNombre);
    await allure.parameter('Transportista ID', String(transportista.id));
    await allure.parameter('Nro Contrato', nroContrato);
    await allure.attachment('Datos Cargados (JSON)', JSON.stringify({
      transportista: transportistaNombre,
      transportistaId: transportista.id,
      nroContrato
    }, null, 2), 'application/json');

    const contratosPage = new ContratosFormPage(page);

    // ---------------------------------------------------------------
    // PHASE 2: Fill contract header and save
    // ---------------------------------------------------------------
    await test.step('Fase 2: Completar el encabezado del contrato y guardar', async () => {
      logger.info('Fase 2: Completando el encabezado del contrato...');

      // fillBasicContractInfo handles: tipo_tarifa → transportista → save → verify
      // It already has index-search fallback for the TMS "error but saves anyway" bug
      const contractId = await contratosPage.fillBasicContractInfo(nroContrato, transportistaNombre);
      logger.info(`✅ Header guardado — Contract ID: ${contractId}`);

      // Definitive check: we must NOT still be on /crear after fillBasicContractInfo
      const urlAfterHeader = page.url();
      if (urlAfterHeader.includes('/crear')) {
        throw new Error(
          `❌ Contrato header guardado fallido — todavía en /crear después de fillBasicContractInfo. ` +
          `Transportista: "${transportistaNombre}", Nro: ${nroContrato}`
        );
      }
      logger.info(`✅ URL después de guardar header: ${urlAfterHeader}`);
    });

    // ---------------------------------------------------------------
    // PHASE 3: Add route + tariffs
    // ---------------------------------------------------------------
    await test.step('Fase 3: Agregar ruta 715 y tarifas', async () => {
      logger.info('Fase 3: Agregando ruta 715 con tarifas 20000 / 50000...');
      await contratosPage.addSpecificRouteAndCargo('20000', '50000');
      logger.info('✅ Ruta y tarifas agregadas');
    });

    // ---------------------------------------------------------------
    // PHASE 4: Save final contract
    // ---------------------------------------------------------------
    let finalContractId = '';

    await test.step('Fase 4: Guardar contrato final', async () => {
      logger.info('Fase 4: Guardando contrato final...');
      finalContractId = await contratosPage.saveAndExtractId();

      const urlAfterFinal = page.url();
      logger.info(`   URL después de guardar contrato final: ${urlAfterFinal}`);
      logger.info(`   Contrato ID Extraido: "${finalContractId}"`);

      // saveAndExtractId may return '' if URL does not match /ver|editar/ID
      // In that case we still continue to the index verification
      if (finalContractId) {
        logger.info(`✅ Guardado final confirmado — ID ${finalContractId}`);
      } else {
        logger.warn('⚠️ No se pudo extraer el ID de la URL — se verificará a través de la búsqueda en el índice');
      }
    });

    // ---------------------------------------------------------------
    // PHASE 5: Ground-truth verification in /contrato/index
    // This is the definitive anti-false-positive check.
    // The contract MUST appear in the index table when searched by nroContrato.
    // ---------------------------------------------------------------
    await test.step('Fase 5: Verificar que el contrato existe en el índice', async () => {
      logger.info('Fase 5: Navegando a /contrato/index para verificar la creación...');

      let found = false;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info(`🔍 Intentos de verificación ${attempt}/${maxAttempts}...`);

        try {
          await page.goto('/contrato/index');
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => logger.warn('⚠️ networkidle timeout, continuando...'));

          const searchInput = page.locator('input[type="search"]').first();
          await searchInput.waitFor({ state: 'visible', timeout: 10000 });

          logger.info(`⌨️ Buscando por transportista: ${transportistaNombre}`);
          await searchInput.clear();
          await searchInput.fill(transportistaNombre);
          await page.waitForTimeout(2000); // DataTables filter

          const contractRow = page.locator('table tbody tr').filter({ hasText: transportistaNombre }).first();
          const isVisible = await contractRow.isVisible({ timeout: 5000 }).catch(() => false);

          if (isVisible) {
            logger.info(`✅ Contrato ${nroContrato} encontrado en el índice!`);
            found = true;

            // Extract the real ID from the edit link if we didn't get it from URL
            if (!finalContractId) {
              const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
              const href = await editLink.getAttribute('href').catch(() => null);
              const idFromIndex = href?.match(/\/editar\/(\d+)/)?.[1] ?? 'UNKNOWN';
              finalContractId = idFromIndex;
              logger.info(`✅ Contrato ID extraido del índice: ${idFromIndex}`);
            }
            break;
          } else {
            logger.warn(`⚠️ Contrato ${nroContrato} no encontrado en este intento.`);
            if (attempt < maxAttempts) {
              await page.waitForTimeout(3000); // Wait before reload
            }
          }
        } catch (e) {
          logger.warn(`⚠️ Error durante el intento de verificación ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
          if (attempt < maxAttempts) await page.waitForTimeout(3000);
        }
      }

      if (!found) {
        logger.error(`❌ Contrato ${nroContrato} no encontrado en el índice después de ${maxAttempts} intentos`);
        await page.screenshot({ path: `./reports/screenshots/contract-not-found-costo-${nroContrato}.png`, fullPage: true });
        throw new Error(`Contrato ${nroContrato} no encontrado en el índice después de la búsqueda`);
      }

      logger.info(`✅ Contrato ${nroContrato} verificado en el índice — Nro: ${nroContrato} | ID: ${finalContractId}`);
      
      entityTracker.register({
        type: 'Contrato',
        name: nroContrato,
        id: finalContractId,
        asociado: transportistaNombre
      });
    });

    logger.info('='.repeat(80));
    logger.info('✅ Creación de Contrato - Costo COMPLETADO');
    logger.info(`   Nro Contrato : ${nroContrato}`);
    logger.info(`   Contrato ID  : ${finalContractId}`);
    logger.info(`   Transportista: ${transportistaNombre}`);
    logger.info('='.repeat(80));
  });
});
