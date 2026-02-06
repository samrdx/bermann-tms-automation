import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { LoginPage } from '../../../../../src/modules/auth/pages/LoginPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import path from 'path';

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
  test.setTimeout(90000);

  test('Should planificar a new Viaje using entities from JSON', async ({
    page,
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
    if (!operationalData.contratoCliente?.id) {
      throw new Error(
        'Cliente Contract not found!\n' +
        'Run Step 5.5 first: npm run test:contrato2cliente'
      );
    }

    logger.info('Loaded entities:');
    logger.info(`   Cliente: ${operationalData.cliente.nombre}`);
    logger.info(`   Cliente Contract ID: ${operationalData.contratoCliente.id}`);
    logger.info(`   Transportista: ${operationalData.transportista.nombre}`);
    logger.info(`   Vehiculo: ${operationalData.vehiculo.patente}`);
    logger.info(`   Conductor: ${operationalData.conductor.nombre} ${operationalData.conductor.apellido}`);
    logger.info('');

    // Test data
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    const clienteNombre = operationalData.cliente.nombre;

    logger.info(`Generated Nro Viaje: ${nroViaje}`);

    // =================================================================
    // PHASE 1: Login with arivas
    // =================================================================
    await test.step('Phase 1: Login', async () => {
      logger.info('PHASE 1: Login');
      const loginPage = new LoginPage(page);
      await loginPage.loginAndWaitForDashboard('arivas', 'arivas');
      logger.info('Login successful with arivas credentials');
    });

    // =================================================================
    // PHASE 2: Navigate to Planificar Viajes
    // =================================================================
    await test.step('Phase 2: Navigate', async () => {
      logger.info('PHASE 2: Navigate to Planificar Viajes');
      await viajesPlanificarPage.navigate();
      logger.info('Navigation successful');
    });

    // =================================================================
    // PHASE 3: Fill Form with dynamic data
    // =================================================================
    await test.step('Phase 3: Fill Form', async () => {
      logger.info('PHASE 3: Fill Complete Viaje Form');

      // Basic info
      await viajesPlanificarPage.fillNroViaje(nroViaje);
      await viajesPlanificarPage.selectTipoOperacion('tclp2210');

      // Dynamic cliente from JSON
      // Use first word for partial match (Dropdown often abbreviates names, e.g. "CAMINO SPA")
      const clientePartial = clienteNombre.split(' ')[0];
      logger.info(`Selecting Cliente: ${clientePartial} (derived from ${clienteNombre})`);
      await viajesPlanificarPage.selectCliente(clientePartial);

      await viajesPlanificarPage.selectTipoServicio('tclp2210');
      await viajesPlanificarPage.selectTipoViaje('1');
      await viajesPlanificarPage.selectUnidadNegocio('1');
      // Updated Cargo 19 text based on logs (was CONT-Bobinas-Sider14)
      await viajesPlanificarPage.selectCodigoCarga('Pallet_Furgon_Frio_10ton');

      // Route modal - uses Route 715 linked to contracts
      await viajesPlanificarPage.agregarRuta('05082025-1');

      // Origen and Destino are auto-filled by Route selection (per user instruction)
      // await viajesPlanificarPage.selectOrigen('1_agunsa_lampa_RM');
      // await viajesPlanificarPage.selectDestino('225_Starken_Sn Bernardo');

      logger.info('Form filled completely');
    });

    // =================================================================
    // PHASE 4: Save Viaje
    // =================================================================
    await test.step('Phase 4: Save', async () => {
      logger.info('PHASE 4: Save Viaje');
      await viajesPlanificarPage.clickGuardar();
      logger.info('Save clicked');
    });

    // =================================================================
    // PHASE 5: Verification
    // =================================================================
    await test.step('Phase 5: Verify', async () => {
      logger.info('PHASE 5: Verification');

      const isSaved = await viajesPlanificarPage.isFormSaved();
      expect(isSaved).toBeTruthy();

      const foundInAsignar = await viajesPlanificarPage.verifyInAsignar(nroViaje);

      if (foundInAsignar) {
        logger.info(`Viaje ${nroViaje} verified in /viajes/asignar`);
      } else {
        logger.warn(`Viaje ${nroViaje} not found in /viajes/asignar`);
      }

      expect(foundInAsignar).toBe(true);
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

    // Store for potential next steps
    process.env.CREATED_VIAJE_NRO = nroViaje;
  });
});
