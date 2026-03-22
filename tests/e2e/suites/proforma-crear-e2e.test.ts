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

interface CreatedEntities {
  transportista: string;
  cliente: string;
  vehiculo: string;
  conductor: string;
  contratoVenta: string;
  contratoCosto: string;
  viaje: string;
}

const logger = createLogger('ProformaCrearE2ETest');
const PROFORMA_ID_REGEX = /^\d+$/;
let proformaId = 'N/A';
let createdEntities: CreatedEntities;

test.describe('[E2E] Finanzas - Proforma (Atomico)', () => {
  test.setTimeout(600000);

  test('Flujo E2E Completo Atomico - PROFORMAR VIAJE FINALIZADO', async ({ page }, testInfo) => {
    const startTime = Date.now();

    await allure.epic('TMS E2E Flow');
    await allure.feature('Modulo Finanzas');
    await allure.story('Crear Viaje -> Finalizar -> Crear Proforma');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    logger.fase(1, 'Preparacion de Datos (API)');
    const api = new TmsApiClient(page);
    await api.initialize();

    const transName = NamingHelper.getTransportistaName().nombre;
    const cliName = NamingHelper.getClienteName().nombre;
    const nroViaje = String(Math.floor(100000 + Math.random() * 900000));

    logger.subpaso(`📦 Setup: Transportista=[${transName}] Cliente=[${cliName}] Viaje=[${nroViaje}]`);

    const transportistaId = await api.createTransportista(transName, generateValidChileanRUT());
    const clienteId = await api.createCliente(cliName);
    const patente = await api.createVehiculo(transName);
    const conductor = await api.createConductor(transName);

    entityTracker.register({ type: 'Transportista', name: transName });
    entityTracker.register({ type: 'Cliente', name: cliName });

    const contratoVenta = await api.createContratoVenta(cliName);
    const contratoCosto = await api.createContratoCosto(transName);

    await test.step('Validar entidades base creadas antes del flujo Proforma', async () => {
      expect(transportistaId, `Transportista no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(clienteId, `Cliente no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoVenta, `Contrato venta no creado correctamente para ${cliName}`).toMatch(/^\d+$/);
      expect(contratoCosto, `Contrato costo no creado correctamente para ${transName}`).toMatch(/^\d+$/);
      expect(patente, `Patente de vehiculo inválida para ${transName}`).toBeTruthy();
      expect(conductor, `Conductor inválido para ${transName}`).toBeTruthy();
    });

    createdEntities = {
      transportista: transName,
      cliente: cliName,
      vehiculo: patente,
      conductor,
      contratoVenta,
      contratoCosto,
      viaje: nroViaje,
    };

    logger.info('🧹 Estabilizando navegador y limpiando overlays...');
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded'),
      page.evaluate(() => {
        document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
        document.body?.classList.remove('modal-open');
      }),
    ]);
    await page.waitForTimeout(1500);

    await api.createViaje(cliName, nroViaje);
    logger.success(`Viaje [${nroViaje}] planificado.`);

    logger.fase(2, `Asignacion del Viaje [${nroViaje}]`);
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

    await page.waitForTimeout(2000);
    logger.success(`Viaje [${nroViaje}] asignado.`);

    logger.fase(3, 'Finalizar Viaje');
    const monitoreo = new MonitoreoPage(page);
    await monitoreo.navegar();
    await monitoreo.finalizarViaje(nroViaje);
    logger.success(`Viaje [${nroViaje}] finalizado.`);

    logger.fase(4, 'Generacion de Proforma');
    const proformaPage = new PrefacturaPage(page);

    await test.step('Navegar a /proforma/crear y filtrar por transportista', async () => {
      await proformaPage.navigateToProformaCrear();
      await proformaPage.filtrarViajesPorTransportista(transName);
    });

    await test.step('Validar Guardar deshabilitado sin viajes seleccionados', async () => {
      await proformaPage.assertGuardarDisabledWithoutViajes();
    });

    await test.step('Generar Proforma', async () => {
      await proformaPage.generarProforma();
    });

    await test.step('Verificar Proforma en /proforma/index', async () => {
      proformaId = await proformaPage.buscarProformaEnIndexPorTransportista(transName);
      entityTracker.register({
        type: 'Proforma',
        name: 'Creada',
        id: proformaId,
        extra: `Transportista: ${transName}`,
      });
      expect(
        proformaId,
        `ID de proforma invalido para transportista ${transName}. Debe cumplir ${PROFORMA_ID_REGEX}`,
      ).toMatch(PROFORMA_ID_REGEX);
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const browser = testInfo.project.name.toUpperCase();
    const summaryText = entityTracker.getSummaryTable(browser);

    await testInfo.attach('📊 Resumen de Entidades Creadas', {
      body: summaryText,
      contentType: 'text/plain',
    });

    await allure.parameter('Transportista', createdEntities.transportista);
    await allure.parameter('Cliente', createdEntities.cliente);
    await allure.parameter('Vehiculo', createdEntities.vehiculo);
    await allure.parameter('Contrato Venta', createdEntities.contratoVenta);
    await allure.parameter('Contrato Costo', createdEntities.contratoCosto);
    await allure.parameter('Viaje', createdEntities.viaje);
    await allure.parameter('Proforma ID', proformaId);
    await allure.parameter('Estado Final', '✅ PROFORMADO');
    await allure.parameter('Duracion (s)', executionTime);

    logger.success('🎉 Proceso de Proforma finalizado correctamente');
    logger.info(summaryText);
    logger.info(`⏱️ Tiempo total: ${executionTime}s`);
  });
});
