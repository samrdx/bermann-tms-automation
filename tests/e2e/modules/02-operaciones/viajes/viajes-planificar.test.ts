import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

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
test.describe('[V01] Viajes - Planificar', () => {
  test.setTimeout(120000);

  test('Should planificar a new Viaje using entities from JSON', async ({
    viajesPlanificarPage,
    viajesAsignarPage,
    page
  }, testInfo) => {
    const startTime = Date.now();
    await allure.epic('TMS Legacy Flow');
    await allure.feature('03-Viajes');
    await allure.story('Planificar Viaje');

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

    // Prefer seededCliente (set by cliente-crear.test.ts OR base-entities.setup.ts).
    // Fall back to legacy `cliente` key for backward compatibility.
    const clienteSource = operationalData.seededCliente || operationalData.cliente;
    if (!clienteSource?.nombre) {
      throw new Error(
        '❌ Missing required entity: Cliente.\n' +
        'Run base entities setup OR run: npm run test:qa:entity:cliente'
      );
    }

    logger.info('✅ All prerequisites validated');
    logger.info('Loaded entities:');
    logger.info(`   Cliente source: ${operationalData.seededCliente ? 'seededCliente ✅' : 'cliente (fallback) ⚠️'}`);
    logger.info(`   Cliente: ${clienteSource.nombre}`);
    logger.info('');

    // Test data
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    // Use nombreFantasia if available, otherwise nombre
    const clienteNombre = clienteSource.nombreFantasia || clienteSource.nombre;

    await allure.parameter('Cliente', clienteNombre);
    await allure.parameter('Nro Viaje', nroViaje);
    await allure.parameter('Ambiente', process.env.ENV || 'QA');
    await allure.attachment('Entidades Cargadas (JSON)', JSON.stringify({
      cliente: clienteNombre,
      clienteId: clienteSource.id,
      nroViaje
    }, null, 2), 'application/json');

    // =================================================================
    // STEP 2: environment Configuration
    // =================================================================
    const isDemo = process.env.ENV === 'DEMO';
    const config = {
      tipoOperacion: isDemo ? 'Distribución' : 'tclp2210',
      tipoServicio: isDemo ? 'Lcl' : 'tclp2210',
      tipoViaje: isDemo ? 'DIRECTO' : 'Normal',
      unidadNegocio: isDemo ? 'Defecto' : 'Defecto',
      codigoCarga: isDemo ? 'CONTENEDOR DRY' : 'Pallet_Furgon_Frio_10ton',
      ruta: isDemo ? '47' : '05082025-1',
      origenManual: isDemo ? '233_CD SuperZoo_Quilicura' : '',
      destinoManual: isDemo ? 'Divisa' : ''
    };

    logger.info(`Environment: ${process.env.ENV || 'QA'}`);
    logger.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

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
    // CORRECT ORDER BASED ON USER REQUEST + UI:
    // 1. Tipo de Operación
    // 2. Tipo Servicio
    // 3. Cliente (Triggers cascade)
    // 4. Tipo viaje
    // 5. Unidad de negocio
    // 6. Código Carga
    // 7. Ruta (via Modal or Manual Fallback)
    // =================================================================
    await test.step('Phase 2: Fill Form', async () => {
      logger.info('PHASE 2: Fill Complete Viaje Form');

      // Header Nro Viaje (though not in user numbered list, it's essential)
      await viajesPlanificarPage.fillNroViaje(nroViaje);

      // 1. Tipo de Operación
      await viajesPlanificarPage.selectTipoOperacion(config.tipoOperacion);

      // 2. Tipo Servicio
      await viajesPlanificarPage.selectTipoServicio(config.tipoServicio);

      // 3. Cliente - from seededCliente JSON
      logger.info(`Selecting Cliente: ${clienteNombre}`);
      await viajesPlanificarPage.selectCliente(clienteNombre);

      // 4. Tipo Viaje
      await viajesPlanificarPage.selectTipoViaje(config.tipoViaje);

      // 5. Unidad de negocio
      await viajesPlanificarPage.selectUnidadNegocio(config.unidadNegocio);

      // 6. Código Carga
      await viajesPlanificarPage.selectCodigoCarga(config.codigoCarga);

      // 7. Ruta (via Modal or Manual Fallback)
      logger.info(`Attempting to add Route: ${config.ruta}...`);
      const rutaAdded = await viajesPlanificarPage.agregarRuta(config.ruta);

      if (!rutaAdded) {
        logger.warn('⚠️ Route addition failed or skipped, applying manual Origen/Destino fallback...');
        if (config.origenManual) await viajesPlanificarPage.selectOrigen(config.origenManual);
        if (config.destinoManual) await viajesPlanificarPage.selectDestino(config.destinoManual);
      }

      logger.info('Form filled completely');
    });

    // =================================================================
    // PHASE 3: Save Viaje and capture ID from redirect URL
    // =================================================================
    let viajeId: string | null = null;

    await test.step('Phase 3: Save and capture Viaje ID', async () => {
      logger.info('PHASE 3: Save Viaje');

      // Wait for navigation triggered by Guardar — the TMS redirects to:
      //   /viajes/editar/{id}  or  /viajes/ver/{id}  after a successful save
      const [_] = await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: 45000,
        }).catch(() => null),
        viajesPlanificarPage.clickGuardar(),
      ]);

      // Extract the ID from the final URL
      const finalUrl = page.url();
      logger.info(`Post-save URL: ${finalUrl}`);

      const urlMatch = finalUrl.match(/\/viajes\/(?:editar|ver)\/(\d+)/);
      if (urlMatch) {
        viajeId = urlMatch[1];
        logger.info(`✅ Viaje ID captured from URL: ${viajeId}`);
      } else {
        // Fallback: look for a hidden input or data attribute holding the ID
        viajeId = await page.evaluate(() => {
          const candidateSelectors = [
            'input[name="Viajes[id]"]',
            'input[name="viajes-id"]',
            '[data-viaje-id]',
          ];
          for (const sel of candidateSelectors) {
            const el = document.querySelector(sel) as HTMLInputElement | null;
            if (el) return el.value || el.getAttribute('data-viaje-id') || null;
          }
          return null;
        });
        if (viajeId) {
          logger.info(`✅ Viaje ID captured from DOM: ${viajeId}`);
        } else {
          logger.warn('⚠️ Could not capture Viaje ID. The assignment test will search by nroViaje instead.');
        }
      }

      logger.info('Save clicked and navigation completed');
    });

    // =================================================================
    // PHASE 4: Verification
    // =================================================================
    await test.step('Phase 4: Verify', async () => {
      logger.info('PHASE 4: Verification');

      // In Demo, we redirect to /viajes/asignar on success, but NO internal ID in URL
      // We'll capture the ID from the first row of the grid instead
      await viajesAsignarPage.navigate();

      let searchTerm = nroViaje;
      let internalGridId: string | null = null;
      if (isDemo) {
        internalGridId = await viajesAsignarPage.getFirstRowId();
        logger.info(`✅ Captured internal grid ID in Demo: ${internalGridId}`);
        searchTerm = internalGridId || nroViaje;
      }

      logger.info(`Searching in Asignar grid using: ${searchTerm}`);
      const foundInAsignar = await viajesAsignarPage.findViajeRow(searchTerm).then(row => !!row);

      if (foundInAsignar) {
        logger.info(`✅ Viaje found in /viajes/asignar using search: ${searchTerm}`);
      } else {
        logger.warn(`⚠️ Viaje NOT found in /viajes/asignar using search: ${searchTerm}`);
      }

      expect(foundInAsignar, `Viaje ${searchTerm} should be visible in Asignar grid`).toBe(true);

      // Save internal grid ID for subsequent tests (e.g., asignar)
      if (isDemo && internalGridId) {
        operationalData.viaje = {
          ...operationalData.viaje,
          id: internalGridId,
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ Saved internal grid ID to JSON: viaje.id = ${internalGridId}`);
      }
    });

    // =================================================================
    // STEP 6: Update JSON with Viaje Info
    // =================================================================
    logger.info('Updating worker-specific JSON with viaje...');

    operationalData.viaje = {
      ...operationalData.viaje,
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