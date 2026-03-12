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

const logger = createLogger('PrefacturaCrearE2ETest');
let prefacturaId = 'N/A';
let createdEntities: any = {};

test.describe('[E2E] Finanzas - Prefactura (Atómico)', () => {
  test.setTimeout(600000); // 10 min para creación de datos + flujo de viaje + prefactura (Demo puede ser lento)

  test('Flujo E2E Completo Atómico - PREFACTURAR VIAJE FINALIZADO', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await allure.epic('TMS E2E Flow');
    await allure.feature('Modulo Finanzas');
    await allure.story('Crear Viaje → Finalizar → Crear Prefactura');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');
    logger.fase(1, 'Preparación de Datos (API)');

    const api = new TmsApiClient(page);
    await api.initialize();

    // 1. Crear Ecosistema
    const transName = NamingHelper.getTransportistaName().nombre;
    const cliName = NamingHelper.getClienteName().nombre;
    const nroViaje = String(Math.floor(100000 + Math.random() * 900000));

    logger.subpaso(`Setup: Transportista=[${transName}] Cliente=[${cliName}] Viaje=[${nroViaje}]`);

    await api.createTransportista(transName, generateValidChileanRUT());
    await api.createCliente(cliName);
    const patente = await api.createVehiculo(transName);
    const conductor = await api.createConductor(transName);

    entityTracker.register({ type: 'Transportista', name: transName });
    entityTracker.register({ type: 'Cliente', name: cliName });

    // Contratos
    const contratoVenta = await api.createContratoVenta(cliName);
    const contratoCosto = await api.createContratoCosto(transName);

    createdEntities = {
      transportista: transName,
      cliente: cliName,
      vehiculo: patente,
      conductor: conductor,
      contratoVenta: contratoVenta,
      contratoCosto: contratoCosto,
      viaje: nroViaje
    };

    logger.info('Estabilizando navegador...');
    await page.waitForLoadState('domcontentloaded').catch(() => { });
    await page.waitForTimeout(2000);

    // Limpiar modales residuales
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body?.classList.remove('modal-open');
    });

    // Planificar
    await api.createViaje(cliName, nroViaje);
    logger.success(`Viaje [${nroViaje}] planificado.`);

    // 2. Asignar
    logger.fase(2, `Asignación del Viaje [${nroViaje}]`);
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    await asignarPage.assignViaje(nroViaje, {
      transportista: transName,
      vehiculoPrincipal: patente,
      conductor: conductor
    });

    // Confirmar modal si aparece
    const btnConfirmar = page.locator('.bootbox-accept, button:has-text("Aceptar")').first();
    if (await btnConfirmar.isVisible({ timeout: 5000 })) {
      await btnConfirmar.click();
    }

    await page.waitForTimeout(2000);
    logger.success(`Viaje [${nroViaje}] asignado.`);

    // 3. Monitoreo (Finalizar)
    logger.fase(3, 'Finalizar Viaje');
    const monitoreo = new MonitoreoPage(page);
    await monitoreo.navegar();
    await monitoreo.finalizarViaje(nroViaje);
    logger.success(`Viaje [${nroViaje}] finalizado.`);

    // 4. PREFACTURA (Flujo Nuevo)
    logger.fase(4, 'Generación de Prefactura');
    const prefacturaPage = new PrefacturaPage(page);

    await test.step('Navegar y filtrar viajes finalizados', async () => {
      await prefacturaPage.navigateToCrear();
      await prefacturaPage.filtrarViajesPorCliente(cliName);
    });

    await test.step('Generar Prefactura y procesar', async () => {
      await prefacturaPage.generarPrefactura();
    });

    await test.step('Verificar prefactura en el Index', async () => {
      // Redirecciona automáticamente según spec, pero igual usamos el index como comprobación
      prefacturaId = await prefacturaPage.buscarPrefacturaEnIndex(cliName);
      // Registrar prefactura en entityTracker para el resumen
      entityTracker.register({
        type: 'Prefactura',
        name: 'Creada',
        id: prefacturaId,
        extra: `Cliente: ${cliName}`
      });
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success('Proceso de Prefactura Finalizado Correctamente');

    // --- RESUMEN EN ALLURE (attachment + parameters) ---
    const browser = testInfo.project.name.toUpperCase();
    const summaryText = entityTracker.getSummaryTable(browser);

    // Attachment visible en el reporte como sección expandible
    await testInfo.attach('📊 Resumen de Entidades Creadas', {
      body: summaryText,
      contentType: 'text/plain'
    });

    // Parámetros visibles en el header del test en Allure
    await allure.parameter('Ambiente', process.env.ENV || 'QA');
    await allure.parameter('Transportista', transName);
    await allure.parameter('Cliente', cliName);
    await allure.parameter('Vehículo', patente);
    await allure.parameter('Contrato Venta', createdEntities.contratoVenta);
    await allure.parameter('Contrato Costo', createdEntities.contratoCosto);
    await allure.parameter('Viaje', nroViaje);
    await allure.parameter('Prefactura ID', prefacturaId);
    await allure.parameter('Estado Final', '✅ PREFACTURADO');
    await allure.parameter('Duración (s)', executionTime);

    // Log a consola (CI/CD visibility)
    logger.info(summaryText);
    logger.info(`⏱️ Tiempo total: ${executionTime}s`);
  });
});

// Helper interno para agilizar E2E test
async function selectBootstrapByDataId(page: any, dataId: string, text: string) {
  await page.evaluate(({ selectId, textSelected }: { selectId: string; textSelected: string }) => {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;
    const option = Array.from(select.options).find(opt =>
      opt.text.toUpperCase().includes(textSelected.toUpperCase())
    );
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      // @ts-ignore
      if (window.jQuery && window.jQuery(select).selectpicker) {
        // @ts-ignore
        window.jQuery(select).selectpicker('refresh');
      }
    }
  }, { selectId: dataId, textSelected: text });
}
