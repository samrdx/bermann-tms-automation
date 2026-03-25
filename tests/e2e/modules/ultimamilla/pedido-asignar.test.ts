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
  vehiculo: string;
  transportista: string;
  conductor: string;
};

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
    const executionSummary: ExecutionSummary = {
      cliente: clienteObjetivo,
      pedido: orderData.codigoPedido || 'N/A',
      vehiculo: 'N/A',
      transportista: 'N/A',
      conductor: 'N/A',
    };

    logger.info('🚀 Inicio — Última Milla asignación de pedido');
    logger.info(`🧾 Contexto: cliente=${clienteObjetivo} | pedido=${executionSummary.pedido} | fecha=${orderData.fechaEntrega ?? 'UI default date'}`);

    try {
      await test.step('Fase 1: Crear pedido elegible', async () => {
        logPhaseHeader(1, '📝', 'Crear pedido elegible');
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
        logger.success(`Pedido elegible creado: ${executionSummary.pedido}`);
      });

      await test.step('Fase 2: Buscar y seleccionar pedido asignable', async () => {
        logPhaseHeader(2, '🔎', 'Buscar y seleccionar pedido');
        await ultimaMillaAsignarPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/asignar/);

        await ultimaMillaAsignarPage.searchOrders({
          cliente: clienteObjetivo,
          unidadNegocio: 'Defecto',
        });

        const rowId = await ultimaMillaAsignarPage.selectFirstOrderRow();
        expect(rowId).not.toBe('');
        executionSummary.pedido = `${executionSummary.pedido} / ${rowId}`;
        logger.success(`Pedido seleccionable detectado: ${executionSummary.pedido}`);
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
        expect(tripConfig.operationValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.serviceValue.toLowerCase()).toContain('defecto');
        expect(tripConfig.driverSelections.length).toBeGreaterThan(0);
        executionSummary.conductor = tripConfig.driverSelections.join(' | ') || 'N/A';
        logger.success(`Viaje configurado: conductor=${executionSummary.conductor}`);
      });

      await test.step('Fase 5: Crear viaje y verificar mutación', async () => {
        logPhaseHeader(5, '🚚', 'Crear viaje y verificar mutación');
        await ultimaMillaAsignarPage.createTrip();
        await expect.poll(async () => ultimaMillaAsignarPage.isOptimizationResultVisible()).toBe(false);
        logger.success('createTrip ejecutado y panel de optimización oculto');
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
  logger.info(`• Pedido id/código: ${formatSummaryValue(summary.pedido)}`);
  logger.info(`• Vehículo: ${formatSummaryValue(summary.vehiculo)}`);
  logger.info(`• Transportista: ${formatSummaryValue(summary.transportista)}`);
  logger.info(`• Conductor: ${formatSummaryValue(summary.conductor)}`);
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
