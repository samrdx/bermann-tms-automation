import { test, expect } from '../../../../src/fixtures/base.js';
import { createLogger } from '../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../api-helpers/DataPathHelper.js';
import { ClientResolver } from '../../../api-helpers/ClientResolver.js';
import fs from 'fs';

const logger = createLogger('UltimaMilla-AsignarPedido');

type OperationalData = Record<string, any> | undefined;
type ExecutionSummary = {
  cliente: string;
  pedido: string;
  rowId: string;
  tripId: string;
  vehiculo: string;
  transportista: string;
  conductor: string;
  statusAplicado: string;
};

test.describe('Última Milla - Asignación de Pedido', () => {
  test.setTimeout(180000);

  test('Happy path: debe buscar, optimizar y crear viaje para un pedido elegible', async ({
    page,
    ultimaMillaPage,
    ultimaMillaAsignarPage,
    ultimaMillaMonitoreoPage,
    ultimaMillaPedidoIndexPage,
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

    if (!clienteObjetivo || /^(qa|demo)_$/i.test(clienteObjetivo)) {
      throw new Error('No se pudo resolver un cliente determinístico para el happy path de asignación.');
    }

    const orderData = ultimaMillaFactory.generateDefaultData();
    orderData.clienteDropdown = clienteObjetivo;
    orderData.fechaEntrega = undefined;
    const executionSummary: ExecutionSummary = {
      cliente: clienteObjetivo,
      pedido: orderData.codigoPedido || 'N/A',
      rowId: 'N/A',
      tripId: 'N/A',
      vehiculo: 'N/A',
      transportista: 'N/A',
      conductor: 'N/A',
      statusAplicado: 'N/A',
    };
    const targetTerminalStatus = resolveTerminalStatus(process.env.ULTIMAMILLA_TERMINAL_STATUS);
    const expectedTripConfig = resolveExpectedTripConfiguration();
    let unidadNegocioObjetivo = resolveAssignmentBusinessUnit(operationalData);
    let createTripResult: Awaited<ReturnType<typeof ultimaMillaAsignarPage.createTrip>> | null = null;

    logger.info('🚀 Inicio — Última Milla asignación de pedido');
    logger.info(`🧾 Contexto: cliente=${clienteObjetivo} | unidadNegocio=${unidadNegocioObjetivo || 'auto'} | pedido=${executionSummary.pedido} | fecha=${orderData.fechaEntrega ?? 'UI default date'}`);

    try {
      await test.step('Fase 1: Crear pedido elegible', async () => {
        logPhaseHeader(1, '📝', 'Crear pedido elegible');
        await ultimaMillaPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/crear/);

        await ultimaMillaPage.fillCompleteForm(orderData as any, {
          clienteDropdownCandidates,
          environment: (process.env.ENV || 'QA').trim().toUpperCase(),
          unidadNegocio: unidadNegocioObjetivo,
        });

        if (!unidadNegocioObjetivo) {
          const selectedBusinessUnit = await ultimaMillaPage.getSelectedUnidadNegocioLabel();
          if (!selectedBusinessUnit) {
            throw new Error('No se pudo detectar la Unidad de Negocio seleccionada al crear el pedido.');
          }
          unidadNegocioObjetivo = selectedBusinessUnit;
          logger.info(`🔒 Unidad de Negocio detectada y bloqueada para la corrida: ${unidadNegocioObjetivo}`);
        }

        await page.waitForTimeout(1000);
        await ultimaMillaPage.clickGuardar();
        await page.waitForTimeout(2000);

        const errores = await ultimaMillaPage.getErrorMessages();
        if (errores.length > 0) {
          throw new Error(`Validación fallida al crear pedido para asignación. errores=[${errores.join(' | ')}]`);
        }

        const toastExact = page.getByText('Pedido creado Correctamente', { exact: true }).waitFor({ state: 'visible', timeout: 12000 });
        const toastRelaxed = page.getByText(/Pedido creado/i).first().waitFor({ state: 'visible', timeout: 12000 });
        const redirectedToIndex = page.waitForURL(/.*\/order\/(index|asignar).*/, { timeout: 12000 });

        try {
          await Promise.any([toastExact, toastRelaxed, redirectedToIndex]);
        } catch {
          throw new Error('No se detectó confirmación visual de creación de pedido (toast o redirección esperada).');
        }

        logger.success(`Pedido elegible creado: ${executionSummary.pedido}`);
      });

      await test.step('Fase 2: Buscar y seleccionar pedido asignable', async () => {
        logPhaseHeader(2, '🔎', 'Buscar y seleccionar pedido');
        await ultimaMillaAsignarPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/asignar/);

        if (!unidadNegocioObjetivo) {
          throw new Error('No hay Unidad de Negocio resuelta para la búsqueda de pedidos asignables.');
        }

        await ultimaMillaAsignarPage.searchOrders({
          cliente: clienteObjetivo,
          unidadNegocio: unidadNegocioObjetivo,
        });

        const rowId = await ultimaMillaAsignarPage.selectFirstOrderRow();
        expect(rowId).not.toBe('');
        executionSummary.rowId = rowId;
        logger.success(`Pedido seleccionable detectado: codigo=${executionSummary.pedido} | rowId=${executionSummary.rowId}`);
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
          `Optimización preparada: transportista=${executionSummary.transportista} | vehiculo=${executionSummary.vehiculo}${selection.usedFallbackCarrier ? ' | fallback=si' : ''}`
        );
      });

      await test.step('Fase 4: Optimizar y configurar viaje', async () => {
        logPhaseHeader(4, '🗺️', 'Optimizar y configurar viaje');
        await ultimaMillaAsignarPage.executeOptimization();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(true);
        await expect.poll(async () => ultimaMillaAsignarPage.isMapVisible()).toBe(true);

        const tripConfig = await ultimaMillaAsignarPage.configurePostOptimizationTrip();
        expect(tripConfig.operationValue.toLowerCase()).toContain(expectedTripConfig.operation.toLowerCase());
        expect(tripConfig.serviceValue.toLowerCase()).toContain(expectedTripConfig.service.toLowerCase());
        expect(tripConfig.driverSelections.length).toBeGreaterThan(0);
        executionSummary.conductor = tripConfig.driverSelections.join(' | ') || 'N/A';
        logger.success(`Viaje configurado: conductor=${executionSummary.conductor}`);
      });

      await test.step('Fase 5: Crear viaje y verificar mutación', async () => {
        logPhaseHeader(5, '🚚', 'Crear viaje y verificar mutación');
        createTripResult = await ultimaMillaAsignarPage.createTrip();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(false);
        logger.success(
          `createTrip ejecutado y panel de optimización oculto${createTripResult.tripId ? ` | fallbackTripId=${createTripResult.tripId} (${createTripResult.tripIdSource})` : ''}`
        );
      });

      await test.step('Fase 6: Resolver Trip ID desde /order/index', async () => {
        logPhaseHeader(6, '🧾', 'Resolver Trip ID');
        await ultimaMillaPedidoIndexPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/index/);

        let tripId: string | null = null;

        try {
          tripId = await ultimaMillaPedidoIndexPage.extractTripIdFromResults(executionSummary.pedido);
          logger.success(`Trip ID resuelto desde UI /order/index: ${tripId}`);
        } catch (error) {
          logger.warn('No se pudo resolver Trip ID desde /order/index; evaluando fallback de createTrip.', error);
          tripId = createTripResult?.tripId ?? null;
          if (!tripId) {
            throw error;
          }

          logger.warn(`Usando fallback de createTrip para tripId=${tripId} | source=${createTripResult?.tripIdSource}`);
        }

        expect(tripId).toBeTruthy();
        executionSummary.tripId = tripId || 'N/A';
      });

      await test.step('Fase 7: Finalizar viaje desde monitoreo UM', async () => {
        logPhaseHeader(7, '📍', 'Finalizar viaje desde monitoreo');
        await ultimaMillaMonitoreoPage.navigate();
        await expect(page).toHaveURL(/.*\/viajes\/monitoreo/);

        await ultimaMillaMonitoreoPage.setCategoryUltimaMilla();

        const statusUpdate = await ultimaMillaMonitoreoPage.updateOrderStatusViaHorarioGps({
          tripId: executionSummary.tripId,
          orderCode: executionSummary.pedido,
          status: targetTerminalStatus,
        });

        expect(statusUpdate.transitionDetected).toBe(true);
        executionSummary.statusAplicado = statusUpdate.status;

        logger.success(
          `Viaje monitoreado/finalizado. tripId=${statusUpdate.tripId} | pedido=${statusUpdate.orderCode} | estado=${statusUpdate.status} | accionesPendientes=${statusUpdate.pendingStatusActions}`
        );
      });

      logger.success(`Happy path completado en ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
      logger.error('Falló el happy path de asignación de pedido', error);
      const screenshotPath = await ultimaMillaAsignarPage.takeScreenshot('pedido-asignar-happy-path-failure');
      logger.error(`Screenshot de falla: ${screenshotPath}`);
      throw error;
    } finally {
      logExecutionSummary(executionSummary);
    }
  });
});

function logPhaseHeader(phaseNumber: number, emoji: string, title: string): void {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`${emoji} Fase ${phaseNumber} — ${title}`);
}

function logExecutionSummary(summary: ExecutionSummary): void {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 Resumen de ejecución');
  logger.info(`• Cliente: ${formatSummaryValue(summary.cliente)}`);
  logger.info(`• Pedido código: ${formatSummaryValue(summary.pedido)}`);
  logger.info(`• Row id asignación: ${formatSummaryValue(summary.rowId)}`);
  logger.info(`• Trip ID: ${formatSummaryValue(summary.tripId)}`);
  logger.info(`• Vehículo: ${formatSummaryValue(summary.vehiculo)}`);
  logger.info(`• Transportista: ${formatSummaryValue(summary.transportista)}`);
  logger.info(`• Conductor: ${formatSummaryValue(summary.conductor)}`);
  logger.info(`• Estado aplicado: ${formatSummaryValue(summary.statusAplicado)}`);
}

function formatSummaryValue(value: string | undefined): string {
  return value?.trim() ? value : 'N/A';
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

function resolveTerminalStatus(rawStatus: string | undefined): 'Entregado' | 'Entregado Parcial' | 'No Entregado' | 'Rechazado' {
  const normalized = (rawStatus || 'Entregado').replace(/\s+/g, ' ').trim().toLowerCase();
  const supportedStatuses = {
    entregado: 'Entregado',
    'entregado parcial': 'Entregado Parcial',
    'no entregado': 'No Entregado',
    rechazado: 'Rechazado',
  } as const;

  const resolvedStatus = supportedStatuses[normalized as keyof typeof supportedStatuses];
  if (!resolvedStatus) {
    throw new Error(
      `ULTIMAMILLA_TERMINAL_STATUS inválido: ${rawStatus}. Valores soportados=[${Object.keys(supportedStatuses).join(' | ')}]`
    );
  }

  return resolvedStatus;
}

function resolveExpectedTripConfiguration(): { operation: string; service: string } {
  const isDemo = (process.env.ENV || 'QA').trim().toUpperCase() === 'DEMO';
  return {
    operation: isDemo ? 'Cristales' : 'defecto',
    service: isDemo ? 'Roundtrip' : 'defecto',
  };
}

function resolveAssignmentBusinessUnit(operationalData?: OperationalData): string | undefined {
  const override = process.env.ULTIMAMILLA_UNIDAD_NEGOCIO?.trim();
  if (override) {
    return override;
  }

  const seedBusinessUnit = (
    operationalData?.unidadNegocio?.nombre
    || operationalData?.setupConfig?.unidadNegocio?.nombre
    || operationalData?.seededUnidadNegocio?.nombre
    || operationalData?.seededUnidadNegocio
  )?.toString().trim();

  if (seedBusinessUnit) {
    return seedBusinessUnit;
  }

  return undefined;
}
