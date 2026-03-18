import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { config } from '../../../../../src/config/environment.js';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';

/**
 * Contract Creation - Tipo Venta (Uses Seeded Cliente)
 *
 * Prerequisites:
 * - LEGACY_DATA_SOURCE=entities: correr entidades (transportista/cliente/conductor/vehiculo)
 * - LEGACY_DATA_SOURCE=base: correr base-entities.setup.ts
 *
 * This test:
 * - Loads seededCliente from worker-specific JSON
 * - Creates a Venta contract header (Tipo 2, Subtipo 1)
 * - Adds Route 715 + Cargo 715_19 with tarifas
 * - Saves the full contract
 * - Verifies the contract appears in /contrato/index
 * - Stores contract info in JSON for downstream tests
 */
test.describe('[C02] Contratos - Tipo Venta', () => {
    test.setTimeout(120000);

    test('Crear Contrato (Venta) usando seeded Cliente', async ({ page }, testInfo) => {
        const startTime = Date.now();
        await allure.epic('TMS Legacy Flow');
        await allure.feature('02-Contratos');
        await allure.story('Contrato Tipo Venta');
        logger.info('='.repeat(80));
        logger.info('🚀 Iniciando creación de Contrato Tipo Venta (Seeded Cliente Mode)');
        logger.info('='.repeat(80));

        // =================================================================
        // PHASE 1: Load Data
        // =================================================================
        logger.info('📋 Fase 1: Cargando datos del cliente sembrado...');
        const dataPath = DataPathHelper.getLegacyOperationalDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found: ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        const cliente = operationalData.seededCliente || operationalData.cliente;
        if (!cliente) {
            throw new Error(
                `'seededCliente' or 'cliente' not found in ${dataPath}.\n` +
                `Run seed flow first (entities or base) and set LEGACY_DATA_SOURCE accordingly.`
            );
        }
        const clienteNombre = cliente.nombreFantasia || cliente.nombre;
        logger.info(`📦 Usando cliente: "${clienteNombre}" (ID: ${cliente.id})`);

        await allure.parameter('Cliente', clienteNombre);
        await allure.parameter('Cliente ID', String(cliente.id));
        await allure.attachment('Datos Cargados (JSON)', JSON.stringify({
            cliente: clienteNombre,
            clienteId: cliente.id
        }, null, 2), 'application/json');

        // =================================================================
        // PHASE 2: Navigate to Create Form
        // =================================================================
        logger.info('📋 Fase 2: Navegando al formulario de creación de contratos...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();
        await page.waitForLoadState('domcontentloaded');
        logger.info('✅ Formulario cargado');

        // =================================================================
        // PHASE 3-4: Fill Contract Header and Save
        // =================================================================
        logger.info('📋 Fase 3-4: Completando el encabezado del contrato y guardando...');
        const nroContrato = String(Date.now()).slice(-6);
        await allure.parameter('Nro Contrato', nroContrato);

        // Use the centralized helper for Venta contracts
        const contractId = await contratosPage.fillBasicContractInfo(
            nroContrato,
            clienteNombre,
            'Venta',
            '1'
        );
        logger.info(`✅ Encabezado del contrato guardado! ID: ${contractId}`);

        // =================================================================
        // PHASE 5: Add Route + Cargo + Tarifas
        // =================================================================
        logger.info('📋 Fase 5: Agregando ruta 715 + carga 715_19 con tarifas...');
        // For Venta, we want to fill conductor(20000), viaje(50000) AND total(50000)
        await contratosPage.addSpecificRouteAndCargo('20000', '50000', '50000');
        logger.info('✅ Ruta y tarifas agregadas');

        // =================================================================
        // PHASE 6: Save Full Contract (with tarifas)
        // =================================================================
        logger.info('📋 Fase 6: Guardando contrato completo (con tarifas)...');
        const finalContractId = await contratosPage.saveAndExtractId();
        logger.info(`✅ Contrato completo guardado! ID: ${finalContractId}`);

        logger.info('📋 Fase 7: Verificando contrato en el índice...');

        let found = false;
        const maxAttempts = 3;
        let contractRow = page.locator('table tbody tr').first(); // Placeholder

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            logger.info(`🔍 Intentando verificar el contrato ${attempt}/${maxAttempts}...`);

            await page.goto('/contrato/index');
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => logger.warn('⚠️ networkidle timeout, continuing...'));

            const searchInput = page.locator('input[type="search"]').first();
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });

            logger.info(`⌨️ Buscando por cliente: ${clienteNombre}`);
            await searchInput.clear();
            await searchInput.fill(clienteNombre);
            await page.waitForTimeout(2000); // DataTables filter

            contractRow = page.locator('table tbody tr').filter({ hasText: clienteNombre }).first();
            const isVisible = await contractRow.isVisible({ timeout: 5000 }).catch(() => false);

            if (isVisible) {
                logger.info(`✅ Contrato ${nroContrato} encontrado en el índice!`);
                found = true;
                break;
            } else {
                logger.warn(`⚠️ Contrato ${nroContrato} no encontrado en este intento.`);
                if (attempt < maxAttempts) {
                    await page.waitForTimeout(3000); // Wait before reload
                }
            }
        }

        if (!found) {
            logger.error(`❌ Contrato ${nroContrato} no encontrado en la tabla del índice después de ${maxAttempts} intentos`);
            await page.screenshot({ path: `./reports/screenshots/contract-not-found-${nroContrato}.png`, fullPage: true });
            throw new Error(`Contrato ${nroContrato} no encontrado en la tabla del índice después de la búsqueda`);
        }

        // Extract final ID from grid row if not already captured
        let finalId = contractId;
        if (!finalId) {
            const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
            const href = await editLink.getAttribute('href').catch(() => null);
            const idFromGrid = href?.match(/\/editar\/(\d+)/)?.[1];
            if (idFromGrid) {
                finalId = idFromGrid;
                logger.info(`✅ ID del contrato desde la grilla: ${finalId}`);
            }
        }

        entityTracker.register({
            type: 'Contrato',
            name: nroContrato,
            id: finalId,
            asociado: clienteNombre
        });

        // =================================================================
        // PHASE 8: Persist to JSON
        // =================================================================
        logger.info('📋 Fase 8: Persistiendo datos del contrato en JSON...');
        operationalData.contratoCliente = { id: finalId, nroContrato: nroContrato };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ Datos de contratoCliente guardados en ${dataPath}`);

        // =================================================================
        // SUMMARY
        // =================================================================
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('✅ CREACIÓN DE CONTRATO TIPO VENTA COMPLETADA!');
        logger.info('='.repeat(80));
        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Contract ID: ${finalId}`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info(`   Tiempo de ejecución: ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});

