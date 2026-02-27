import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * Contract Creation - Tipo Costo (Seeded Transportista)
 *
 * Prerequisites:
 *   npm run test:legacy:setup  →  seededTransportista in last-run-data-{browser}.json
 *
 * Anti-false-positive strategy:
 *   1. Fill header → save → assert redirect to /contrato/editar/ID
 *   2. Add route (715) + tariffs → save → assert redirect to /contrato/editar/ID
 *   3. Navigate to /contrato/index → search nroContrato → assert row visible
 *      (This is the DEFINITIVE ground-truth verification)
 */
test.describe('Contract Creation - Costo (Uses Seeded Transportista)', () => {
  test.setTimeout(90000);

  test('Create Contract (Costo) using Seeded Transportista', async ({ page }, testInfo) => {
    logger.info('='.repeat(80));
    logger.info('🚀 Starting Contract Creation - Tipo Costo (Seeded Transportista)');
    logger.info('='.repeat(80));

    // ---------------------------------------------------------------
    // PHASE 1: Load seeded data
    // ---------------------------------------------------------------
    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}. Run: npm run test:legacy:setup`);
    }
    const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const seededTransportista = operationalData.seededTransportista;
    if (!seededTransportista?.nombre) {
      throw new Error(`'seededTransportista' not found in ${dataPath}. Run: npm run test:legacy:setup`);
    }
    const transportistaNombre = seededTransportista.nombre as string;
    logger.info(`📦 Transportista: "${transportistaNombre}" (ID: ${seededTransportista.id})`);

    const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`📝 Nro Contrato: ${nroContrato}`);

    const contratosPage = new ContratosFormPage(page);

    // ---------------------------------------------------------------
    // PHASE 2: Fill contract header and save
    // ---------------------------------------------------------------
    await test.step('Phase 2: Fill header and save', async () => {
      logger.info('PHASE 2: Filling contract header...');

      // fillBasicContractInfo handles: tipo_tarifa → transportista → save → verify
      // It already has index-search fallback for the TMS "error but saves anyway" bug
      const contractId = await contratosPage.fillBasicContractInfo(nroContrato, transportistaNombre);
      logger.info(`✅ Header saved — Contract ID: ${contractId}`);

      // Definitive check: we must NOT still be on /crear after fillBasicContractInfo
      const urlAfterHeader = page.url();
      if (urlAfterHeader.includes('/crear')) {
        throw new Error(
          `❌ Contract header save FAILED — still on /crear after fillBasicContractInfo. ` +
          `Transportista: "${transportistaNombre}", Nro: ${nroContrato}`
        );
      }
      logger.info(`✅ URL after header save: ${urlAfterHeader}`);
    });

    // ---------------------------------------------------------------
    // PHASE 3: Add route + tariffs
    // ---------------------------------------------------------------
    await test.step('Phase 3: Add route 715 and tariffs', async () => {
      logger.info('PHASE 3: Adding route 715 with tariffs 20000 / 50000...');
      await contratosPage.addSpecificRouteAndCargo('20000', '50000');
      logger.info('✅ Route and tariffs added');
    });

    // ---------------------------------------------------------------
    // PHASE 4: Save final contract
    // ---------------------------------------------------------------
    let finalContractId = '';

    await test.step('Phase 4: Save final contract', async () => {
      logger.info('PHASE 4: Saving final contract...');
      finalContractId = await contratosPage.saveAndExtractId();

      const urlAfterFinal = page.url();
      logger.info(`   URL after final save: ${urlAfterFinal}`);
      logger.info(`   Extracted contract ID: "${finalContractId}"`);

      // saveAndExtractId may return '' if URL does not match /ver|editar/ID
      // In that case we still continue to the index verification
      if (finalContractId) {
        logger.info(`✅ Final save confirmed — ID ${finalContractId}`);
      } else {
        logger.warn('⚠️ Could not extract ID from URL — will verify via index search');
      }
    });

    // ---------------------------------------------------------------
    // PHASE 5: Ground-truth verification in /contrato/index
    // This is the definitive anti-false-positive check.
    // The contract MUST appear in the index table when searched by nroContrato.
    // ---------------------------------------------------------------
    await test.step('Phase 5: Verify contract exists in index (ground truth)', async () => {
      logger.info('PHASE 5: Navigating to /contrato/index to verify creation...');
      let navigated = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.goto('/contrato/index');
          navigated = true;
          break;
        } catch (e) {
          logger.warn(`⚠️ page.goto failed (attempt ${i + 1}/3): ${e instanceof Error ? e.message : String(e)}`);
          await page.waitForTimeout(2000);
        }
      }

      if (!navigated) {
        throw new Error('❌ Failed to navigate to /contrato/index after 3 attempts');
      }

      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
        logger.warn('⚠️ networkidle timeout in index page — continuing');
      });

      // Use DataTables search to filter by nroContrato
      const searchInput = page.locator('input[type="search"]').first();
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
      await searchInput.fill(nroContrato);
      await page.waitForTimeout(1500); // DataTables debounce

      // Find a table row containing nroContrato
      const contractRow = page.locator('table tbody tr').filter({ hasText: nroContrato }).first();

      await expect(contractRow, `Contract ${nroContrato} must be visible in /contrato/index`).toBeVisible({
        timeout: 10000,
      });

      // Extract the real ID from the edit link if we didn't get it from URL
      if (!finalContractId) {
        const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
        const href = await editLink.getAttribute('href').catch(() => null);
        const idFromIndex = href?.match(/\/editar\/(\d+)/)?.[1] ?? 'UNKNOWN';
        finalContractId = idFromIndex;
        logger.info(`✅ Contract ID from index: ${idFromIndex}`);
      }

      logger.info(`✅ CONTRACT VERIFIED IN INDEX — Nro: ${nroContrato} | ID: ${finalContractId}`);
    });

    logger.info('='.repeat(80));
    logger.info('✅ Contract Creation - Costo COMPLETE');
    logger.info(`   Nro Contrato : ${nroContrato}`);
    logger.info(`   Contract ID  : ${finalContractId}`);
    logger.info(`   Transportista: ${transportistaNombre}`);
    logger.info('='.repeat(80));
  });
});