import { test, expect } from '../../../../src/fixtures/base.js';
import { createLogger } from '../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../api-helpers/DataPathHelper.js';
import { ClientResolver } from '../../../api-helpers/ClientResolver.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

const logger = createLogger('UltimaMilla-AsignarPedidoBatch');
const DEFAULT_BATCH_SIZE = 8;
const BATCH_ADDRESSES = [
  'Argomedo 344, Santiago, Chile',
  'Av. Providencia 1208, Providencia, Chile',
  'Apoquindo 4500, Las Condes, Chile',
  'Santa Rosa 1240, Santiago, Chile',
  'Avenida Grecia 2000, Ñuñoa, Chile',
  'Neptuno 1314B, 9080679 Cerro Navia, Región Metropolitana',
  'Av. 5 de Abril 5940, 9160000 Estación Central, Región Metropolitana',
  'Placer 698, Santiago, Región Metropolitana',
  'Av. Mariano Sánchez Fontecilla 12000, 7941197 Peñalolén, Región Metropolitana',
  'Av. Padre Hurtado Sur 875, 7571626 Las Condes, Región Metropolitana',
  'Av. Larraín 5862, 7870154 La Reina, Región Metropolitana',
  'Av. Macul 6402, La Florida, Peñalolén, Región Metropolitana',
] as const;
const MAX_DISTINCT_BASE_ADDRESSES = BATCH_ADDRESSES.length;

type OperationalData = Record<string, any> | undefined;

type BatchExecutionSummary = {
  cliente: string;
  requestedBatchSize: number;
  createdOrders: string[];
  assignedRowIds: string[];
  selectedCount: number;
  tripId: string;
  vehiculo: string;
  transportista: string;
  conductor: string;
  estadosAplicados: string[];
  refreshDetected: string;
  gridMutated: string;
};

type TerminalStatus = 'Entregado' | 'Entregado Parcial' | 'Rechazado' | 'No Entregado';
const TERMINAL_STATUSES: readonly TerminalStatus[] = ['Entregado', 'Entregado Parcial', 'Rechazado', 'No Entregado'] as const;

