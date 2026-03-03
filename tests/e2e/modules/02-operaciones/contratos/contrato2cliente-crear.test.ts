import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { config } from '../../../../../src/config/environment.js';
import fs from 'fs';

/**
 * Contract Creation - Tipo Venta (Uses Seeded Cliente)
 *
 * Prerequisites:
 * - Run `npm run test:entity:cliente` first (writes seededCliente to JSON)
 *   OR run `npm run test:legacy:setup` (base-entities.setup.ts also writes seededCliente)
 *
 * This test:
 * - Loads seededCliente from worker-specific JSON
 * - Creates a Venta contract header (Tipo 2, Subtipo 1)
 * - Adds Route 715 + Cargo 715_19 with tarifas
 * - Saves the full contract
 * - Verifies the contract appears in /contrato/index
 * - Stores contract info in JSON for downstream tests
 */
test.describe('Contract Creation - Venta (Uses Seeded Cliente)', () => {
    test.setTimeout(120000);

    test('Create Contract (Venta) using Seeded Cliente', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('='.repeat(80));
        logger.info('🚀 Starting Contract Creation - Tipo Venta (Seeded Cliente Mode)');
        logger.info('='.repeat(80));

        // =================================================================
        // PHASE 1: Load Data
        // =================================================================
        logger.info('📋 PHASE 1: Loading seeded client data...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found: ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        const cliente = operationalData.seededCliente || operationalData.cliente;
        if (!cliente) {
            throw new Error(
                `'seededCliente' or 'cliente' not found in ${dataPath}.\n` +
                `Run 'npm run test:legacy:setup' or 'npm run test:entity:cliente'.`
            );
        }
        const clienteNombre = cliente.nombreFantasia || cliente.nombre;
        logger.info(`📦 Using cliente: "${clienteNombre}" (ID: ${cliente.id})`);

        // =================================================================
        // PHASE 2: Navigate to Create Form
        // =================================================================
        logger.info('📋 PHASE 2: Navigating to contract creation form...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();
        await page.waitForLoadState('domcontentloaded');
        logger.info('✅ Form loaded');

        // =================================================================
        // PHASE 3-4: Fill Contract Header and Save
        // =================================================================
        logger.info('📋 PHASE 3-4: Filling contract header and saving...');
        const nroContrato = String(Date.now()).slice(-6);
        
        // Use the centralized helper for Venta contracts
        const contractId = await contratosPage.fillBasicContractInfo(
            nroContrato, 
            clienteNombre, 
            'Venta', 
            '1'
        );
        logger.info(`✅ Contract header saved! ID: ${contractId}`);

        // =================================================================
        // PHASE 5: Add Route + Cargo + Tarifas
        // =================================================================
        logger.info('📋 PHASE 5: Adding Route 715 + Cargo 715_19 with tarifas...');
        // For Venta, we want to fill conductor(20000), viaje(50000) AND total(50000)
        await contratosPage.addSpecificRouteAndCargo('20000', '50000', '50000');
        logger.info('✅ Route and tariffs added');

        // =================================================================
        // PHASE 6: Save Full Contract (with tarifas)
        // =================================================================
        logger.info('📋 PHASE 6: Saving full contract (with tarifas)...');
        const finalContractId = await contratosPage.saveAndExtractId();
        logger.info(`✅ Full contract saved! ID: ${finalContractId}`);

        logger.info('📋 PHASE 7: Verifying contract in index...');
        
        let found = false;
        const maxAttempts = 3;
        let contractRow = page.locator('table tbody tr').first(); // Placeholder
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            logger.info(`🔍 Verification attempt ${attempt}/${maxAttempts}...`);
            
            await page.goto('/contrato/index');
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => logger.warn('⚠️ networkidle timeout, continuing...'));
            
            const searchInput = page.locator('input[type="search"]').first();
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
            
            logger.info(`⌨️ Searching by cliente: ${clienteNombre}`);
            await searchInput.clear();
            await searchInput.fill(clienteNombre);
            await page.waitForTimeout(2000); // DataTables filter

            contractRow = page.locator('table tbody tr').filter({ hasText: clienteNombre }).first();
            const isVisible = await contractRow.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (isVisible) {
                logger.info(`✅ Contract ${nroContrato} found in index!`);
                found = true;
                break;
            } else {
                logger.warn(`⚠️ Contract ${nroContrato} not found in this attempt.`);
                if (attempt < maxAttempts) {
                    await page.waitForTimeout(3000); // Wait before reload
                }
            }
        }

        if (!found) {
            logger.error(`❌ Contract ${nroContrato} not found in index table after ${maxAttempts} attempts`);
            await page.screenshot({ path: `./reports/screenshots/contract-not-found-${nroContrato}.png`, fullPage: true });
            throw new Error(`Contract ${nroContrato} not found in index table after search`);
        }

        // Extract final ID from grid row if not already captured
        let finalId = contractId;
        if (!finalId) {
            const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
            const href = await editLink.getAttribute('href').catch(() => null);
            const idFromGrid = href?.match(/\/editar\/(\d+)/)?.[1];
            if (idFromGrid) {
                finalId = idFromGrid;
                logger.info(`✅ Contract ID from grid: ${finalId}`);
            }
        }

        // =================================================================
        // PHASE 8: Persist to JSON
        // =================================================================
        logger.info('📋 PHASE 8: Persisting contract data to JSON...');
        operationalData.contratoCliente = { id: finalId, nroContrato: nroContrato };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ contratoCliente data saved to ${dataPath}`);

        // =================================================================
        // SUMMARY
        // =================================================================
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('✅ VENTA CONTRACT CREATION COMPLETE!');
        logger.info('='.repeat(80));
        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Contract ID: ${finalId}`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info(`   Execution Time: ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});