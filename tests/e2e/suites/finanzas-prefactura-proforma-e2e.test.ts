import { test, expect } from '../../../src/fixtures/base.js';
import { MonitoreoPage } from '../../../src/modules/monitoring/pages/MonitoreoPage.js';
import { PrefacturaPage } from '../../../src/modules/finanzas/PrefacturaPage.js';
import { AsignarPage } from '../../../src/modules/planning/pages/AsignarPage.js';
import { TmsApiClient } from '../../api-helpers/TmsApiClient.js';
import { createLogger } from '../../../src/utils/logger.js';
import { generateValidChileanRUT } from '../../../src/utils/rutGenerator.js';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../src/utils/entityTracker.js';
import { NamingHelper } from '../../../src/utils/NamingHelper.js';

const logger = createLogger('FinanzasPrefacturaProformaE2E');
const PROFORMA_ID_REGEX = /^\d+$/;

/**
 * Flujo crítico happy path para el gate principal de PR en V1.
 *
 * Esta suite genera su propio ecosistema por UI automatizada y valida la cadena:
 * entidades -> contratos -> viaje -> asignación -> finalización -> prefactura -> proforma.
 * No depende de archivos de seed compartidos: construye su contexto de negocio de forma autónoma a través de flujos UI.
 */
test.describe('[E2E] Finanzas - Prefactura + Proforma (Mismo Viaje)', () => {
  test.setTimeout(720000);

  test('Flujo encadenado: Finalizar viaje -> Prefactura -> Proforma', async ({ page }, testInfo) => {
    const startTime = Date.now();

    await allure.epic('TMS V1 PR Gate');
    await allure.feature('Flujo crítico operativo-financiero');
    await allure.story('Entidades -> Contratos -> Viaje -> Prefactura -> Proforma');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    const runToken = (process.env.GITHUB_RUN_ID || `${Date.now()}`).slice(-6);
    const transName = `${NamingHelper.getTransportistaName().nombre}_${runToken}`;
    const cliName = `${NamingHelper.getClienteName().nombre}_${runToken}`;
    const nroViaje = String(Math.floor(100000 + Math.random() * 900000));

    let transportistaId = '';
    let clienteId = '';
    let patente = '';
    let conductor = '';
    let contratoVenta = '';
    let contratoCosto = '';

    logger.info(`🧱 Contexto inicial del flujo: Transportista="${transName}" | Cliente="${cliName}" | Viaje="${nroViaje}"`);
    await allure.parameter('Transportista', transName);
    await allure.parameter('Cliente', cliName);
    await allure.parameter('Nro Viaje', nroViaje);

    await test.step('Fase 1 — Preparar ecosistema (entidades + contratos)', async () => {
      logger.fase(1, 'Preparación de ecosistema (UI seed)');
      const seed = new TmsApiClient(page);
      await seed.initialize();

      transportistaId = await seed.createTransportista(transName, generateValidChileanRUT());
      clienteId = await seed.createCliente(cliName);
      patente = await seed.createVehiculo(transName);
      conductor = await seed.createConductor(transName);
      contratoVenta = await seed.createContratoVenta(cliName, clienteId);
      contratoCosto = await seed.createContratoCosto(transName, transportistaId);

      await allure.parameter('Patente', patente);
      await allure.parameter('Conductor', conductor);
      await allure.parameter('Contrato Venta ID', contratoVenta);
      await allure.parameter('Contrato Costo ID', contratoCosto);

      await testInfo.attach('📦 Contexto inicial del flujo', {
        body: JSON.stringify({
          ambiente: process.env.ENV || 'QA',
          transportista: transName,
          cliente: cliName,
          nroViaje,
          transportistaId,
          clienteId,
          patente,
          conductor,
          contratoVenta,
          contratoCosto,
        }, null, 2),
        contentType: 'application/json',
      });

      expect(transportistaId, `Falló en Fase 1: Transportista no creado para ${transName}`).toMatch(/^\d+$/);
      expect(clienteId, `Falló en Fase 1: Cliente no creado para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoVenta, `Falló en Fase 1: Contrato venta no creado para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoCosto, `Falló en Fase 1: Contrato costo no creado para ${transName}`).toMatch(/^\d+$/);
      expect(patente, `Falló en Fase 1: Patente inválida para ${transName}`).toBeTruthy();
      expect(conductor, `Falló en Fase 1: Conductor inválido para ${transName}`).toBeTruthy();

      logger.info(`🧭 Planificando viaje [${nroViaje}] usando cliente ID [${clienteId}] para evitar selección stale.`);
      await seed.createViaje(cliName, nroViaje, clienteId);
      logger.success(`Viaje [${nroViaje}] planificado.`);
    });

    await test.step('Fase 2 — Asignar y finalizar viaje', async () => {
      logger.fase(2, 'Asignar y finalizar viaje');
      logger.info(`🚚 Iniciando asignación del viaje "${nroViaje}" con transportista="${transName}", vehículo="${patente}" y conductor="${conductor}"`);
      const asignarPage = new AsignarPage(page);
      await asignarPage.navigate();
      await asignarPage.assignViaje(nroViaje, {
        transportista: transName,
        vehiculoPrincipal: patente,
        conductor,
      });

      const monitoreo = new MonitoreoPage(page);
      await monitoreo.navegar();
      await monitoreo.finalizarViaje(nroViaje);
      logger.success(`Viaje [${nroViaje}] finalizado.`);
    });

    const finanzasPage = new PrefacturaPage(page);
    let prefacturaId = 'N/A';
    let proformaId = 'N/A';

    await test.step('Fase 3 — Generar Prefactura', async () => {
      logger.fase(3, 'Crear Prefactura del mismo viaje');
      logger.info(`🧾 Iniciando generación de prefactura para cliente "${cliName}" y viaje "${nroViaje}"`);
      await finanzasPage.navigateToCrear();
      await finanzasPage.filtrarViajesPorCliente(cliName);
      await finanzasPage.generarPrefactura();
      prefacturaId = await finanzasPage.buscarPrefacturaEnIndex(cliName);
      expect(prefacturaId, `Falló en Fase 3: ID de prefactura inválido para cliente ${cliName}`).toMatch(/^\d+$/);
    });
    await allure.parameter('Prefactura ID', prefacturaId);

    await test.step('Fase 4 — Generar Proforma', async () => {
      logger.fase(4, 'Crear Proforma del mismo viaje');
      logger.info(`🧾 Iniciando generación de proforma para transportista "${transName}" y viaje "${nroViaje}"`);
      await finanzasPage.navigateToProformaCrear();
      await finanzasPage.filtrarViajesPorTransportista(transName);
      await finanzasPage.assertGuardarDisabledWithoutViajes();
      await finanzasPage.generarProforma();
      proformaId = await finanzasPage.buscarProformaEnIndexPorTransportista(transName);
      expect(
        proformaId,
        `Falló en Fase 4: ID de proforma inválido para transportista ${transName}. Debe cumplir ${PROFORMA_ID_REGEX}`,
      ).toMatch(PROFORMA_ID_REGEX);
    });
    await allure.parameter('Proforma ID', proformaId);

    entityTracker.register({ type: 'Prefactura', name: 'Creada', id: prefacturaId, extra: `Viaje: ${nroViaje}` });
    entityTracker.register({ type: 'Proforma', name: 'Creada', id: proformaId, extra: `Viaje: ${nroViaje}` });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const browser = testInfo.project.name.toUpperCase();
    const summaryText = entityTracker.getSummaryTable(browser);

    await testInfo.attach('📊 Resumen flujo encadenado', {
      body: summaryText,
      contentType: 'text/plain',
    });

    await testInfo.attach('📋 Resultado final del flujo crítico', {
      body: JSON.stringify({
        ambiente: process.env.ENV || 'QA',
        transportista: transName,
        cliente: cliName,
        nroViaje,
        patente,
        conductor,
        contratoVenta,
        contratoCosto,
        prefacturaId,
        proformaId,
        duracionSegundos: executionTime,
      }, null, 2),
      contentType: 'application/json',
    });

    await allure.parameter('Estado Final', '✅ PREFACTURA + PROFORMA');
    await allure.parameter('Duracion (s)', executionTime);

    logger.success('🎯 Flujo encadenado completado: Prefactura + Proforma del mismo viaje');
    logger.info(summaryText);
  });
});
