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

test.describe('[E2E] Finanzas - Prefactura + Proforma (Mismo Viaje)', () => {
  test.setTimeout(720000);

  test('Flujo encadenado: Finalizar viaje -> Prefactura -> Proforma', async ({ page }, testInfo) => {
    const startTime = Date.now();

    await allure.epic('TMS E2E Flow');
    await allure.feature('Modulo Finanzas');
    await allure.story('Finalizar viaje -> Prefactura -> Proforma (mismo viaje)');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    logger.fase(1, 'Preparacion de Datos (API)');
    const api = new TmsApiClient(page);
    await api.initialize();

    const transName = NamingHelper.getTransportistaName().nombre;
    const cliName = NamingHelper.getClienteName().nombre;
    const nroViaje = String(Math.floor(100000 + Math.random() * 900000));

    const transportistaId = await api.createTransportista(transName, generateValidChileanRUT());
    const clienteId = await api.createCliente(cliName);
    const patente = await api.createVehiculo(transName);
    const conductor = await api.createConductor(transName);
    const contratoVenta = await api.createContratoVenta(cliName);
    const contratoCosto = await api.createContratoCosto(transName);

    await test.step('Validar entidades base creadas antes del flujo encadenado', async () => {
      expect(transportistaId, `Transportista no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(clienteId, `Cliente no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoVenta, `Contrato venta no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoCosto, `Contrato costo no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(patente, `Patente de vehiculo inválida para ${transName}`).toBeTruthy();
      expect(conductor, `Conductor inválido para ${transName}`).toBeTruthy();
    });

    await api.createViaje(cliName, nroViaje);
    logger.success(`Viaje [${nroViaje}] planificado.`);

    logger.fase(2, 'Asignar y finalizar viaje');
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    await asignarPage.assignViaje(nroViaje, {
      transportista: transName,
      vehiculoPrincipal: patente,
      conductor,
    });

    const btnConfirmar = page.locator('.bootbox-accept, button:has-text("Aceptar")').first();
    if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnConfirmar.click();
    }

    const monitoreo = new MonitoreoPage(page);
    await monitoreo.navegar();
    await monitoreo.finalizarViaje(nroViaje);
    logger.success(`Viaje [${nroViaje}] finalizado.`);

    const finanzasPage = new PrefacturaPage(page);
    let prefacturaId = 'N/A';
    let proformaId = 'N/A';

    logger.fase(3, 'Crear Prefactura del mismo viaje');
    await test.step('Prefactura: filtrar por cliente y generar', async () => {
      await finanzasPage.navigateToCrear();
      await finanzasPage.filtrarViajesPorCliente(cliName);
      await finanzasPage.generarPrefactura();
      prefacturaId = await finanzasPage.buscarPrefacturaEnIndex(cliName);
      expect(prefacturaId, `ID de prefactura invalido para cliente ${cliName}`).toMatch(/^\d+$/);
    });

    logger.fase(4, 'Crear Proforma del mismo viaje');
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

    entityTracker.register({ type: 'Prefactura', name: 'Creada', id: prefacturaId, extra: `Viaje: ${nroViaje}` });
    entityTracker.register({ type: 'Proforma', name: 'Creada', id: proformaId, extra: `Viaje: ${nroViaje}` });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const browser = testInfo.project.name.toUpperCase();
    const summaryText = entityTracker.getSummaryTable(browser);

    await testInfo.attach('📊 Resumen flujo encadenado', {
      body: summaryText,
      contentType: 'text/plain',
    });

    await allure.parameter('Transportista', transName);
    await allure.parameter('Cliente', cliName);
    await allure.parameter('Contrato Venta', contratoVenta);
    await allure.parameter('Contrato Costo', contratoCosto);
    await allure.parameter('Viaje', nroViaje);
    await allure.parameter('Prefactura ID', prefacturaId);
    await allure.parameter('Proforma ID', proformaId);
    await allure.parameter('Estado Final', '✅ PREFACTURA + PROFORMA');
    await allure.parameter('Duracion (s)', executionTime);

    logger.success('🎯 Flujo encadenado completado: Prefactura + Proforma del mismo viaje');
    logger.info(summaryText);
  });
});
