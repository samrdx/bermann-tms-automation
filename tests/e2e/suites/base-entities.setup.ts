import { test } from '../../../src/fixtures/base.js';
import { logger } from '../../../src/utils/logger.js';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DataPathHelper } from '../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import path from 'path';

// Import Helpers for Seeding
import { TransportistaHelper } from '../../api-helpers/TransportistaHelper.js';
import { ClienteHelper } from '../../api-helpers/ClienteHelper.js';
import { VehiculoHelper } from '../../api-helpers/VehiculoHelper.js';
import { ConductorHelper } from '../../api-helpers/ConductorHelper.js';

/**
 * Base Operational Suite - Steps 1-4
 * Creates foundational entities: Transportista, Cliente, Vehiculo, Conductor
 * Exports data to worker-specific JSON (last-run-data-worker-N.json) for parallel execution
 * Target: Complete in under 90 seconds (increased from 60s for stability)
 */
test.describe('Base Operational Suite - Entity Creation', () => {
    test.setTimeout(90000); // 90 seconds for stability (4 entities x ~15s each + margin)

    test('Create Base Operational Entities (Steps 1-4)', async ({ page }, testInfo) => {
        const startTime = Date.now();
        const workerIndex = DataPathHelper.getWorkerIndex(testInfo);
        const projectName = DataPathHelper.getProjectIdentifier(testInfo);
        const browserName = DataPathHelper.getBrowserName(testInfo);

        logger.info('🚀 Starting Base Operational Suite - Steps 1-4');
        logger.info(`🔧 Worker ${workerIndex} | Browser: ${browserName} | Project: ${projectName}`);
        logger.info('='.repeat(80));

        // Clean stale data file for this worker to ensure fresh state
        const staleDataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (fs.existsSync(staleDataPath)) {
            fs.unlinkSync(staleDataPath);
            logger.info(`🗑️ Deleted stale data file: ${staleDataPath}`);
        }

        // =================================================================
        // STEP 0: Login
        // =================================================================
        logger.info('🔐 STEP 0: Authenticating...');
        const loginPage = new LoginPage(page);
        await loginPage.loginAndWaitForDashboard('arivas', 'arivas');
        logger.info('✅ Step 0 Complete - Authenticated as arivas');
        logger.info('');

        // Data structure for export
        const operationalData = {
            createdAt: new Date().toISOString(),
            workerIndex: 0,
            projectName: '',
            transportista: {} as any,
            cliente: {} as any,
            seededCliente: {} as any,
            vehiculo: {} as any,
            conductor: {} as any,
            executionTimeSeconds: 0, // Will be set at the end
        };

        // =================================================================
        // STEP 1: Create Transportista (Foundation)
        // =================================================================
        logger.info('📦 STEP 1/4: Creating Transportista...');
        const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');

        operationalData.transportista = {
            id: transportista.id,
            nombre: transportista.nombre,
            rut: transportista.documento,
            razonSocial: transportista.razonSocial,
            baseNombre: transportista.baseNombre || transportista.nombre.split(' - ')[0],
        };

        logger.info(`✅ Step 1/4 Complete - Transportista: ${transportista.nombre}`);
        logger.info(`   RUT: ${transportista.documento}, ID: ${transportista.id}`);
        logger.info('');

        // =================================================================
        // STEP 2: Create Cliente (Client)
        // =================================================================
        logger.info('👤 STEP 2/4: Creating Cliente...');

        const transportistaBaseName = transportista.baseNombre || transportista.nombre.split(' - ')[0];
        const cliente = await ClienteHelper.createClienteViaUI(page, transportistaBaseName);

        operationalData.cliente = {
            id: cliente.id || 'N/A',
            nombre: cliente.nombre,
            nombreFantasia: cliente.nombreFantasia,
            rut: cliente.rut,
            email: cliente.email,
        };

        // Also write as seededCliente (same key used by cliente-crear.test.ts)
        // so viajes-planificar.test.ts always reads from the same key.
        operationalData.seededCliente = {
            id: cliente.id || 'N/A',
            nombre: cliente.nombre,
            nombreFantasia: cliente.nombreFantasia,
            rut: cliente.rut,
            email: cliente.email,
        };

        logger.info(`✅ Step 2/4 Complete - Cliente: ${cliente.nombre}`);
        logger.info(`   RUT: ${cliente.rut}`);
        logger.info('');

        // =================================================================
        // STEP 3: Create Vehiculo (Vehicle with 3 KG capacity)
        // =================================================================
        logger.info('🚛 STEP 3/4: Creating Vehiculo...');
        const vehiculo = await VehiculoHelper.createVehiculoViaUI(page, transportista.nombre);

        operationalData.vehiculo = {
            patente: vehiculo.patente,
            muestra: vehiculo.muestra,
            transportistaNombre: vehiculo.transportistaName,
            capacity: '3 KG',
        };

        logger.info(`✅ Step 3/4 Complete - Vehiculo: ${vehiculo.patente}`);
        logger.info(`   Capacity: 3 KG`);
        logger.info('');

        // =================================================================
        // STEP 4: Create Conductor (Driver)
        // =================================================================
        logger.info('👨‍✈️ STEP 4/4: Creating Conductor...');
        const conductor = await ConductorHelper.createConductorViaUI(page, transportista.nombre);

        operationalData.conductor = {
            nombre: conductor.nombre,
            apellido: conductor.apellido,
            rut: conductor.rut,
            email: conductor.email,
            telefono: conductor.telefono,
            transportistaNombre: conductor.transportistaName,
        };

        logger.info(`✅ Step 4/4 Complete - Conductor: ${conductor.nombre} ${conductor.apellido}`);
        logger.info(`   RUT: ${conductor.rut}`);
        logger.info('');

        // =================================================================
        // Export Data to Worker-Specific JSON
        // =================================================================
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        operationalData['executionTimeSeconds'] = parseFloat(elapsedTime);
        operationalData['workerIndex'] = workerIndex;
        operationalData['projectName'] = projectName;

        const outputPath = DataPathHelper.getWorkerDataPath(testInfo);
        fs.writeFileSync(outputPath, JSON.stringify(operationalData, null, 2), 'utf-8');

        logger.info('='.repeat(80));
        logger.info('💾 OPERATIONAL DATA EXPORTED (Browser-Isolated)');
        logger.info('='.repeat(80));
        logger.info(`📁 Browser: ${browserName} | File: ${outputPath}`);
        logger.info(`🌐 Worker ${workerIndex} | Project: ${projectName}`);
        logger.info('');
        logger.info('📦 Summary:');
        logger.info(`   Transportista: ${operationalData.transportista.nombre} (${operationalData.transportista.rut})`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info(`   Vehiculo: ${operationalData.vehiculo.patente} (3 KG)`);
        logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido} (${operationalData.conductor.rut})`);
        logger.info('');
        logger.info(`⏱️  Execution Time: ${elapsedTime}s`);
        logger.info('='.repeat(80));
        logger.info('✅ BASE OPERATIONAL SUITE COMPLETED SUCCESSFULLY!');
        logger.info('🎯 Data ready for Contract Creation and Trip Planning tests');
        logger.info('='.repeat(80));
    });
});
