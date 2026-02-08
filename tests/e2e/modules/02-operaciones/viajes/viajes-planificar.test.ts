import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * Step 6: Planificar Viaje (Trip Planning)
 *
 * Prerequisites:
 * 1. Run base-entities.setup.ts to generate last-run-data.json
 * 2. Run contrato-crear.test.ts (Step 5) to create Transportista Contract
 * 3. Run contrato2cliente-crear.test.ts (Step 5.5) to create Cliente Contract
 *
 * This test:
 * - Loads existing entity data from last-run-data.json
 * - Uses dynamic cliente from JSON
 * - Creates a new viaje (trip) planning record
 * - Verifies trip appears in /viajes/asignar
 * - Stores viaje info in JSON for Step 7
 */
test.describe('Viajes - Planificar (Create)', () => {
  test.setTimeout(120000);

  test('Should planificar a new Viaje using entities from JSON', async ({
    viajesPlanificarPage
  }, testInfo) => {
    const startTime = Date.now();

    logger.info('='.repeat(80));
    logger.info('Starting Step 6: Planificar Viaje');
    logger.info('='.repeat(80));

    // =================================================================
    // STEP 1: Load JSON Data
    // =================================================================
    logger.info('Loading existing entity data from worker-specific JSON...');
    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

    if (!fs.existsSync(dataPath)) {
      throw new Error(
        'Worker-specific data file not found!\n' +
        `Expected: ${dataPath}\n` +
        'Please run base entities setup first: npm run test:base'
      );
    }

    const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Verify prerequisites
    if (!operationalData.cliente?.nombre) {
      throw new Error('❌ Missing required entity: Cliente. Please run base entities setup.');
    }

    logger.info('✅ All prerequisites validated');
    logger.info('Loaded entities:');
    logger.info(`   Cliente: ${operationalData.cliente.nombre}`);
    logger.info('');

    // Test data
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    // Use nombreFantasia if available, otherwise nombre
    const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

    logger.info(`Generated Nro Viaje: ${nroViaje}`);

    // =================================================================
    // PHASE 1: Navigate to Planificar Viajes
    // =================================================================
    await test.step('Phase 1: Navigate', async () => {
      logger.info('PHASE 1: Navigate to Planificar Viajes');
      await viajesPlanificarPage.navigate();
      logger.info('Navigation successful');
    });

    // =================================================================
    // PHASE 2: Fill Form with dynamic data
    // CORRECT ORDER BASED ON UI SCREENSHOT:
    // 1. Nro Viaje
    // 2. Tipo Operación
    // 3. Tipo Servicio
    // 4. Cliente (Triggers cascade)
    // 5. Unidad Negocio
    // 6. Código Carga (Triggers route calculation)
    // 7. Agregar Ruta
    // =================================================================
    await test.step('Phase 2: Fill Form', async () => {
      logger.info('PHASE 2: Fill Complete Viaje Form');

      // 1. Nro Viaje
      await viajesPlanificarPage.fillNroViaje(nroViaje);

      // 2. Tipo Operación
      await viajesPlanificarPage.selectTipoOperacion('tclp2210');

      // 3. Tipo Servicio
      await viajesPlanificarPage.selectTipoServicio('tclp2210');

      // 4. Cliente - Critical Cascade Trigger
      logger.info(`Selecting Cliente: ${clienteNombre}`);
      await viajesPlanificarPage.selectCliente(clienteNombre);

      // 5. Tipo Viaje (Default Normal) & Unidad Negocio
      await viajesPlanificarPage.selectTipoViaje('Normal');
      await viajesPlanificarPage.selectUnidadNegocio('Defecto');

      // 6. Código Carga - The "Magical" Trigger
      // We look for '715' or the cargo name 'Pallet_Furgon_Frio_10ton'
      logger.info('Selecting Codigo Carga (Pallet_Furgon_Frio_10ton)...');
      await viajesPlanificarPage.selectCodigoCarga('Pallet_Furgon_Frio_10ton');

      // 7. Route Modal
      logger.info('Adding Route 05082025-1...');
      await viajesPlanificarPage.agregarRuta('05082025-1');

      logger.info('Form filled completely');
    });

    // =================================================================
    // PHASE 3: Save Viaje
    // =================================================================
    await test.step('Phase 3: Save', async () => {
      logger.info('PHASE 3: Save Viaje');
      await viajesPlanificarPage.clickGuardar();
      logger.info('Save clicked');
    });

    // =================================================================
    // PHASE 4: Verification
    // =================================================================
    await test.step('Phase 4: Verify', async () => {
      logger.info('PHASE 4: Verification');

      // Check if we navigated away from /crear
      const isSaved = await viajesPlanificarPage.isFormSaved();
      expect(isSaved, 'Form should be saved and URL changed').toBeTruthy();

      // Verify in Grid
      const foundInAsignar = await viajesPlanificarPage.verifyInAsignar(nroViaje);

      if (foundInAsignar) {
        logger.info(`✅ Viaje ${nroViaje} verified in /viajes/asignar`);
      } else {
        logger.warn(`⚠️ Viaje ${nroViaje} not found in /viajes/asignar`);
      }

      expect(foundInAsignar, `Viaje ${nroViaje} should be visible in Asignar grid`).toBe(true);
    });

    // =================================================================
    // STEP 6: Update JSON with Viaje Info
    // =================================================================
    logger.info('Updating worker-specific JSON with viaje...');

    operationalData.viaje = {
      nroViaje: nroViaje,
      cliente: clienteNombre,
      ruta: '05082025-1',
      status: 'PLANIFICADO'
    };

    fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
    logger.info(`Saved viaje.nroViaje: ${nroViaje}`);

    // =================================================================
    // FINAL SUMMARY
    // =================================================================
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('='.repeat(80));
    logger.info('STEP 6: PLANIFICAR VIAJE COMPLETE!');
    logger.info('='.repeat(80));
    logger.info(`Execution Time: ${executionTime}s`);
    logger.info('');
    logger.info('Viaje Details:');
    logger.info(`   Nro Viaje: ${nroViaje}`);
    logger.info(`   Cliente: ${clienteNombre}`);
    logger.info(`   Ruta: 05082025-1`);
    logger.info(`   Status: PLANIFICADO`);
    logger.info('='.repeat(80));
  });
});