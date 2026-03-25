import { test, expect } from '../../../../src/fixtures/base.js';
import { createLogger } from '../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../api-helpers/DataPathHelper.js';
import { ClientResolver } from '../../../api-helpers/ClientResolver.js';
import fs from 'fs';

const logger = createLogger('UltimaMilla-AsignarPedido');

type OperationalData = Record<string, any> | undefined;

test.describe('Última Milla - Asignación de Pedido', () => {
  test.setTimeout(180000);

  test('Happy path: debe buscar, optimizar y crear viaje para un pedido elegible', async ({
    page,
    ultimaMillaPage,
    ultimaMillaAsignarPage,
    ultimaMillaFactory,
  }, testInfo) => {
    test.skip(
      process.env.ULTIMAMILLA_ENABLE_MUTATION !== 'true',
      'Guard QA-mutating activo. Ejecutá con ULTIMAMILLA_ENABLE_MUTATION=true para permitir createTrip.'
    );

    const startTime = Date.now();
    const operationalData = loadOperationalData(testInfo);
    const clienteDropdownCandidates = ClientResolver.getDropdownCandidates(operationalData);
    const fallbackClientName = ClientResolver.resolveClientName(operationalData);
    const clienteObjetivo = clienteDropdownCandidates[0] || fallbackClientName;

    if (!clienteObjetivo || /^qa_$/i.test(clienteObjetivo)) {
      throw new Error('No se pudo resolver un cliente determinístico para el happy path de asignación.');
    }

    const orderData = ultimaMillaFactory.generateDefaultData();
    orderData.clienteDropdown = clienteObjetivo;
    orderData.fechaEntrega = undefined;

    logger.info('='.repeat(80));
    logger.info('🚀 Iniciando happy path de asignación de pedido Última Milla');
    logger.info(`Cliente objetivo: ${clienteObjetivo}`);
    logger.info(`Fecha entrega objetivo: ${orderData.fechaEntrega ?? 'UI default date'}`);
    logger.info(`Mutation guard: ${process.env.ULTIMAMILLA_ENABLE_MUTATION}`);

    try {
      await test.step('Fase 1: Crear pedido elegible', async () => {
        logger.info('📝 FASE 1: Crear pedido elegible para asignación');
        await ultimaMillaPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/crear/);

        await ultimaMillaPage.fillCompleteForm(orderData as any, {
          clienteDropdownCandidates,
          environment: (process.env.ENV || 'QA').trim().toUpperCase(),
        });

        await page.waitForTimeout(1000);
        await ultimaMillaPage.clickGuardar();
        await page.waitForTimeout(2000);

        const errores = await ultimaMillaPage.getErrorMessages();
        if (errores.length > 0) {
          throw new Error(`Validación fallida al crear pedido para asignación. errores=[${errores.join(' | ')}]`);
        }

        await expect(page.getByText('Pedido creado Correctamente', { exact: true })).toBeVisible({ timeout: 10000 });
        logger.info('✅ Pedido elegible creado correctamente');
      });

      await test.step('Fase 2: Buscar y seleccionar pedido asignable', async () => {
        logger.info('🔎 FASE 2: Buscar y seleccionar pedido asignable');
        await ultimaMillaAsignarPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/asignar/);

        await ultimaMillaAsignarPage.searchOrders({
          cliente: clienteObjetivo,
          unidadNegocio: 'Defecto',
        });

        const rowId = await ultimaMillaAsignarPage.selectFirstOrderRow();
        expect(rowId).not.toBe('');
        logger.info(`✅ Pedido seleccionable detectado. rowId=${rowId}`);
      });

      await test.step('Fase 3: Configurar optimización determinística', async () => {
        logger.info('⚙️ FASE 3: Configurar optimización determinística');
        const selection = await ultimaMillaAsignarPage.configureOptimization();

        expect(selection.carrierLabel.length).toBeGreaterThan(0);
        expect(selection.vehicleLabel.length).toBeGreaterThan(0);
        await expect.poll(async () => ultimaMillaAsignarPage.hasSingleSelectedCarrier()).toBe(true);

        logger.info(
          `Carrier/Vehicle final: transportista=${selection.carrierLabel} | vehiculo=${selection.vehicleLabel} | fallback=${selection.usedFallbackCarrier}`
        );
      });

      await test.step('Fase 4: Optimizar y configurar viaje', async () => {
        logger.info('🗺️ FASE 4: Optimizar y configurar viaje');
        await ultimaMillaAsignarPage.executeOptimization();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(true);
        await expect.poll(async () => ultimaMillaAsignarPage.isMapVisible()).toBe(true);

        const tripConfig = await ultimaMillaAsignarPage.configurePostOptimizationTrip();
        expect(tripConfig.operationValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.serviceValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.driverSelections.length).toBeGreaterThan(0);
        logger.info(`✅ Viaje post-optimización configurado. conductores=${tripConfig.driverSelections.join(' | ')}`);
      });

      await test.step('Fase 5: Crear viaje y verificar mutación', async () => {
        logger.info('🚚 FASE 5: Crear viaje y verificar mutación');
        await ultimaMillaAsignarPage.createTrip();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(false);
        logger.info('✅ createTrip ejecutado y panel de optimización oculto');
      });

      logger.info(`✅ Happy path completado en ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
      logger.error('Falló el happy path de asignación de pedido', error);
      await ultimaMillaAsignarPage.takeScreenshot('pedido-asignar-happy-path-failure');
      throw error;
    }
  });
});

function loadOperationalData(testInfo: Parameters<typeof DataPathHelper.getLegacyOperationalDataPath>[0]): OperationalData {
  const dataPath = DataPathHelper.getLegacyOperationalDataPath(testInfo);
  if (!fs.existsSync(dataPath)) {
    logger.warn(`No existe data operacional en ${dataPath}. Se usará fallback diagnóstico.`);
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, any>;
  } catch (error) {
    logger.warn(`No se pudo parsear data operacional en ${dataPath}.`, error);
    return undefined;
  }
}
