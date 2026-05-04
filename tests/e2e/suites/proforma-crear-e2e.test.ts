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

test.describe('[E2E] Finanzas - Proforma (Usando datos seeded)', () => {
  test.setTimeout(300000); // 5 min - solo proforma, no creación de ecosistema

  test('Crear Proforma usando datos seeded de regression:entities/contracts/trips', async ({ page }, testInfo) => {
    const startTime = Date.now();

    await allure.epic('TMS E2E Flow');
    await allure.feature('Modulo Finanzas');
    await allure.story('Crear Proforma desde viaje existente');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    // =================================================================
    // Cargar datos seeded de ejecuciones anteriores
    // =================================================================
    logger.info('📦 Cargando datos seeded de regression:entities/contracts/trips...');
    
    const { data: operationalData } = OperationalDataLoader.loadOrThrow<Record<string, any>>(testInfo, {
      logger,
      purpose: 'proforma con datos seedeados'
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

    // El viaje ya está FINALIZADO (de regression:trips) -可以直接 pasar a proforma
    // Solo verificamos que existe y está en estado correcto
    logger.fase(2, 'Verificar Viaje Finalizado');
    logger.success(`Viaje [${nroViaje}]确认 state: ${viajeData.status}. Listo para proforma.`);

    logger.fase(3, 'Generacion de Proforma');
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

    await allure.parameter('Ambiente', process.env.ENV || 'QA');
    await allure.parameter('Cliente', clienteNombre);
    await allure.parameter('Transportista', transName);
    await allure.parameter('Viaje', nroViaje);
    await allure.parameter('Viaje Estado', viajeData.status);
    await allure.parameter('Proforma ID', proformaId);
    await allure.parameter('Estado Final', '✅ PROFORMADO');
    await allure.parameter('Duracion (s)', executionTime);

    logger.success('🎉 Proceso de Proforma finalizado correctamente');
    logger.info(summaryText);
    logger.info(`⏱️ Tiempo total: ${executionTime}s`);
  });
});