test.describe('Última Milla - Asignación batch de pedidos', () => {
  test.setTimeout(600000);

  test('Happy path: debe crear, seleccionar, optimizar y crear viaje para múltiples pedidos elegibles', async ({
    page,
    ultimaMillaPage,
    ultimaMillaAsignarPage,
    ultimaMillaMonitoreoPage,
    ultimaMillaPedidoIndexPage,
    ultimaMillaFactory,
  }, testInfo) => {
    await allure.epic('TMS Última Milla');
    await allure.feature('Asignación Batch');
    await allure.story('Crear, optimizar y finalizar viaje batch');

    test.skip(
      process.env.ULTIMAMILLA_ENABLE_MUTATION !== 'true',
      'Guard QA-mutating activo. Ejecutá con ULTIMAMILLA_ENABLE_MUTATION=true para permitir createTrip.'
    );

    const startTime = Date.now();
    const batchSize = resolveBatchSize(process.env.ULTIMAMILLA_BATCH_SIZE);
    const operationalData = loadOperationalData(testInfo);
    const clienteDropdownCandidates = ClientResolver.getDropdownCandidates(operationalData);
    const fallbackClientName = ClientResolver.resolveClientName(operationalData);
    const clienteObjetivo = clienteDropdownCandidates[0] || fallbackClientName;

    if (!clienteObjetivo || /^qa_$/i.test(clienteObjetivo)) {
      throw new Error('No se pudo resolver un cliente determinístico para el batch de asignación de Última Milla.');
    }

    if (batchSize > MAX_DISTINCT_BASE_ADDRESSES) {
      logger.warn(
        `ULTIMAMILLA_BATCH_SIZE=${batchSize} excede las ${MAX_DISTINCT_BASE_ADDRESSES} direcciones base verificadas; se reutilizarán direcciones en forma determinística.`
      );
    }

    const batchOrders = Array.from({ length: batchSize }, (_, index) => {
      const orderData = ultimaMillaFactory.generateDefaultData();
      orderData.clienteDropdown = clienteObjetivo;
      orderData.fechaEntrega = undefined;
      orderData.direccionBusqueda = BATCH_ADDRESSES[index % BATCH_ADDRESSES.length];
      return orderData;
    });

    const executionSummary: BatchExecutionSummary = {
      cliente: clienteObjetivo,
      requestedBatchSize: batchSize,
      createdOrders: batchOrders.map(order => order.codigoPedido || 'N/A'),
      assignedRowIds: [],
      selectedCount: 0,
      tripId: 'N/A',
      vehiculo: 'N/A',
      transportista: 'N/A',
      conductor: 'N/A',
      estadosAplicados: [],
      refreshDetected: 'N/A',
      gridMutated: 'N/A',
    };

    let createTripResult: Awaited<ReturnType<typeof ultimaMillaAsignarPage.createTrip>> | null = null;

    logger.info('🚀 Inicio — Última Milla asignación batch de pedidos');
    logger.info(
      `🧾 Contexto: cliente=${clienteObjetivo} | batchSize=${batchSize} | pedidos=[${executionSummary.createdOrders.join(' | ')}]`
    );

    await allure.parameter('Ambiente', (process.env.ENV || 'QA').trim().toUpperCase());
    await allure.parameter('Cliente Objetivo', clienteObjetivo);
    await allure.parameter('Batch Size Solicitado', String(batchSize));
    await allure.parameter('Pedidos (códigos)', executionSummary.createdOrders.join(' | '));

    try {
      await test.step('Fase 1: Crear lote de pedidos elegibles', async () => {
        logPhaseHeader(1, '📝', `Crear ${batchSize} pedidos elegibles`);

        for (const [index, orderData] of batchOrders.entries()) {
          logger.info(
            `➡️ Creando pedido ${index + 1}/${batchSize}. codigo=${orderData.codigoPedido} | direccion=${orderData.direccionBusqueda}`
          );

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
            throw new Error(
              `Validación fallida al crear pedido batch ${orderData.codigoPedido}. errores=[${errores.join(' | ')}]`
            );
          }

          await expect(page.getByText('Pedido creado Correctamente', { exact: true })).toBeVisible({ timeout: 10000 });
          logger.success(`Pedido batch creado: codigo=${orderData.codigoPedido}`);
        }

        await allure.attachment(
          'UM Batch - Pedidos creados',
          JSON.stringify(
            {
              cliente: clienteObjetivo,
              batchSize,
              pedidos: batchOrders.map(order => ({
                codigoPedido: order.codigoPedido,
                direccionBusqueda: order.direccionBusqueda,
              })),
            },
            null,
            2
          ),
          'application/json'
        );
      });

      await test.step('Fase 2: Buscar y seleccionar pedidos asignables', async () => {
        logPhaseHeader(2, '🔎', 'Buscar y seleccionar pedidos batch');
        await ultimaMillaAsignarPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/asignar/);

        await ultimaMillaAsignarPage.searchOrders({
          cliente: clienteObjetivo,
          unidadNegocio: 'Defecto',
        });

        const selectionResult = await ultimaMillaAsignarPage.selectOrderRowsByCodes(
          batchOrders.map(order => order.codigoPedido)
        );

        executionSummary.assignedRowIds = selectionResult.selectedRowIds;
        executionSummary.selectedCount = selectionResult.selectedCount;

        expect(selectionResult.matchedOrderCodes).toEqual(batchOrders.map(order => order.codigoPedido));
        expect(selectionResult.selectedCount).toBe(batchSize);
        await expect.poll(async () => ultimaMillaAsignarPage.getSelectedOrderCount()).toBe(batchSize);

        logger.success(
          `Pedidos batch seleccionados: count=${selectionResult.selectedCount} | rowIds=${selectionResult.selectedRowIds.join(' | ')}`
        );
      });

      await test.step('Fase 3: Configurar optimización determinística', async () => {
        logPhaseHeader(3, '⚙️', 'Configurar optimización');
        const selection = await ultimaMillaAsignarPage.configureOptimization();

        expect(selection.carrierLabel.length).toBeGreaterThan(0);
        expect(selection.vehicleLabel.length).toBeGreaterThan(0);
        await expect.poll(async () => ultimaMillaAsignarPage.hasSingleSelectedCarrier()).toBe(true);

        executionSummary.transportista = selection.carrierLabel || 'N/A';
        executionSummary.vehiculo = selection.vehicleLabel || 'N/A';

        logger.success(
          `Optimización batch preparada: transportista=${executionSummary.transportista} | vehiculo=${executionSummary.vehiculo}${selection.usedFallbackCarrier ? ' | fallback=si' : ''}`
        );
      });

      await test.step('Fase 4: Optimizar y configurar viaje', async () => {
        logPhaseHeader(4, '🗺️', 'Optimizar y configurar viaje');
        await ultimaMillaAsignarPage.executeOptimization();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(true);
        await expect.poll(async () => ultimaMillaAsignarPage.isMapVisible()).toBe(true);

        const tripConfig = await ultimaMillaAsignarPage.configurePostOptimizationTrip();
        expect(tripConfig.operationValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.serviceValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.driverSelections.length).toBeGreaterThan(0);

        executionSummary.conductor = tripConfig.driverSelections.join(' | ') || 'N/A';
        logger.success(`Viaje batch configurado: conductor=${executionSummary.conductor}`);
      });

      await test.step('Fase 5: Crear viaje y verificar refresh/mutación', async () => {
        logPhaseHeader(5, '🚚', 'Crear viaje y verificar mutación');
        createTripResult = await ultimaMillaAsignarPage.createTrip();

        executionSummary.refreshDetected = String(createTripResult.refreshDetected);
        executionSummary.gridMutated = String(createTripResult.gridMutated);

        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(false);
        expect(createTripResult.refreshDetected || createTripResult.gridMutated).toBe(true);

        logger.success(
          `createTrip batch ejecutado. refresh=${createTripResult.refreshDetected} | gridMutated=${createTripResult.gridMutated}${createTripResult.tripId ? ` | fallbackTripId=${createTripResult.tripId} (${createTripResult.tripIdSource})` : ''}`
        );
      });

      await test.step('Fase 6: Resolver Trip ID desde /order/index', async () => {
        logPhaseHeader(6, '🧾', 'Resolver Trip ID');
        await ultimaMillaPedidoIndexPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/index/);

        const firstOrderCode = batchOrders[0]?.codigoPedido;
        if (!firstOrderCode) {
          throw new Error('No hay pedido batch disponible para resolver Trip ID en /order/index.');
        }

        let tripId: string | null = null;

        try {
          tripId = await ultimaMillaPedidoIndexPage.extractTripIdFromResults(firstOrderCode);
          logger.success(`Trip ID batch resuelto desde UI /order/index: ${tripId}`);
        } catch (error) {
          logger.warn('No se pudo resolver Trip ID batch desde /order/index; evaluando fallback de createTrip.', error);
          tripId = createTripResult?.tripId ?? null;
          if (!tripId) {
            throw error;
          }

          logger.warn(`Usando fallback de createTrip para tripId=${tripId} | source=${createTripResult?.tripIdSource}`);
        }

        expect(tripId).toBeTruthy();
        executionSummary.tripId = tripId || 'N/A';
        await allure.parameter('Trip ID', executionSummary.tripId);
      });

      await test.step('Fase 7: Finalizar viaje desde monitoreo UM (estados aleatorios)', async () => {
        logPhaseHeader(7, '📍', 'Finalizar viaje batch desde monitoreo con estados aleatorios');
        await ultimaMillaMonitoreoPage.navigate();
        await expect(page).toHaveURL(/.*\/viajes\/monitoreo/);
        await ultimaMillaMonitoreoPage.setCategoryUltimaMilla();

        const appliedStatuses: string[] = [];
        let lastStatusUpdate: Awaited<ReturnType<typeof ultimaMillaMonitoreoPage.updateOrderStatusViaHorarioGps>> | null = null;

        for (const [index, orderData] of batchOrders.entries()) {
          const orderCode = orderData.codigoPedido;
          const randomStatus = pickRandomTerminalStatus();
          const isLastOrder = index === batchOrders.length - 1;

          logger.info(
            `➡️ Actualizando pedido batch ${orderCode} con estado aleatorio=${randomStatus} | requireTripTransition=${isLastOrder}`
          );

          const statusUpdate = await ultimaMillaMonitoreoPage.updateOrderStatusViaHorarioGps({
            tripId: executionSummary.tripId,
            orderCode,
            status: randomStatus,
            requireTripTransition: isLastOrder,
          });

          lastStatusUpdate = statusUpdate;

          expect(statusUpdate.status).toBe(randomStatus);
          appliedStatuses.push(`${orderCode}:${statusUpdate.status}`);

          logger.success(
            `Estado aplicado en monitoreo. pedido=${statusUpdate.orderCode} | estado=${statusUpdate.status} | transition=${statusUpdate.transitionDetected} | accionesPendientes=${statusUpdate.pendingStatusActions}`
          );
        }

        executionSummary.estadosAplicados = appliedStatuses;
        expect(executionSummary.estadosAplicados.length).toBe(batchSize);
        expect(lastStatusUpdate).toBeTruthy();
        expect(lastStatusUpdate?.transitionDetected).toBe(true);

        await allure.parameter('Estados Aplicados', executionSummary.estadosAplicados.join(' | '));
      });

      logger.success(`Happy path batch completado en ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
      logger.error('Falló el happy path batch de asignación de pedidos', error);
      const screenshotPath = await ultimaMillaAsignarPage.takeScreenshot('pedido-asignar-batch-failure');
      logger.error(`Screenshot de falla: ${screenshotPath}`);
      throw error;
    } finally {
      await allure.attachment(
        'UM Batch - Resumen ejecución',
        JSON.stringify(
          {
            cliente: executionSummary.cliente,
            requestedBatchSize: executionSummary.requestedBatchSize,
            createdOrders: executionSummary.createdOrders,
            assignedRowIds: executionSummary.assignedRowIds,
            selectedCount: executionSummary.selectedCount,
            tripId: executionSummary.tripId,
            vehiculo: executionSummary.vehiculo,
            transportista: executionSummary.transportista,
            conductor: executionSummary.conductor,
            estadosAplicados: executionSummary.estadosAplicados,
            refreshDetected: executionSummary.refreshDetected,
            gridMutated: executionSummary.gridMutated,
          },
          null,
          2
        ),
        'application/json'
      );
      logExecutionSummary(executionSummary);
    }
  });
});

function logPhaseHeader(phaseNumber: number, emoji: string, title: string): void {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`${emoji} Fase ${phaseNumber} — ${title}`);
}

function logExecutionSummary(summary: BatchExecutionSummary): void {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 Resumen de ejecución batch');
  logger.info(`• Cliente: ${formatSummaryValue(summary.cliente)}`);
  logger.info(`• Batch size solicitado: ${summary.requestedBatchSize}`);
  logger.info(`• Pedidos creados: ${summary.createdOrders.join(' | ') || 'N/A'}`);
  logger.info(`• Row ids asignación: ${summary.assignedRowIds.join(' | ') || 'N/A'}`);
  logger.info(`• Cantidad seleccionada: ${summary.selectedCount}`);
  logger.info(`• Trip ID: ${formatSummaryValue(summary.tripId)}`);
  logger.info(`• Vehículo: ${formatSummaryValue(summary.vehiculo)}`);
  logger.info(`• Transportista: ${formatSummaryValue(summary.transportista)}`);
  logger.info(`• Conductor(es): ${formatSummaryValue(summary.conductor)}`);
  logger.info(`• Estados aplicados: ${summary.estadosAplicados.join(' | ') || 'N/A'}`);
  logger.info(`• Refresh detectado: ${formatSummaryValue(summary.refreshDetected)}`);
  logger.info(`• Mutación de grilla: ${formatSummaryValue(summary.gridMutated)}`);
}

function formatSummaryValue(value: string | undefined): string {
  return value?.trim() ? value : 'N/A';
}

function resolveBatchSize(rawValue: string | undefined): number {
  if (!rawValue?.trim()) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`ULTIMAMILLA_BATCH_SIZE inválido: ${rawValue}. Debe ser un entero positivo.`);
  }

  return parsedValue;
}

function pickRandomTerminalStatus(): TerminalStatus {
  const randomIndex = Math.floor(Math.random() * TERMINAL_STATUSES.length);
  return TERMINAL_STATUSES[randomIndex];
}

function loadOperationalData(testInfo: Parameters<typeof DataPathHelper.getLegacyOperationalDataPath>[0]): OperationalData {
  const candidatePaths = DataPathHelper.getLegacyOperationalDataCandidatePaths(testInfo);

  for (const [index, dataPath] of candidatePaths.entries()) {
    if (!fs.existsSync(dataPath)) {
      logger.warn(`No existe data operacional en ${dataPath}.`);
      continue;
    }

    try {
      const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, any>;
      if (index > 0) {
        logger.warn(`Usando fallback determinístico de data operacional: ${dataPath}`);
      } else {
        logger.info(`Usando data operacional primaria: ${dataPath}`);
      }

      return operationalData;
    } catch (error) {
      logger.warn(`No se pudo parsear data operacional en ${dataPath}.`, error);
    }
  }

  logger.warn(`No se encontró data operacional válida en ninguna ruta candidata. rutas=[${candidatePaths.join(' | ')}]`);
  return undefined;
}
