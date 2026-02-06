import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { LoginPage } from '../../../../../src/modules/auth/pages/LoginPage.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { config } from '../../../../../src/config/environment.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import path from 'path';

/**
 * Step 5: Contract Creation using Base Operational Suite Data
 * 
 * Prerequisites: Run base-entities.setup.ts to generate last-run-data.json
 * 
 * This test:
 * 1. Loads operational data from last-run-data.json
 * 2. Creates a COSTO contract linking the Transportista
 * 3. Assigns Route 715 and Cargo 715_3
 * 4. Saves and verifies the contract
 */
test.describe('Step 5: Contract Creation with Base Entities', () => {
    test.setTimeout(90000); // 90 seconds

    test('Create Contract for Route 715 using Base Entities Data', async ({ page }, testInfo) => {
        logger.info('🚀 Starting Step 5: Contract Creation');
        logger.info('='.repeat(80));

        // =================================================================
        // STEP 0: Login
        // =================================================================
        logger.info('🔐 Authenticating...');
        const loginPage = new LoginPage(page);
        await loginPage.loginAndWaitForDashboard('arivas', 'arivas');
        logger.info('✅ Authenticated');
        logger.info('');

        // =================================================================
        // STEP 1: Load Base Entities Data
        // =================================================================
        logger.info('📂 Loading operational data from worker-specific JSON...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(
                '❌ Worker-specific data file not found! Please run base-entities.setup.ts first:\n' +
                `Expected: ${dataPath}\n` +
                'npx playwright test tests/e2e/suites/base-entities.setup.ts'
            );
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        logger.info('✅ Data loaded successfully:');
        logger.info(`   Transportista: ${operationalData.transportista.nombre} (${operationalData.transportista.rut})`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info(`   Vehiculo: ${operationalData.vehiculo.patente}`);
        logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido} (${operationalData.conductor.rut})`);
        logger.info('');

        // =================================================================
        // STEP 2: Navigate to Contract Creation
        // =================================================================
        logger.info('📄 Creating Contract with Route 715...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // Contract Data
        const fechaInicio = '2025-08-05';
        const fechaFin = '2025-08-10';
        const tarifaConductor = '20000';
        const tarifaViaje = '50000';

        // =================================================================
        // STEP 3: Fill Contract Form
        // =================================================================
        logger.info('📝 Filling contract form:');
        logger.info(`   Cliente: ${operationalData.cliente.nombre}`);
        logger.info(`   Transportista RUT: ${operationalData.transportista.rut}`);
        logger.info(`   Periodo: ${fechaInicio} to ${fechaFin}`);

        await contratosPage.fillMainForm(
            operationalData.cliente.nombre,
            operationalData.transportista.rut,
            fechaInicio,
            fechaFin
        );

        logger.info('✅ Contract form filled');
        logger.info('');

        // =================================================================
        // STEP 4: Add Route 715 & Cargo 715_3
        // =================================================================
        logger.info('🛣️ Adding Route 715 and Cargo 715_3...');
        logger.info(`   Tarifa Conductor: ${tarifaConductor}`);
        logger.info(`   Tarifa Viaje: ${tarifaViaje}`);

        await contratosPage.addSpecificRouteAndCargo(tarifaConductor, tarifaViaje);

        logger.info('✅ Route 715 and Cargo 715_3 added');
        logger.info('');

        // =================================================================
        // STEP 5: Save and Extract Contract ID
        // =================================================================
        logger.info('💾 Saving contract...');
        const contractId = await contratosPage.saveAndExtractId();

        logger.info('✅ Contract saved successfully!');
        logger.info(`   Contract ID: ${contractId}`);
        logger.info('');

        // =================================================================
        // STEP 6: Verification
        // =================================================================
        logger.info('🔍 Verifying contract...');

        const baseUrl = config.get().baseUrl;

        // Navigate to contract view if not already there
        if (!page.url().includes(`/contratos/ver/${contractId}`)) {
            logger.info('Navigating to contract view page...');
            await page.goto(`${baseUrl}/contratos/ver/${contractId}`);
            await page.waitForLoadState('networkidle');
        }

        // Verify Route 715 is visible
        logger.info('Checking Route 715 (05082025-1) visibility...');
        await expect(page.getByText('05082025-1')).toBeVisible({ timeout: 10000 });
        logger.info('✅ Route 715 verified!');
        logger.info('');

        // =================================================================
        // STEP 7: Log Final Summary
        // =================================================================
        logger.info('='.repeat(80));
        logger.info('🎉 STEP 5 COMPLETE - CONTRACT CREATED SUCCESSFULLY!');
        logger.info('='.repeat(80));
        logger.info('📦 Operational Pack:');
        logger.info(`   Transportista: ${operationalData.transportista.nombre} (${operationalData.transportista.rut})`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info(`   Vehiculo: ${operationalData.vehiculo.patente} (3 KG)`);
        logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido} (${operationalData.conductor.rut})`);
        logger.info('');
        logger.info(`📄 Contract:`);
        logger.info(`   ID: ${contractId}`);
        logger.info(`   Route: 715 (05082025-1)`);
        logger.info(`   Status: ACTIVO`);
        logger.info(`   Periodo: ${fechaInicio} to ${fechaFin}`);
        logger.info('='.repeat(80));
        logger.info('✅ READY FOR STEP 6: TRIP PLANNING!');
        logger.info('='.repeat(80));

        // Save contract ID for potential next steps
        process.env.CREATED_CONTRACT_ID = contractId;

        // Final assertion
        expect(contractId).toBeTruthy();
        expect(contractId).toMatch(/^\d+$/);
    });
});
