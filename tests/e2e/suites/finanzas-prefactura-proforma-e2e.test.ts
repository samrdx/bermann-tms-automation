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
 * No depende de archivos de seed compartidos: construye su contexto de negocio de forma autónoma.
 */
test.describe('[E2E] Finanzas - Prefactura + Proforma (Mismo Viaje)', () => {
  test.setTimeout(720000);

  test('Flujo encadenado: Finalizar viaje -> Prefactura -> Proforma', async ({ page }, testInfo) => {
    const startTime = Date.now();

    await allure.epic('TMS V1 PR Gate');
    await allure.feature('Flujo crítico operativo-financiero');
    await allure.story('Entidades -> Contratos -> Viaje -> Prefactura -> Proforma');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    logger.fase(1, 'Preparación de ecosistema (UI seed)');
    const api = new TmsApiClient(page);
    await api.initialize();

    const runToken = (process.env.GITHUB_RUN_ID || `${Date.now()}`).slice(-6);
    const transName = `${NamingHelper.getTransportistaName().nombre}_${runToken}`;
    const cliName = `${NamingHelper.getClienteName().nombre}_${runToken}`;
    const nroViaje = String(Math.floor(100000 + Math.random() * 900000));

    logger.info(`🧱 Contexto inicial del flujo: Transportista="${transName}" | Cliente="${cliName}" | Viaje="${nroViaje}"`);
    await allure.parameter('Transportista', transName);
    await allure.parameter('Cliente', cliName);
    await allure.parameter('Nro Viaje', nroViaje);

    const transportistaId = await api.createTransportista(transName, generateValidChileanRUT());
    const clienteId = await api.createCliente(cliName);
    const patente = await api.createVehiculo(transName);
    const conductor = await api.createConductor(transName);
    const contratoVenta = await api.createContratoVenta(cliName, clienteId);
    const contratoCosto = await api.createContratoCosto(transName, transportistaId);

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

    await test.step('Validar entidades base creadas antes del flujo encadenado', async () => {
      expect(transportistaId, `Transportista no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(clienteId, `Cliente no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoVenta, `Contrato venta no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoCosto, `Contrato costo no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(patente, `Patente de vehiculo inválida para ${transName}`).toBeTruthy();
      expect(conductor, `Conductor inválido para ${transName}`).toBeTruthy();
    });

    logger.info(`🧭 Planificando viaje [${nroViaje}] usando cliente ID [${clienteId}] para evitar selección stale.`);
    await api.createViaje(cliName, nroViaje, clienteId);
    logger.success(`Viaje [${nroViaje}] planificado.`);

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

    const finanzasPage = new PrefacturaPage(page);
    let prefacturaId = 'N/A';
    let proformaId = 'N/A';

    logger.fase(3, 'Crear Prefactura del mismo viaje');
    logger.info(`🧾 Iniciando generación de prefactura para cliente "${cliName}" y viaje "${nroViaje}"`);
    await test.step('Prefactura: filtrar por cliente y generar', async () => {
      await finanzasPage.navigateToCrear();
      await finanzasPage.filtrarViajesPorCliente(cliName);
      await finanzasPage.generarPrefactura();
      prefacturaId = await finanzasPage.buscarPrefacturaEnIndex(cliName);
      expect(prefacturaId, `ID de prefactura invalido para cliente ${cliName}`).toMatch(/^\d+$/);
    });
    await allure.parameter('Prefactura ID', prefacturaId);

    logger.fase(4, 'Crear Proforma del mismo viaje');
    logger.info(`🧾 Iniciando generación de proforma para transportista "${transName}" y viaje "${nroViaje}"`);
    await test.step('Proforma: filtrar por transportista y generar', async () => {
      await finanzasPage.navigateToProformaCrear();
      await finanzasPage.filtrarViajesPorTransportista(transName);
      await finanzasPage.assertGuardarDisabledWithoutViajes();
      await finanzasPage.generarProforma();
      proformaId = await finanzasPage.buscarProformaEnIndexPorTransportista(transName);
      expect(
        proformaId,
        `ID de proforma invalido para transportista ${transName}. Debe cumplir ${PROFORMA_ID_REGEX}`,
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
