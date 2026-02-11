import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Contract Creation - Optimized (Uses Existing Entities)', () => {
    test.setTimeout(60000); 

    test('Create Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('🚀 Starting OPTIMIZED Contract Creation (Step 5 Only)');

        // STEP 1: Load Existing Entity Data
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error('Data file not found');
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        // STEP 2: Navigate
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate(); 

        // PHASE 1: Create Basic Contract
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        const transportistaNombre = operationalData.transportista.nombre;

        logger.info(`📝 Filling contract. Nro: ${nroContrato}, Trans: ${transportistaNombre}`);

        // Usamos fillBasicContractInfo pero asumimos que maneja bien el formulario
        // Si fallara aquí, sería ideal hacerlo manual como en el otro test, 
        // pero vamos a confiar en el PageObject para la creación y robustecer la verificación.
        const contractId = await contratosPage.fillBasicContractInfo(
            nroContrato,
            transportistaNombre 
        );

        // PHASE 2 & 3: Route & Save
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');
        await contratosPage.saveAndExtractId();

        // PHASE 4: Verification (ROBUST)
        logger.info('🔍 PHASE 4: Verifying contract...');

        if (!page.url().includes('/contrato/index')) {
            await page.goto('https://moveontruckqa.bermanntms.cl/contrato/index');
        }

        // --- FIX: Búsqueda explícita con Enter ---
        logger.info(`Searching for contract: ${nroContrato}`);
        const searchBox = page.locator('input[type="search"]').first();
        await searchBox.waitFor({ state: 'visible' });
        await searchBox.fill(nroContrato);
        await page.keyboard.press('Enter'); // Vital para activar el filtro
        await page.waitForTimeout(1500);    // Vital para esperar el render

        // Verificar
        const contractRow = page.locator('table tbody tr').filter({ hasText: nroContrato }).first();
        await expect(contractRow).toBeVisible({ timeout: 15000 });
        
        logger.info(`✅ Contract ${nroContrato} verified in contract list`);
    });
});