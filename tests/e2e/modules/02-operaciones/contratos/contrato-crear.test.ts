import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * OPTIMIZED Step 5: Contract Creation (No Entity Seeding)
 * 
 * Prerequisites: 
 * 1. Run base-entities.setup.ts to generate last-run-data.json
 * 2. Entities must already exist in the system
 * 
 * This test:
 * - Loads existing entity data from last-run-data.json
 * - SKIPS all entity creation (Transportista, Cliente, Vehiculo, Conductor)
 * - Creates contract directly using existing entities
 * - Target execution time: <20 seconds (vs 70s for full flow)
 */
test.describe('Contract Creation - Optimized (Uses Existing Entities)', () => {
    test.setTimeout(60000); // 60 seconds (increased for Select2 rendering)

    test('Create Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('🚀 Starting OPTIMIZED Contract Creation (Step 5 Only)');
        logger.info('='.repeat(80));

        // =================================================================
        // STEP 1: Load Existing Entity Data
        // =================================================================
        logger.info('📂 Loading existing entity data from worker-specific JSON...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(
                '❌ Worker-specific data file not found!\n' +
                `Expected: ${dataPath}\n` +
                'Please run base entities setup first:\n' +
                'npm run test:base'
            );
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        logger.info('✅ Loaded existing entities:');
        logger.info(`   Transportista: ${operationalData.transportista.nombre} (${operationalData.transportista.rut})`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info(`   Vehiculo: ${operationalData.vehiculo.patente} (${operationalData.vehiculo.capacity})`);
        logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido}`);
        logger.info('');

        // Note: Already authenticated via storageState from setup project

        // =================================================================
        // STEP 2: Navigate to Contract Creation with URL Discovery
        // =================================================================
        logger.info('📄 Navigating to contract creation...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate(); // Uses URL discovery from index
        logger.info('✅ Navigation complete');
        logger.info('');

        // ===================================================================
        // PHASE 1: Create Basic Contract (Nro Contrato + Transportista)
        // ===================================================================
        logger.info('📝 PHASE 1: Creating basic contract...');

        // Generate numeric-only contract number (5 digits)
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));

        // Use FULL transportista nombre from JSON (includes unique timestamp suffix)
        // CRITICAL: baseNombre ("LogiChile Connect") can match legacy entries — use full unique name
        const transportistaNombre = operationalData.transportista.nombre;

        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Transportista: ${transportistaNombre}`);

        // Fill basic contract info - this will redirect to /contrato/editar/{id}
        const contractId = await contratosPage.fillBasicContractInfo(
            nroContrato,
            transportistaNombre  // Use hardcoded existing transportista
        );

        logger.info(`✅ Contract created! ID: ${contractId}`);
        logger.info('');

        // ===================================================================
        // PHASE 2: Add Route 715 & Cargo (on /contrato/editar/{id} page)
        // ===================================================================
        const tarifaConductor = '20000';
        const tarifaViaje = '50000';

        logger.info('🛣️ PHASE 2: Adding Route 715 and Cargo...');
        logger.info(`   Tarifa Conductor: ${tarifaConductor}`);
        logger.info(`   Tarifa Viaje: ${tarifaViaje}`);

        await contratosPage.addSpecificRouteAndCargo(tarifaConductor, tarifaViaje);

        logger.info('✅ Route and cargo added');
        logger.info('');

        // ===================================================================
        // PHASE 3: Save Contract
        // ===================================================================
        logger.info('💾 PHASE 3: Saving contract...');
        await contratosPage.saveAndExtractId(); // Final save

        logger.info(`✅ Contract saved! ID: ${contractId}`);
        logger.info('');

        // =================================================================
        // PHASE 4: Verification
        // =================================================================
        logger.info('🔍 PHASE 4: Verifying contract...');

        // After final save, system should auto-redirect to /contrato/index
        logger.info('Waiting for auto-redirect to contract index...');
        await expect(page).toHaveURL(/\/contrato\/index/, { timeout: 10000 });
        logger.info('✅ Auto-redirected to contract index');

        // Search for the contract using the search box
        logger.info(`Searching for contract: ${nroContrato}`);
        const searchBox = page.locator('input[type="search"]');
        await searchBox.fill(nroContrato);
        await page.waitForTimeout(1000); // Wait for search to filter

        // Verify contract appears in the filtered results
        const contractRow = page.locator('table tbody tr').filter({ hasText: nroContrato });
        await expect(contractRow).toBeVisible({ timeout: 10000 });
        logger.info(`✅ Contract ${nroContrato} verified in contract list`);
        logger.info('');

        // =================================================================
        // Final Summary
        // =================================================================
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.info('='.repeat(80));
        logger.info('🎉 OPTIMIZED CONTRACT CREATION COMPLETE!');
        logger.info('='.repeat(80));
        logger.info(`⏱️  Execution Time: ${executionTime}s (Target: <20s)`);
        logger.info('');
        logger.info('📄 Contract Details:');
        logger.info(`   ID: ${contractId}`);
        logger.info(`   Route: 715 (05082025-1)`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre}`);
        logger.info(`   Transportista: ${operationalData.transportista.nombre}`);
        logger.info(`   Status: ACTIVO`);
        logger.info('='.repeat(80));

        // Assertions
        expect(contractId).toBeTruthy();
        expect(contractId).toMatch(/^\d+$/);
    });
});
