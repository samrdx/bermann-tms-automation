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
import { DataPathHelper } from '../../api-helpers/DataPathHelper.js';
import { OperationalDataLoader } from '../../api-helpers/OperationalDataLoader.js';
import fs from 'fs';

const logger = createLogger('PrefacturaCrearE2ETest');
let prefacturaId = 'N/A';
let createdEntities: any = {};

test.describe('[E2E] Finanzas - Prefactura (Usando datos seeded)', () => {
  test.setTimeout(300000); // 5 min - solo prefactura, no creación de ecosistema

  test('Crear Prefactura usando datos seeded de regression:entities/contracts/trips', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await allure.epic('TMS E2E Flow');
    await allure.feature('Modulo Finanzas');
    await allure.story('Crear Prefactura desde viaje existente');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');
    
    // =================================================================
    // Cargar datos seeded de ejecuciones anteriores
    // =================================================================
    logger.info('📦 Cargando datos seeded de regression:entities/contracts/trips...');
    
    const { data: operationalData } = OperationalDataLoader.loadOrThrow<Record<string, any>>(testInfo, {
      logger,
      purpose: 'prefactura con datos seedeados'
    });

    const cliente = operationalData.seededCliente || operationalData.cliente;
    const transportista = operationalData.seededTransportista;
    const viajeData = operationalData.viaje;
    
    if (!cliente?.nombre) {
      throw new Error('❌ No se encontró cliente seeded. Ejecuta regression:entities primero.');
    }
    if (!viajeData?.nroViaje || viajeData.status !== 'FINALIZADO') {
      throw new Error('❌ No se encontró viaje FINALIZADO. Ejecuta regression:trips primero.');
    }

    const clienteNombre = cliente.nombreFantasia || cliente.nombre;
    const transName = transportista?.nombre || operationalData.transportista;
    const nroViaje = viajeData.nroViaje;

    logger.success(`Datos loaded: Cliente=[${clienteNombre}] Transportista=[${transName}] Viaje=[${nroViaje}] (${viajeData.status})`);

    entityTracker.register({ type: 'Cliente', name: clienteNombre });
    entityTracker.register({ type: 'Transportista', name: transName });
    entityTracker.register({ type: 'Viaje', name: nroViaje, extra: viajeData.status });

    await page.waitForLoadState('domcontentloaded').catch(() => { });
    await page.waitForTimeout(2000);

    // Limpiar modales residuales
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body?.classList.remove('modal-open');
    });

    logger.success(`Viaje [${nroViaje}] ya se encuentra en estado: ${viajeData.status}`);

    // El viaje ya está FINALIZADO (de regression:trips) -可以直接 pasar a prefactura
    // Solo verificamos que existe y está en estado correcto
    logger.fase(2, 'Verificar Viaje Finalizado');
    logger.success(`Viaje [${nroViaje}]确认 state: ${viajeData.status}. Listo para prefactura.`);

    // 3. PREFACTURA (Solo esta parte)
    logger.fase(4, 'Generación de Prefactura');
    const prefacturaPage = new PrefacturaPage(page);

    await test.step('Navegar y filtrar viajes finalizados', async () => {
      await prefacturaPage.navigateToCrear();
      await prefacturaPage.filtrarViajesPorCliente(clienteNombre);
    });

    await test.step('Generar Prefactura y procesar', async () => {
      await prefacturaPage.generarPrefactura();
    });

    await test.step('Verificar prefactura en el Index', async () => {
      // Redirecciona automáticamente según spec, pero igual usamos el index como comprobación
      prefacturaId = await prefacturaPage.buscarPrefacturaEnIndex(clienteNombre);
      // Registrar prefactura en entityTracker para el resumen
      entityTracker.register({
        type: 'Prefactura',
        name: 'Creada',
        id: prefacturaId,
        extra: `Cliente: ${clienteNombre}`
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
    await allure.parameter('Cliente', clienteNombre);
    await allure.parameter('Viaje', nroViaje);
    await allure.parameter('Viaje Estado', viajeData.status);
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
