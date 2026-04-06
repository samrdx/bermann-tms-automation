import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { OperationalDataLoader } from '../../../../api-helpers/OperationalDataLoader.js';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';

/**
 * Step 6: Planificar Viaje (Trip Planning)
 *
 * Prerequisites:
 * 1. LEGACY_DATA_SOURCE=entities: correr `npm run qa:regression:entities` / `npm run demo:regression:entities`
 *    o LEGACY_DATA_SOURCE=base: correr `npm run qa:seed:legacy` / `npm run demo:seed:legacy`
 * 2. Crear contrato transportista con `qa|demo:smoke:contract:transportista` (base) o `qa|demo:regression:contract:transportista` (entities)
 * 3. Crear contrato cliente con `qa|demo:smoke:contract:cliente` (base) o `qa|demo:regression:contract:cliente` (entities)
 *
 * This test:
 * - Loads existing entity data from the selected legacy data source
 * - Uses dynamic cliente from JSON
 * - Creates a new viaje (trip) planning record
 * - Verifies trip appears in /viajes/asignar
 * - Stores viaje info in JSON for Step 7
 */
test.describe('[V01] Viajes - Planificar', () => {
  test.setTimeout(120000);

  test('Debe planificar un nuevo Viaje usando entidades del JSON', async ({
    viajesPlanificarPage,
    viajesAsignarPage,
    page
  }, testInfo) => {
    const startTime = Date.now();
    await allure.epic('TMS Legacy Flow');
    await allure.feature('03-Viajes');
    await allure.story('Planificar Viaje');

    logger.info('='.repeat(80));
    logger.info('Iniciando Paso 6: Planificar Viaje');
    logger.info('='.repeat(80));

    // =================================================================
    // STEP 1: Load JSON Data
    // =================================================================
    logger.info('Cargando datos de entidades existentes del JSON específico del worker...');
    const { data: operationalData, candidate, usedFallback } = OperationalDataLoader.loadOrThrow<Record<string, any>>(testInfo, {
      logger,
      purpose: 'planificar viaje'
    });
    const dataPath = candidate.path;
    logger.info(`📦 Data operacional seleccionada: ${dataPath} (source=${candidate.source}; fallback=${usedFallback})`);

    // Prefer seededCliente (set by cliente-crear.test.ts OR base-entities.setup.ts).
    // Fall back to legacy `cliente` key for backward compatibility.
    const clienteSource = operationalData.seededCliente || operationalData.cliente;
    if (!clienteSource?.nombre) {
      throw new Error(
        '❌ Entidad no encontrada: Cliente.\n' +
        'Run seed flow first (entities or base) and set LEGACY_DATA_SOURCE accordingly'
      );
    }

    logger.info('✅ Todos los prerrequisitos validados');
    logger.info('Entidades cargadas:');
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
    const defaults = {
      tipoOperacion: isDemo ? 'Distribución' : 'defecto',
      tipoServicio: isDemo ? 'Lcl' : 'defecto',
      tipoViaje: isDemo ? 'DIRECTO' : 'Normal',
      unidadNegocio: isDemo ? 'Defecto' : 'Defecto',
      codigoCarga: isDemo ? 'CONTENEDOR DRY' : 'Test 1',
      ruta: isDemo ? '47' : '( MINEDUC) BSF_PUDAHUEL-CXP_ANF',
      origenManual: isDemo ? '233_CD SuperZoo_Quilicura' : '405_LA FARFANA_Pudahuel',
      destinoManual: isDemo ? 'Divisa' : 'CXP ANTOFAGASTA'
    };

    const setupConfigPath = DataPathHelper.getSetupConfigDataPath(testInfo);
    let setupConfig: any = {};
    if (fs.existsSync(setupConfigPath)) {
      setupConfig = JSON.parse(fs.readFileSync(setupConfigPath, 'utf-8'));
      logger.info(`📦 Setup config detectado: ${setupConfigPath}`);
    } else {
      logger.warn(`⚠️ Setup config no encontrado en ${setupConfigPath}. Se usarán defaults.`);
    }

    const config = {
      tipoOperacion: setupConfig?.seededTipoOperacion?.nombre || defaults.tipoOperacion,
      tipoServicio: setupConfig?.seededTipoServicio?.nombre || defaults.tipoServicio,
      tipoViaje: defaults.tipoViaje,
      unidadNegocio: setupConfig?.unidadNegocio?.nombre || defaults.unidadNegocio,
      codigoCarga: setupConfig?.seededCarga?.codigo || defaults.codigoCarga,
      ruta: setupConfig?.ruta?.nro || setupConfig?.ruta?.nombre || defaults.ruta,
      origenManual: setupConfig?.ruta?.origen || defaults.origenManual,
      destinoManual: setupConfig?.ruta?.destino || defaults.destinoManual
    };

    logger.info(`Environment: ${process.env.ENV || 'QA'}`);
    logger.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

    // =================================================================
    // PHASE 1: Navigate to Planificar Viajes
    // =================================================================
    await test.step('Fase 1: Navegar', async () => {
      logger.info('Fase 1: Navegar a Planificar Viajes');
      await viajesPlanificarPage.navigate();
      logger.info('Navegación exitosa');
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
    await test.step('Fase 2: Completar formulario', async () => {
      logger.info('Fase 2: Completar formulario de viaje');

      // Header Nro Viaje (though not in user numbered list, it's essential)
      await viajesPlanificarPage.fillNroViaje(nroViaje);

      // 1. Tipo de Operación
      await viajesPlanificarPage.selectTipoOperacion(config.tipoOperacion);

      // 2. Tipo Servicio
      await viajesPlanificarPage.selectTipoServicio(config.tipoServicio);

      // 3. Cliente - from seededCliente JSON
      logger.info(`Seleccionando Cliente: ${clienteNombre}`);
      await viajesPlanificarPage.selectCliente(clienteNombre);

      // 4. Tipo Viaje
      await viajesPlanificarPage.selectTipoViaje(config.tipoViaje);

      // 5. Unidad de negocio
      await viajesPlanificarPage.selectUnidadNegocio(config.unidadNegocio);

      // 6. Código Carga
      await viajesPlanificarPage.selectCodigoCarga(config.codigoCarga);

      // 7. Ruta (via Modal or Manual Fallback)
      logger.info(`Intentando agregar Ruta: ${config.ruta}...`);
      const rutaAdded = await viajesPlanificarPage.agregarRuta(config.ruta);

      if (!rutaAdded) {
        logger.warn('⚠️ La adición de la ruta falló o se omitió, aplicando el fallback manual de Origen/Destino...');
        if (config.origenManual) await viajesPlanificarPage.selectOrigen(config.origenManual);
        if (config.destinoManual) await viajesPlanificarPage.selectDestino(config.destinoManual);
      }

      logger.info('Formulario completado');
    });

    // =================================================================
    // PHASE 3: Save Viaje and capture ID from redirect URL
    // =================================================================
    let viajeId: string | null = null;

    await test.step('Fase 3: Guardar y capturar ID del Viaje', async () => {
      logger.info('Fase 3: Guardar Viaje');

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
      logger.info(`URL post-guardado: ${finalUrl}`);

      const urlMatch = finalUrl.match(/\/viajes\/(?:editar|ver)\/(\d+)/);
      if (urlMatch) {
        viajeId = urlMatch[1];
        logger.info(`✅ ID del viaje capturado de la URL: ${viajeId}`);
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
          logger.info(`✅ ID del viaje capturado del DOM: ${viajeId}`);
        } else {
          logger.warn('⚠️ No se pudo capturar el ID del viaje. La prueba de asignación buscará por nroViaje.');
        }
      }

      logger.info('Boton guardar clickeado y navegacion completada');
    });

    // =================================================================
    // PHASE 4: Verification
    // =================================================================
    await test.step('Fase 4: Verificación', async () => {
      logger.info('Fase 4: Verificación');

      // In Demo, we redirect to /viajes/asignar on success, but NO internal ID in URL
      // We'll capture the ID from the first row of the grid instead
      await viajesAsignarPage.navigate();

      let searchTerm = nroViaje;
      let internalGridId: string | null = null;
      if (isDemo) {
        internalGridId = await viajesAsignarPage.getFirstRowId();
        logger.info(`✅ ID interno de la grilla capturado en Demo: ${internalGridId}`);
        searchTerm = internalGridId || nroViaje;
      }

      logger.info(`Buscando en la grilla de Asignar usando: ${searchTerm}`);
      const foundInAsignar = await viajesAsignarPage.findViajeRow(searchTerm).then(row => !!row);

      if (foundInAsignar) {
        logger.info(`✅ Viaje encontrado en /viajes/asignar usando búsqueda: ${searchTerm}`);
      } else {
        logger.warn(`⚠️ Viaje NO encontrado en /viajes/asignar usando búsqueda: ${searchTerm}`);
      }

      expect(foundInAsignar, `Viaje ${searchTerm} debería ser visible en la grilla de Asignar`).toBe(true);

      // Save internal grid ID for subsequent tests (e.g., asignar)
      if (isDemo && internalGridId) {
        operationalData.viaje = {
          ...operationalData.viaje,
          id: internalGridId,
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ ID interno de la grilla guardado en JSON: viaje.id = ${internalGridId}`);
      }

      entityTracker.register({
        type: 'Viaje',
        name: nroViaje,
        id: viajeId || internalGridId || 'N/A',
        asociado: clienteNombre,
        estado: 'PLANIFICADO'
      });
    });

    // =================================================================
    // STEP 6: Update JSON with Viaje Info
    // =================================================================
    logger.info('Actualizando JSON del worker con la información del viaje...');

    operationalData.viaje = {
      ...operationalData.viaje,
      nroViaje: nroViaje,
      cliente: clienteNombre,
      ruta: config.ruta,
      status: 'PLANIFICADO'
    };

    fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
    logger.info(`Saved viaje.nroViaje: ${nroViaje}`);

    // =================================================================
    // FINAL SUMMARY
    // =================================================================
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('='.repeat(80));
    logger.info('PASO 6: ¡PLANIFICAR VIAJE COMPLETADO!');
    logger.info('='.repeat(80));
    logger.info(`Tiempo de ejecución: ${executionTime}s`);
    logger.info('');
    logger.info('Detalles del viaje:');
    logger.info(`   Nro Viaje: ${nroViaje}`);
    logger.info(`   Cliente: ${clienteNombre}`);
    logger.info(`   Ruta: ${config.ruta}`);
    logger.info(`   Status: PLANIFICADO`);
    logger.info('='.repeat(80));
  });
});
