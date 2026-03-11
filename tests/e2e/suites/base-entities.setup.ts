import { test } from '../../../src/fixtures/base.js';
import { logger } from '../../../src/utils/logger.js';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DataPathHelper } from '../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import path from 'path';
import { allure } from 'allure-playwright';

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
test.describe('Base Operational Suite - Entity Creation', () => { // Firefox can take significantly longer due to strict actionability checks triggering JS fallbacks
    test.setTimeout(150000); // 90 seconds for stability (4 entities x ~15s each + margin)

    test('Create Base Operational Entities (Steps 1-4)', async ({ page }, testInfo) => {
        const startTime = Date.now();
        const workerIndex = DataPathHelper.getWorkerIndex(testInfo);
        const projectName = DataPathHelper.getProjectIdentifier(testInfo);
        const browserName = DataPathHelper.getBrowserName(testInfo);

        logger.info('🚀 Iniciando Suite Operacional Base - Pasos 1-4');
        logger.info(`🔧 Worker ${workerIndex} | Navegador: ${browserName} | Proyecto: ${projectName}`);
        logger.info('='.repeat(80));

        // Clean stale data file for this worker to ensure fresh state
        const staleDataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (fs.existsSync(staleDataPath)) {
            fs.unlinkSync(staleDataPath);
            logger.info(`🗑️ Archivo de datos antiguo eliminado: ${staleDataPath}`);
        }

        // =================================================================
        // PASO 0: Login
        // =================================================================
        logger.info('🔐 PASO 0: Autenticando...');
        const loginPage = new LoginPage(page);
        await loginPage.loginAndWaitForDashboard('arivas', 'arivas');
        logger.info('✅ Paso 0 Completado - Autenticado como arivas');
        logger.info('');

        // Data structure for export
        const operationalData = {
            createdAt: new Date().toISOString(),
            workerIndex: 0,
            projectName: '',
            transportista: {} as any,
            seededTransportista: {} as any,
            cliente: {} as any,
            seededCliente: {} as any,
            vehiculo: {} as any,
            conductor: {} as any,
            executionTimeSeconds: 0, // Will be set at the end
        };

        // =================================================================
        // PASO 1: Crear Transportista (Fundación)
        // =================================================================
        logger.info('📦 PASO 1/4: Creando Transportista...');
        const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');

        operationalData.transportista = {
            id: transportista.id,
            nombre: transportista.nombre,
            rut: transportista.documento,
            razonSocial: transportista.razonSocial,
            baseNombre: transportista.baseNombre || transportista.nombre.split(' - ')[0],
        };

        operationalData.seededTransportista = {
            id: transportista.id,
            nombre: transportista.nombre,
            rut: transportista.documento,
            razonSocial: transportista.razonSocial,
            baseNombre: transportista.baseNombre || transportista.nombre.split(' - ')[0],
        };

        logger.info(`✅ Paso 1/4 Completado - Transportista: ${transportista.nombre}`);
        logger.info(`   RUT: ${transportista.documento}, ID: ${transportista.id}`);
        logger.info('');

        // =================================================================
        // PASO 2: Crear Cliente (Cliente)
        // =================================================================
        logger.info('👤 Paso 2/4: Creando Cliente...');

        const cliente = await ClienteHelper.createClienteViaUI(page);

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

        logger.info(`✅ Paso 2/4 Completado - Cliente: ${cliente.nombre}`);
        logger.info(`   RUT: ${cliente.rut}`);
        logger.info('');

        // =================================================================
        // PASO 3: Crear Vehiculo (Vehículo con capacidad de 3 KG)
        // =================================================================
        logger.info('🚛 Paso 3/4: Creando Vehiculo...');
        const vehiculo = await VehiculoHelper.createVehiculoViaUI(page, transportista.nombre);

        operationalData.vehiculo = {
            patente: vehiculo.patente,
            muestra: vehiculo.muestra,
            transportistaNombre: vehiculo.transportistaName,
            capacity: '1 a 12 TON',
        };

        logger.info(`✅ Paso 3/4 Completado - Vehiculo: ${vehiculo.patente}`);
        logger.info(`   Capacidad: 1 a 12 TON`);
        logger.info('');

        // =================================================================
        // PASO 4: Crear Conductor (Conductor)
        // =================================================================
        logger.info('👨‍✈️ Paso 4/4: Creando Conductor...');
        const conductor = await ConductorHelper.createConductorViaUI(page, transportista.nombre);

        operationalData.conductor = {
            nombre: conductor.nombre,
            apellido: conductor.apellido,
            rut: conductor.rut,
            email: conductor.email,
            telefono: conductor.telefono,
            transportistaNombre: conductor.transportistaName,
        };

        logger.info(`✅ Paso 4/4 Completado - Conductor: ${conductor.nombre} ${conductor.apellido}`);
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
        logger.info('💾 DATA OPERACIONAL EXPORTADA (Browser-Isolated)');
        logger.info('='.repeat(80));
        logger.info(`📁 Navegador: ${browserName} | Archivo: ${outputPath}`);
        logger.info(`🌐 Worker ${workerIndex} | Projecto: ${projectName}`);
        logger.info('');
        logger.info('📦 Resumen:');
        logger.info(`   Transportista: ${operationalData.transportista.nombre} (${operationalData.transportista.rut})`);
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info(`   Vehiculo: ${operationalData.vehiculo.patente} (1 a 12 TON)`);
        logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido} (${operationalData.conductor.rut})`);
        logger.info('');
        logger.info(`⏱️  Tiempo de Ejecución: ${elapsedTime}s`);
        logger.info('='.repeat(80));
        logger.info('✅ BASE OPERATIONAL SUITE COMPLETADA EXITOSAMENTE!');
        logger.info('🎯 Data lista para tests de creación de contrato y planificación de viajes');
        logger.info('='.repeat(80));

        // Allure parameters — resumen de entidades creadas
        await allure.epic('TMS Legacy Flow');
        await allure.feature('00-Setup');
        await allure.story('Base Entities');
        await allure.parameter('Transportista', operationalData.transportista.nombre);
        await allure.parameter('Transportista ID', String(operationalData.transportista.id ?? 'N/A'));
        await allure.parameter('Cliente', operationalData.cliente.nombreFantasia || operationalData.cliente.nombre);
        await allure.parameter('Cliente ID', String(operationalData.cliente.id ?? 'N/A'));
        await allure.parameter('Vehículo Patente', operationalData.vehiculo.patente);
        await allure.parameter('Conductor', `${operationalData.conductor.nombre} ${operationalData.conductor.apellido}`.trim());
        await allure.parameter('Browser', browserName);
        await allure.attachment('Entidades Creadas (JSON)', JSON.stringify({
            transportista: { nombre: operationalData.transportista.nombre, id: operationalData.transportista.id },
            cliente: { nombre: operationalData.cliente.nombreFantasia || operationalData.cliente.nombre, id: operationalData.cliente.id },
            vehiculo: { patente: operationalData.vehiculo.patente },
            conductor: { nombre: `${operationalData.conductor.nombre} ${operationalData.conductor.apellido}`.trim() }
        }, null, 2), 'application/json');
    });
});
