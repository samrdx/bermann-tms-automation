import { BasePage } from '../../../core/BasePage.js';
import type { Locator, Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('UltimaMillaAsignarPage');

export interface AssignmentSearchCriteria {
  cliente: string;
  unidadNegocio: string;
  fecha?: string;
}

export interface OptimizationConfig {
  tipo: 'rutas más rápidas' | 'balancear rutas' | 'reducir costos';
  modo: 'Flexible';
}

export interface OptimizationDiagnostics {
  selectedOrderCount: number;
  tipoSelector: string;
  modoSelector: string;
  transportistaSelector: string;
  vehiculoSelector: string;
  subtipoSelector?: string;
  zoneAlerts: string[];
  hasZoneConfiguration: boolean;
  tipoOptionCount: number;
  modoOptionCount: number;
  transportistaOptionCount: number;
  vehiculoOptionCount: number;
  tipoSelected: string[];
  modoSelected: string[];
  transportistaSelected: string[];
  vehiculoSelected: string[];
  subtipoOptionCount?: number;
}

export interface CarrierVehicleSelection {
  carrierValue: string;
  carrierLabel: string;
  vehicleValue: string;
  vehicleLabel: string;
  usedFallbackCarrier: boolean;
}

export interface TripConfigurationResult {
  operationValue: string;
  serviceValue: string;
  driverSelections: string[];
}

export interface CreateTripPreflightResult {
  operationValue: string;
  serviceValue: string;
  driverSelections: string[];
}

type DriverRouteContext = {
  routeIndex: number;
  selector: string;
  vehicle: string;
  optionCount: number;
};

type SelectOptionData = {
  value: string;
  text: string;
  disabled: boolean;
  selected: boolean;
};

type VehicleResponseDiagnostics = {
  status: number;
  ok: boolean;
  url: string;
  bodySnippet: string;
};

type RowSelectionStrategy =
  | 'label-for'
  | 'ancestor-label'
  | 'checkbox-cell'
  | 'checkbox-wrapper'
  | 'table-row'
  | 'native-checkbox-click'
  | 'native-checkbox-dispatch';

type AssignmentGridSnapshot = {
  rowIds: string[];
  checkedRowIds: string[];
  noDataVisible: boolean;
  signature: string;
};

function formatSearchDateDiagnostic(fecha?: string): string {
  return fecha?.trim() || 'UI default date';
}

export class UltimaMillaSearchNoDataError extends Error {
  readonly criteria: AssignmentSearchCriteria;
  readonly emptyStateText: string;

  constructor(criteria: AssignmentSearchCriteria, emptyStateText: string) {
    super(
      `No hay pedidos elegibles para asignación en Última Milla. ` +
      `cliente="${criteria.cliente}", unidadNegocio="${criteria.unidadNegocio}", fecha="${formatSearchDateDiagnostic(criteria.fecha)}", ` +
      `emptyState="${emptyStateText || 'sin texto visible'}"`
    );
    this.name = 'UltimaMillaSearchNoDataError';
    this.criteria = criteria;
    this.emptyStateText = emptyStateText;
  }
}

export class UltimaMillaAssignmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UltimaMillaAssignmentConfigurationError';
  }
}

/**
 * Page Object for Última Milla assignment search page
 * URL: /order/asignar
 */
export class UltimaMillaAsignarPage extends BasePage {
  private readonly selectors = {
    filters: {
      clienteSelect: '#text_client',
      clienteButton: 'button[data-id="text_client"]',
      unidadNegocioSelect: '#text_united_business',
      unidadNegocioButton: 'button[data-id="text_united_business"]',
      fechaEntrega: '#text_delivery_date',
      textSearch: '#txt_search',
      btnSearch: '#btn_search',
    },
    table: {
      wrapper: '#tabla_data_wrapper',
      rows: 'input.row-check[data-id]',
      firstRow: 'input.row-check[data-id]',
      checkedRows: 'input.row-check[data-id]:checked',
    },
    states: {
      noData: '#div_no_data',
      loadingModal: '#modalCargando',
    },
    dropdown: {
      menu: '.dropdown-menu.show',
      searchInput: '.dropdown-menu.show .bs-searchbox input[type="text"]',
      options: '.dropdown-menu.show li:not(.disabled):not(.hidden) a',
    },
    optimization: {
      typeSelectCandidates: [
        '#text_optimization_type',
        '#text_type_optimization',
        '#optimization_type',
        'select[name*="optimization_type"]',
        'select[name*="type_optimization"]',
      ],
      typeButtonCandidates: [
        'button[data-id="text_optimization_type"]',
        'button[data-id="text_type_optimization"]',
        'button[data-id="optimization_type"]',
      ],
      modeSelectCandidates: [
        '#text_optimization_mode',
        '#text_mode_optimization',
        '#optimization_mode',
        'select[name*="optimization_mode"]',
        'select[name*="mode_optimization"]',
      ],
      modeButtonCandidates: [
        'button[data-id="text_optimization_mode"]',
        'button[data-id="text_mode_optimization"]',
        'button[data-id="optimization_mode"]',
      ],
      carrierSelectCandidates: [
        '#text_transportista',
        '#text_carrier',
        '#transportista',
        '#text_transporter',
        'select[name*="transportista"]',
        'select[name*="carrier"]',
      ],
      carrierButtonCandidates: [
        'button[data-id="text_transportista"]',
        'button[data-id="text_carrier"]',
        'button[data-id="transportista"]',
        'button[data-id="text_transporter"]',
      ],
      vehicleSelectCandidates: [
        '#drop_vehicle',
      ],
      vehicleButtonCandidates: [
        'button[data-id="drop_vehicle"]',
      ],
      subtypeSelectCandidates: [
        '#text_subtype',
        '#text_subtipo',
        '#subtype',
        '#subtipo',
        'select[name*="subtype"]',
        'select[name*="subtipo"]',
      ],
      optimizeButton: 'button[onclick="optimize()"]',
      result: '#optimizationResult',
      map: '#map',
      operationTypeSelect: '#text_operatio_type',
      serviceTypeSelect: '#text_service_type',
      createTripButton: 'button[onclick="createTrip()"]',
      driverSelects: 'select.driver-select[data-vehicle]',
      alerts: '#optimizationResult .alert-danger, #optimizationResult .alert-warning, .alert-danger, .alert-warning',
    },
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.debug('Navegando a Última Milla > Asignar pedidos');
    await this.page.goto('/order/asignar');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.selectors.filters.btnSearch, {
      state: 'visible',
      timeout: 15000,
    });
  }

  async searchOrders(criteria: AssignmentSearchCriteria): Promise<Locator> {
    return this.withActionScreenshot('ultimamilla-asignar-search-error', async () => {
      logger.info(
        `Buscando pedidos asignables. cliente=${criteria.cliente} | unidad=${criteria.unidadNegocio} | fecha=${formatSearchDateDiagnostic(criteria.fecha)}`
      );

      await this.resetPersistedFilters();
      await this.clearTextSearch();
      await this.selectCliente(criteria.cliente);
      await this.selectUnidadNegocio(criteria.unidadNegocio);
      if (criteria.fecha) {
        await this.setFechaEntrega(criteria.fecha);
      } else {
        logger.info('No se recibió fecha explícita para la búsqueda; se usará la fecha por defecto visible en UI.');
      }

      const searchResponsePromise = this.page.waitForResponse(
        response => response.request().method() === 'POST' && response.url().includes('/order/searchassign'),
        { timeout: 15000 }
      );

      await this.click(this.selectors.filters.btnSearch);

      const response = await searchResponsePromise;
      logger.info(`Búsqueda ejecutada. status=${response.status()} url=${response.url()}`);

      await this.waitForSearchSettled();

      return this.resolveSearchOutcome(criteria);
    });
  }

  async selectFirstOrderRow(): Promise<string> {
    return this.withActionScreenshot('ultimamilla-asignar-select-row-error', async () => {
      const firstRow = this.page.locator(this.selectors.table.firstRow).first();
      await firstRow.waitFor({ state: 'visible', timeout: 10000 });
      await firstRow.scrollIntoViewIfNeeded();

      const rowId = (await firstRow.getAttribute('data-id')) || '';
      const beforeSelection = await this.getAssignmentGridSnapshot();
      const clickStrategies = [
        'label-for',
        'ancestor-label',
        'checkbox-cell',
        'checkbox-wrapper',
        'table-row',
        'native-checkbox-click',
        'native-checkbox-dispatch',
      ] as const satisfies readonly RowSelectionStrategy[];

      for (const strategy of clickStrategies) {
        logger.debug(
          `Intentando seleccionar fila de asignación. data-id=${rowId || 'sin data-id'} | estrategia=${strategy}`
        );

        await this.page.waitForTimeout(200);
        const clicked = await this.tryClickRowSelectionTarget(firstRow, strategy);
        const selected = clicked
          ? await this.waitForRowSelectionEffect(firstRow, rowId, beforeSelection.checkedRowIds.length)
          : false;
        if (clicked && selected) {
          logger.info(
            `✅ Fila seleccionada correctamente. data-id=${rowId || 'sin data-id'} | estrategia=${strategy}`
          );
          return rowId;
        }

        logger.debug(`La estrategia ${strategy} no dejó la fila seleccionada. data-id=${rowId || 'sin data-id'}`);
      }

      const diagnostics = await this.getRowSelectionDiagnostics(firstRow, rowId);
      await this.takeScreenshot('ultimamilla-asignar-select-row-diagnostic');
      throw new UltimaMillaAssignmentConfigurationError(
        `No se pudo seleccionar la fila de asignación. data-id=${rowId || 'sin data-id'} diagnostics=${JSON.stringify(diagnostics)}`
      );

    });
  }

  async validateOptimizationPrerequisites(): Promise<OptimizationDiagnostics> {
    return this.withActionScreenshot('ultimamilla-asignar-optimization-prerequisites-error', async () => {
      const selectedOrderCount = await this.page.locator(this.selectors.table.checkedRows).count();
      if (selectedOrderCount === 0) {
        throw new UltimaMillaAssignmentConfigurationError(
          'No se puede configurar la optimización: no hay pedidos seleccionados en la grilla.'
        );
      }

      const tipoSelector = await this.resolveSelectSelector(
        this.selectors.optimization.typeSelectCandidates,
        'Tipo de optimización'
      );
      const modoSelector = await this.resolveSelectSelector(
        this.selectors.optimization.modeSelectCandidates,
        'Modo de optimización'
      );
      const transportistaSelector = await this.resolveSelectSelector(
        this.selectors.optimization.carrierSelectCandidates,
        'Transportista',
        /qa_tra_/i
      );
      const vehiculoSelector = await this.resolveVehicleSelectSelector();
      const subtipoSelector = await this.tryResolveSelectSelector(this.selectors.optimization.subtypeSelectCandidates);

      const tipoOptions = await this.getUsableOptions(tipoSelector);
      const modoOptions = await this.getUsableOptions(modoSelector);
      const transportistaOptions = await this.getUsableOptions(transportistaSelector);
      const vehiculoOptions = await this.getUsableOptions(vehiculoSelector);
      const tipoSelected = await this.getSelectedOptionTexts(tipoSelector);
      const modoSelected = await this.getSelectedOptionTexts(modoSelector);
      const transportistaSelected = await this.getSelectedOptionTexts(transportistaSelector);
      const vehiculoSelected = await this.getSelectedOptionTexts(vehiculoSelector);
      const subtipoOptions = subtipoSelector ? await this.getUsableOptions(subtipoSelector) : undefined;

      await this.ensureSelectHasUsableOptions(tipoSelector, 'Tipo de optimización');
      await this.ensureSelectHasUsableOptions(modoSelector, 'Modo de optimización');
      await this.ensureSelectHasUsableOptions(transportistaSelector, 'Transportista');

      const zoneAlerts = await this.page
        .locator(this.selectors.optimization.alerts)
        .allTextContents()
        .then(values => values.map(value => value.trim()).filter(Boolean))
        .catch(() => [] as string[]);
      const hasZoneConfiguration = !zoneAlerts.some(alert => /zona|zone/i.test(alert));

      if (!hasZoneConfiguration) {
        throw new UltimaMillaAssignmentConfigurationError(
          `La unidad de negocio no tiene una zona válida para optimización. alertas=[${zoneAlerts.join(' | ')}]`
        );
      }

      logger.info(`✅ Prerrequisitos validados. pedidos=${selectedOrderCount} | zonaValida=${hasZoneConfiguration}`);
      logger.debug(
        `Detalle prerrequisitos. tipo=${tipoSelector} (${tipoOptions.length} opciones, seleccionado=${tipoSelected.join(', ') || 'ninguno'}) | modo=${modoSelector} (${modoOptions.length} opciones, seleccionado=${modoSelected.join(', ') || 'ninguno'}) | transportista=${transportistaSelector} (${transportistaOptions.length} opciones, seleccionado=${transportistaSelected.join(', ') || 'ninguno'}) | vehiculo=${vehiculoSelector} (${vehiculoOptions.length} opciones, seleccionado=${vehiculoSelected.join(', ') || 'ninguno'})${subtipoSelector ? ` | subtipo=${subtipoSelector} (${subtipoOptions?.length || 0} opciones)` : ' | subtipo=opcional-no-detectado'}`
      );

      return {
        selectedOrderCount,
        tipoSelector,
        modoSelector,
        transportistaSelector,
        vehiculoSelector,
        subtipoSelector,
        zoneAlerts,
        hasZoneConfiguration,
        tipoOptionCount: tipoOptions.length,
        modoOptionCount: modoOptions.length,
        transportistaOptionCount: transportistaOptions.length,
        vehiculoOptionCount: vehiculoOptions.length,
        tipoSelected,
        modoSelected,
        transportistaSelected,
        vehiculoSelected,
        subtipoOptionCount: subtipoOptions?.length,
      };
    });
  }

  async configureOptimization(
    config: OptimizationConfig = {
      tipo: 'rutas más rápidas',
      modo: 'Flexible',
    }
  ): Promise<CarrierVehicleSelection> {
    return this.withActionScreenshot('ultimamilla-asignar-configure-optimization-error', async () => {
      const diagnostics = await this.validateOptimizationPrerequisites();

      await this.selectByVisibleText(
        diagnostics.tipoSelector,
        this.selectors.optimization.typeButtonCandidates,
        config.tipo,
        'Tipo de optimización'
      );
      await this.selectByVisibleText(
        diagnostics.modoSelector,
        this.selectors.optimization.modeButtonCandidates,
        config.modo,
        'Modo de optimización'
      );

      return this.probeCarrierAndVehicle(diagnostics.transportistaSelector, diagnostics.vehiculoSelector);
    });
  }

  async executeOptimization(): Promise<void> {
    return this.withActionScreenshot('ultimamilla-asignar-execute-optimization-error', async () => {
      logger.info('Ejecutando optimización de Última Milla');
      await this.page.locator(this.selectors.optimization.optimizeButton).waitFor({ state: 'visible', timeout: 10000 });
      await this.click(this.selectors.optimization.optimizeButton);
      await Promise.all([
        this.page.locator(this.selectors.optimization.result).waitFor({ state: 'visible', timeout: 30000 }),
        this.page.locator(this.selectors.optimization.map).waitFor({ state: 'visible', timeout: 30000 }),
      ]);
      logger.info('✅ Optimización completada: resultados y mapa visibles');
    });
  }

  async configurePostOptimizationTrip(): Promise<TripConfigurationResult> {
    return this.withActionScreenshot('ultimamilla-asignar-post-optimization-trip-error', async () => {
      logger.info('Configurando operación, servicio y conductores');

      await this.page.locator(this.selectors.optimization.result).waitFor({ state: 'visible', timeout: 30000 });
      await this.page.locator(this.selectors.optimization.map).waitFor({ state: 'visible', timeout: 30000 });

      const previousServiceSignature = await this.getOptionSignature(this.selectors.optimization.serviceTypeSelect);

      await this.selectDefaultOperationType(previousServiceSignature);
      await this.selectDefaultServiceType();

      const driverSelections = await this.assignDrivers();
      const operationValue = await this.getSelectedOptionText(this.selectors.optimization.operationTypeSelect);
      const serviceValue = await this.getSelectedOptionText(this.selectors.optimization.serviceTypeSelect);

      logger.info(
        `✅ Configuración post-optimización completa. operacion=${operationValue || 'sin-seleccion'} | servicio=${serviceValue || 'sin-seleccion'} | conductores=${driverSelections.join(' | ') || 'sin-conductores'}`
      );

      return {
        operationValue,
        serviceValue,
        driverSelections,
      };
    });
  }

  async createTrip(): Promise<void> {
    return this.withActionScreenshot('ultimamilla-asignar-create-trip-error', async () => {
      const preflight = await this.validateCreateTripPreflight();
      const gridBeforeCreate = await this.getAssignmentGridSnapshot();

      const createTripResponsePromise = this.page.waitForResponse(
        response => response.request().method() === 'POST' && response.url().includes('/order/createtrip'),
        { timeout: 30000 }
      );
      const refreshResponsePromise = this.page
        .waitForResponse(
          response => response.request().method() === 'POST' && response.url().includes('/order/searchassign'),
          { timeout: 15000 }
        )
        .catch(() => null);
      const gridMutationPromise = this.waitForAssignmentGridMutation(gridBeforeCreate).catch(() => false);

      await this.page.locator(this.selectors.optimization.createTripButton).waitFor({ state: 'visible', timeout: 10000 });
      logger.info(
        `Creando viaje. operacion=${preflight.operationValue} | servicio=${preflight.serviceValue} | conductores=${preflight.driverSelections.join(' | ')}`
      );
      await this.click(this.selectors.optimization.createTripButton);

      const response = await createTripResponsePromise;
      if (!response.ok()) {
        throw new UltimaMillaAssignmentConfigurationError(
          `POST /order/createtrip falló. status=${response.status()} url=${response.url()}`
        );
      }
      logger.info(`✅ POST /order/createtrip OK. status=${response.status()} url=${response.url()}`);

      const refreshResponse = await refreshResponsePromise;
      if (refreshResponse) {
        if (!refreshResponse.ok()) {
          throw new UltimaMillaAssignmentConfigurationError(
            `La recarga de la grilla posterior a createTrip falló. status=${refreshResponse.status()} url=${refreshResponse.url()}`
          );
        }
        logger.info(`Refresh de grilla detectado tras createTrip. status=${refreshResponse.status()} url=${refreshResponse.url()}`);
      } else {
        logger.warn('No se capturó POST /order/searchassign luego de createTrip; se validará refresh por estado visual.');
      }

      const gridMutated = await gridMutationPromise;

      await this.waitForSearchSettled();
      await this.page.locator(this.selectors.optimization.result).waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
        throw new UltimaMillaAssignmentConfigurationError(
          'El panel de optimización no se ocultó después de crear el viaje.'
        );
      });

      await this.page.waitForFunction(
        ({ tableWrapperSelector, noDataSelector }) => {
          const tableWrapper = document.querySelector(tableWrapperSelector) as HTMLElement | null;
          const noData = document.querySelector(noDataSelector) as HTMLElement | null;

          const tableVisible = Boolean(tableWrapper && tableWrapper.offsetParent !== null);
          const noDataVisible = Boolean(noData && noData.offsetParent !== null);

          return tableVisible || noDataVisible;
        },
        {
          tableWrapperSelector: this.selectors.table.wrapper,
          noDataSelector: this.selectors.states.noData,
        },
        { timeout: 15000 }
      );

      const gridAfterCreate = await this.getAssignmentGridSnapshot();
      if (gridAfterCreate.checkedRowIds.length > 0) {
        throw new UltimaMillaAssignmentConfigurationError(
          `La grilla no se refrescó correctamente; aún hay ${gridAfterCreate.checkedRowIds.length} fila(s) seleccionada(s).`
        );
      }

      if (!refreshResponse && !gridMutated) {
        throw new UltimaMillaAssignmentConfigurationError(
          'No se detectó señal de refresh de la grilla después de createTrip: sin POST /order/searchassign y sin mutación visible en la tabla.'
        );
      }

      if (
        gridBeforeCreate.signature === gridAfterCreate.signature &&
        !gridAfterCreate.noDataVisible &&
        !refreshResponse
      ) {
        throw new UltimaMillaAssignmentConfigurationError(
          'La grilla conservó exactamente la misma firma después de createTrip y no hubo señal de recarga HTTP.'
        );
      }

      logger.info(
        `✅ Viaje creado correctamente. panelOptimizadoOculto=true | refreshHttp=${Boolean(refreshResponse)} | gridMutated=${gridMutated} | filasAntes=${gridBeforeCreate.rowIds.length} | filasDespues=${gridAfterCreate.rowIds.length}`
      );
    });
  }

  async isOptimizationResultVisible(): Promise<boolean> {
    return this.page.locator(this.selectors.optimization.result).isVisible().catch(() => false);
  }

  async isMapVisible(): Promise<boolean> {
    return this.page.locator(this.selectors.optimization.map).isVisible().catch(() => false);
  }

  async getSelectedCarrierLabel(): Promise<string> {
    const selector = await this.resolveSelectSelector(
      this.selectors.optimization.carrierSelectCandidates,
      'Transportista',
      /qa_tra_/i
    );
      return this.getSelectedOptionText(selector);
  }

  async getSelectedVehicleLabel(): Promise<string> {
    const selector = await this.resolveVehicleSelectSelector();
    return this.getSelectedOptionText(selector);
  }

  async hasSingleSelectedCarrier(): Promise<boolean> {
    const selector = await this.resolveSelectSelector(
      this.selectors.optimization.carrierSelectCandidates,
      'Transportista',
      /qa_tra_/i
    );
    const selected = await this.getSelectedOptions(selector);
    return selected.length === 1;
  }

  private async withActionScreenshot<T>(screenshotName: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Falló acción en UltimaMillaAsignarPage: ${screenshotName}`, error);
      await this.takeScreenshot(screenshotName);
      throw error;
    }
  }

  private async withCreateTripStage<T>(stageName: string, screenshotName: string, action: () => Promise<T>): Promise<T> {
    return this.withActionScreenshot(screenshotName, async () => {
      logger.debug(`CreateTrip stage start: ${stageName}`);
      const result = await action();
      logger.debug(`CreateTrip stage done: ${stageName}`);
      return result;
    });
  }

  private async resetPersistedFilters(): Promise<void> {
    logger.debug('Limpiando filtros persistidos de orderAssignFilters');
    await this.page
      .evaluate(() => {
        window.localStorage.removeItem('orderAssignFilters');
      })
      .catch(error => {
        logger.warn('No se pudo limpiar localStorage.orderAssignFilters; continuando con override explícito.', error);
      });
  }

  private async clearTextSearch(): Promise<void> {
    logger.debug('Asegurando flujo base sin filtro textual activo');
    const searchInput = this.page.locator(this.selectors.filters.textSearch);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('');
    }
  }

  private async selectCliente(cliente: string): Promise<void> {
    logger.debug(`Seleccionando cliente exacto: ${cliente}`);
    await this.selectExactOption({
      selectSelector: this.selectors.filters.clienteSelect,
      buttonSelector: this.selectors.filters.clienteButton,
      valueText: cliente,
      fieldName: 'Cliente',
    });
  }

  private async selectUnidadNegocio(unidadNegocio: string): Promise<void> {
    logger.debug(`Seleccionando unidad de negocio exacta: ${unidadNegocio}`);
    await this.selectExactOption({
      selectSelector: this.selectors.filters.unidadNegocioSelect,
      buttonSelector: this.selectors.filters.unidadNegocioButton,
      valueText: unidadNegocio,
      fieldName: 'Unidad de Negocio',
    });
  }

  private async setFechaEntrega(fecha: string): Promise<void> {
    logger.debug(`Configurando fecha exacta de entrega: ${fecha}`);

    await this.page.evaluate(
      ({ selector, value }) => {
        const input = document.querySelector(selector) as HTMLInputElement | null;
        if (!input) {
          throw new Error(`No se encontró el input de fecha ${selector}`);
        }

        input.removeAttribute('readonly');
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      },
      { selector: this.selectors.filters.fechaEntrega, value: fecha }
    );
  }

  private async selectExactOption(params: {
    selectSelector: string;
    buttonSelector: string;
    valueText: string;
    fieldName: string;
  }): Promise<void> {
    const nativeOption = await this.findNativeOption(params.selectSelector, params.valueText);

    if (nativeOption) {
      logger.debug(`Usando select nativo para ${params.fieldName}. value=${nativeOption.value}`);
      await this.selectSingleNativeValue(params.selectSelector, nativeOption.value, params.fieldName);
      await this.page.waitForTimeout(500);
      return;
    }

    logger.warn(`No se encontró opción nativa exacta para ${params.fieldName}. Aplicando fallback Bootstrap Select.`);
    await this.selectExactBootstrapOption(params.buttonSelector, params.valueText, params.fieldName);
    await this.page.waitForTimeout(500);
  }

  private async findNativeOption(selectSelector: string, valueText: string): Promise<{ value: string; text: string } | null> {
    return this.page.evaluate(
      ({ selector, expectedText }) => {
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
        const select = document.querySelector(selector) as HTMLSelectElement | null;

        if (!select) {
          return null;
        }

        const expected = normalize(expectedText);
        const option = Array.from(select.options).find(candidate => normalize(candidate.text) === expected);

        if (!option) {
          return null;
        }

        return {
          value: option.value,
          text: option.text.trim(),
        };
      },
      { selector: selectSelector, expectedText: valueText }
    );
  }

  private async selectExactBootstrapOption(buttonSelector: string, valueText: string, fieldName: string): Promise<void> {
    const button = this.page.locator(buttonSelector).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.evaluate(element => (element as HTMLElement).click());

    const searchInput = this.page.locator(this.selectors.dropdown.searchInput).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(valueText);
      await this.page.waitForTimeout(400);
    }

    const options = this.page.locator(this.selectors.dropdown.options);
    const optionCount = await options.count().catch(() => 0);

    for (let index = 0; index < optionCount; index++) {
      const option = options.nth(index);
      const optionText = (await option.textContent().catch(() => ''))?.replace(/\s+/g, ' ').trim().toLowerCase();

      if (optionText === valueText.replace(/\s+/g, ' ').trim().toLowerCase()) {
        await option.evaluate(element => (element as HTMLElement).click());
        logger.info(`✅ ${fieldName} seleccionado vía Bootstrap fallback: ${valueText}`);
        return;
      }
    }

    const availableOptions = await this.page
      .locator(this.selectors.dropdown.options)
      .evaluateAll(elements =>
        elements
          .map(element => (element as HTMLElement).innerText.trim())
          .filter(Boolean)
          .slice(0, 20)
      )
      .catch(() => [] as string[]);

    throw new UltimaMillaAssignmentConfigurationError(
      `${fieldName} exacto no encontrado en Bootstrap fallback. esperado="${valueText}" opciones=[${availableOptions.join(' | ')}]`
    );
  }

  private async waitForSearchSettled(): Promise<void> {
    const loadingModal = this.page.locator(this.selectors.states.loadingModal);
    await loadingModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      logger.debug('El modal de carga no estaba visible o ya fue ocultado.');
    });
  }

  private async resolveSearchOutcome(criteria: AssignmentSearchCriteria): Promise<Locator> {
    const rows = this.page.locator(this.selectors.table.rows);
    const emptyState = this.page.locator(this.selectors.states.noData);

    const outcome = await Promise.race<{
      type: 'rows' | 'no-data';
      count?: number;
      message?: string;
    }>([
      rows.first().waitFor({ state: 'visible', timeout: 10000 }).then(async () => ({
        type: 'rows' as const,
        count: await rows.count(),
      })),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(async () => ({
        type: 'no-data' as const,
        message: (await emptyState.textContent())?.trim() || '',
      })),
    ]);

    if (outcome.type === 'rows') {
      logger.info(`✅ Búsqueda con resultados. filasDetectadas=${outcome.count || 0}`);
      return rows.first();
    }

    const diagnosticError = new UltimaMillaSearchNoDataError(criteria, outcome.message || 'sin texto visible');
    logger.error(diagnosticError.message);
    throw diagnosticError;
  }

  private async tryResolveSelectSelector(candidates: string[]): Promise<string | undefined> {
    for (const candidate of candidates) {
      const count = await this.page.locator(candidate).count().catch(() => 0);
      if (count > 0) {
        return candidate;
      }
    }
    return undefined;
  }

  private async resolveSelectSelector(
    candidates: string[],
    fieldName: string,
    preferredOptionPattern?: RegExp,
    allowEmpty = false,
    allowDynamicDiscovery = true
  ): Promise<string> {
    for (const candidate of candidates) {
      const count = await this.page.locator(candidate).count().catch(() => 0);
      if (count === 0) {
        continue;
      }

      if (!preferredOptionPattern) {
        return candidate;
      }

      const options = await this.getSelectOptions(candidate);
      if (options.some(option => preferredOptionPattern.test(option.text))) {
        return candidate;
      }

      if (allowEmpty && options.length === 0) {
        return candidate;
      }
    }

    if (preferredOptionPattern && allowDynamicDiscovery) {
      const discoveredSelector = await this.discoverSelectByOptionPattern(preferredOptionPattern);
      if (discoveredSelector) {
        logger.warn(`Selector de ${fieldName} resuelto por inspección dinámica: ${discoveredSelector}`);
        return discoveredSelector;
      }
    }

    throw new UltimaMillaAssignmentConfigurationError(`No se pudo resolver el selector de ${fieldName}. candidatos=[${candidates.join(' | ')}]`);
  }

  private async discoverSelectByOptionPattern(pattern: RegExp): Promise<string | undefined> {
    const expression = pattern.source;
    const flags = pattern.flags;
    const id = await this.page.evaluate(
      ({ source, regexFlags }) => {
        const regex = new RegExp(source, regexFlags);
        const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
        const match = selects.find(select =>
          Array.from(select.options).some(option => regex.test(option.text.trim()))
        );
        return match?.id || null;
      },
      { source: expression, regexFlags: flags }
    );

    return id ? `#${id}` : undefined;
  }

  private async ensureSelectHasUsableOptions(selectSelector: string, fieldName: string): Promise<void> {
    const options = await this.getUsableOptions(selectSelector);
    if (options.length === 0) {
      throw new UltimaMillaAssignmentConfigurationError(
        `${fieldName} no tiene opciones utilizables. selector=${selectSelector}`
      );
    }
  }

  private async getSelectOptions(selectSelector: string): Promise<SelectOptionData[]> {
    return this.page.evaluate(selector => {
      const select = document.querySelector(selector) as HTMLSelectElement | null;
      if (!select) {
        return [] as SelectOptionData[];
      }

      return Array.from(select.options).map(option => ({
        value: option.value,
        text: option.text.trim(),
        disabled: option.disabled,
        selected: option.selected,
      }));
    }, selectSelector);
  }

  private async getUsableOptions(selectSelector: string): Promise<SelectOptionData[]> {
    const options = await this.getSelectOptions(selectSelector);
    return options.filter(option => !option.disabled && option.value.trim().length > 0 && option.text.trim().length > 0);
  }

  private async selectSingleNativeValue(selectSelector: string, value: string, fieldName: string): Promise<void> {
    await this.page.evaluate(
      ({ selector, optionValue }) => {
        const select = document.querySelector(selector) as HTMLSelectElement | null;
        if (!select) {
          throw new Error(`No se encontró select ${selector}`);
        }

        select.value = optionValue;
        Array.from(select.options).forEach(option => {
          option.selected = option.value === optionValue;
        });

        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        const windowWithJQuery = window as Window & {
          jQuery?: (selector: Element) => {
            selectpicker?: (action?: string, value?: string) => void;
            trigger?: (eventName: string) => void;
          };
        };

        if (windowWithJQuery.jQuery) {
          const jq = windowWithJQuery.jQuery(select);
          jq.selectpicker?.('val', optionValue);
          jq.selectpicker?.('refresh');
          jq.trigger?.('change');
        }
      },
      { selector: selectSelector, optionValue: value }
    );

    await this.page.waitForTimeout(1000);
    const selectedOptions = await this.getSelectedOptions(selectSelector);
    if (selectedOptions.length !== 1 || selectedOptions[0]?.value !== value) {
      throw new UltimaMillaAssignmentConfigurationError(
        `${fieldName} no quedó seleccionado de forma única. selector=${selectSelector} esperado=${value} obtenido=[${selectedOptions.map(option => option.value).join(' | ')}]`
      );
    }
  }

  private async getSelectedOptions(selectSelector: string): Promise<SelectOptionData[]> {
    const options = await this.getSelectOptions(selectSelector);
    return options.filter(option => option.selected && option.value.trim().length > 0);
  }

  private async ensureSingleSelectedValue(selectSelector: string, expectedValue: string, fieldName: string): Promise<void> {
    const selectedOptions = await this.getSelectedOptions(selectSelector);
    if (selectedOptions.length !== 1 || selectedOptions[0]?.value !== expectedValue) {
      throw new UltimaMillaAssignmentConfigurationError(
        `${fieldName} no quedó en selección única. selector=${selectSelector} esperado=${expectedValue} obtenido=[${selectedOptions.map(option => `${option.value}:${option.text}`).join(' | ')}]`
      );
    }
  }

  private async selectByVisibleText(
    selectSelector: string,
    buttonCandidates: string[],
    expectedText: string,
    fieldName: string
  ): Promise<void> {
    const option = await this.findBestTextOption(selectSelector, expectedText);
    if (option) {
      await this.selectSingleNativeValue(selectSelector, option.value, fieldName);
      logger.info(`✅ ${fieldName} seleccionado por value nativo. value=${option.value} text=${option.text}`);
      return;
    }

    const bootstrapButton = await this.resolveButtonSelector(buttonCandidates);
    if (!bootstrapButton) {
      throw new UltimaMillaAssignmentConfigurationError(
        `${fieldName} no encontró opción "${expectedText}" ni botón Bootstrap fallback.`
      );
    }

    logger.warn(`No se encontró opción nativa exacta para ${fieldName}. Aplicando fallback Bootstrap Select.`);
    await this.selectExactBootstrapOption(bootstrapButton, expectedText, fieldName);
  }

  private async resolveButtonSelector(candidates: string[]): Promise<string | undefined> {
    for (const candidate of candidates) {
      const count = await this.page.locator(candidate).count().catch(() => 0);
      if (count > 0) {
        return candidate;
      }
    }
    return undefined;
  }

  private async findBestTextOption(selectSelector: string, expectedText: string): Promise<SelectOptionData | undefined> {
    const normalizedExpected = this.normalizeValue(expectedText);
    const options = await this.getUsableOptions(selectSelector);
    return options.find(option => this.normalizeValue(option.text) === normalizedExpected);
  }

  private async resolveVehicleSelectSelector(): Promise<string> {
    const primarySelector = '#drop_vehicle';
    if (await this.page.locator(primarySelector).count().catch(() => 0)) {
      return primarySelector;
    }

    const fallbackButton = 'button[data-id="drop_vehicle"]';
    const fallbackCount = await this.page.locator(fallbackButton).count().catch(() => 0);
    if (fallbackCount === 0) {
      throw new UltimaMillaAssignmentConfigurationError(
        `No se pudo resolver el selector de Vehículo. select=${primarySelector} fallback=${fallbackButton}`
      );
    }

    const resolvedSelector = await this.page.evaluate(buttonSelector => {
      const button = document.querySelector(buttonSelector) as HTMLElement | null;
      if (!button) {
        return null;
      }

      const bootstrapWrapper = button.closest('.bootstrap-select');
      const siblingSelect = bootstrapWrapper?.previousElementSibling;
      if (siblingSelect instanceof HTMLSelectElement && siblingSelect.id) {
        return `#${siblingSelect.id}`;
      }

      return null;
    }, fallbackButton);

    if (resolvedSelector) {
      logger.warn(`Selector de Vehículo resuelto mediante fallback Bootstrap del flujo asignar: ${resolvedSelector}`);
      return resolvedSelector;
    }

    throw new UltimaMillaAssignmentConfigurationError(
      `Se detectó ${fallbackButton} pero no se pudo recuperar el select nativo asociado para Vehículo.`
    );
  }

  private normalizeValue(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private async probeCarrierAndVehicle(
    carrierSelector: string,
    vehicleSelector: string
  ): Promise<CarrierVehicleSelection> {
    const carrierOptions = await this.getUsableOptions(carrierSelector);
    const prioritizedCarriers = [...carrierOptions].sort((left, right) => {
      const leftIsQa = /^qa_tra_/i.test(left.text);
      const rightIsQa = /^qa_tra_/i.test(right.text);
      if (leftIsQa !== rightIsQa) {
        return leftIsQa ? -1 : 1;
      }
      return left.text.localeCompare(right.text) || left.value.localeCompare(right.value);
    });

    let attemptedFallback = false;
    const probeDiagnostics: string[] = [];

    for (const carrier of prioritizedCarriers) {
      const isQaCarrier = /^qa_tra_/i.test(carrier.text);
      attemptedFallback = attemptedFallback || !isQaCarrier;

      logger.debug(
        `Probing transportista. text=${carrier.text} | value=${carrier.value} | preferredQa=${isQaCarrier}`
      );

      const vehicleResponsePromise = this.page
        .waitForResponse(
          response => response.request().method() === 'POST' && response.url().includes('/vehiculos/findvehicles'),
          { timeout: 10000 }
        )
        .catch(() => null);

      await this.selectSingleNativeValue(carrierSelector, carrier.value, 'Transportista');
      await this.ensureSingleSelectedValue(carrierSelector, carrier.value, 'Transportista');

      const vehicleResponse = await vehicleResponsePromise;
      const vehicleResponseDiagnostics = vehicleResponse
        ? await this.inspectVehicleResponse(vehicleResponse)
        : null;

      if (vehicleResponse) {
        logger.debug(
          `Respuesta /vehiculos/findvehicles capturada. status=${vehicleResponseDiagnostics?.status} ok=${vehicleResponseDiagnostics?.ok} snippet=${vehicleResponseDiagnostics?.bodySnippet || 'sin-body'}`
        );
      } else {
        logger.warn(`No se capturó respuesta /vehiculos/findvehicles para transportista=${carrier.text}. Continuando con inspección del select.`);
      }

      await this.page.waitForTimeout(1000);

      const vehicleOptions = await this.getUsableOptions(vehicleSelector);
      if (vehicleOptions.length === 0) {
        probeDiagnostics.push(
          `${carrier.text}: sin vehículos disponibles${vehicleResponseDiagnostics ? ` (status=${vehicleResponseDiagnostics.status}, body=${vehicleResponseDiagnostics.bodySnippet || 'sin-body'})` : ''}`
        );
        logger.warn(
          `Transportista sin vehículos utilizables. transportista=${carrier.text} | value=${carrier.value} | responseStatus=${vehicleResponseDiagnostics?.status ?? 'sin-respuesta'}`
        );
        continue;
      }

      const selectedVehicle = [...vehicleOptions].sort((left, right) => {
        const leftIsQa = /^qa_veh_/i.test(left.text);
        const rightIsQa = /^qa_veh_/i.test(right.text);
        if (leftIsQa !== rightIsQa) {
          return leftIsQa ? -1 : 1;
        }
        return left.text.localeCompare(right.text) || left.value.localeCompare(right.value);
      })[0];

      if (!selectedVehicle) {
        probeDiagnostics.push(`${carrier.text}: vehículos detectados pero no seleccionables`);
        continue;
      }

      await this.selectSingleNativeValue(vehicleSelector, selectedVehicle.value, 'Vehículo');
      await this.ensureSingleSelectedValue(vehicleSelector, selectedVehicle.value, 'Vehículo');

      const result: CarrierVehicleSelection = {
        carrierValue: carrier.value,
        carrierLabel: carrier.text,
        vehicleValue: selectedVehicle.value,
        vehicleLabel: selectedVehicle.text,
        usedFallbackCarrier: !isQaCarrier,
      };

      if (result.usedFallbackCarrier) {
        logger.warn(`Fallback determinístico aplicado para transportista: ${carrier.text}`);
      }

      logger.info(
        `✅ Transportista y vehículo configurados. transportista=${result.carrierLabel} | vehiculo=${result.vehicleLabel}`
      );

      return result;
    }

    logger.error(
      `No se encontró un transportista con vehículo disponible. fallbackIntentado=${attemptedFallback} | intentos=${probeDiagnostics.join(' | ') || 'sin diagnósticos'}`
    );
    await this.takeScreenshot('ultimamilla-asignar-no-vehicles-available');
    throw new UltimaMillaAssignmentConfigurationError(
      `No se encontró un transportista con vehículo disponible. intentos=[${probeDiagnostics.join(' | ')}]`
    );
  }

  private async inspectVehicleResponse(response: import('playwright').Response): Promise<VehicleResponseDiagnostics> {
    const bodySnippet = await response
      .text()
      .then(body => body.replace(/\s+/g, ' ').trim().slice(0, 240))
      .catch(() => 'body-no-disponible');

    return {
      status: response.status(),
      ok: response.ok(),
      url: response.url(),
      bodySnippet,
    };
  }

  private async waitForOptionalResponse(endpointFragment: string): Promise<void> {
    await this.waitForOptionalResponseAfterAction(endpointFragment, async () => {
      // no-op: preserved for legacy callers
    });
  }

  private async selectDefaultOperationType(previousServiceSignature: string): Promise<void> {
    await this.withActionScreenshot('ultimamilla-asignar-operation-type-error', async () => {
      logger.debug('Seleccionando Tipo de Operación = defecto');
      await this.waitForOptionalResponseAfterAction('/getServiceType', async () => {
        await this.selectByVisibleText(
          this.selectors.optimization.operationTypeSelect,
          ['button[data-id="text_operatio_type"]'],
          'defecto',
          'Tipo de Operación'
        );
      });

      await this.waitForServiceTypeReload(previousServiceSignature);

      const operationValue = await this.getSelectedOptionText(this.selectors.optimization.operationTypeSelect);
      logger.info(`✅ Tipo de Operación configurado: ${operationValue || 'sin-seleccion'}`);
    });
  }

  private async waitForServiceTypeReload(previousSignature: string): Promise<void> {
    await this.withActionScreenshot('ultimamilla-asignar-service-reload-error', async () => {
      logger.debug(
        `Esperando recarga de Tipo de Servicio tras seleccionar operación. firmaPrevia=${previousSignature || 'sin-opciones'}`
      );

      await this.page.waitForFunction(
        ({ selector, oldSignature }) => {
          const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
          const select = document.querySelector(selector) as HTMLSelectElement | null;
          if (!select || select.disabled) {
            return false;
          }

          const options = Array.from(select.options)
            .filter(option => !option.disabled && option.value.trim().length > 0 && option.text.trim().length > 0)
            .map(option => `${option.value}::${normalize(option.text)}`);

          if (options.length === 0) {
            return false;
          }

          const signature = options.join('|');
          const hasDefecto = options.some(option => option.includes('::defecto'));
          return hasDefecto && (signature !== oldSignature || oldSignature.length === 0 || select.selectedIndex <= 0);
        },
        { selector: this.selectors.optimization.serviceTypeSelect, oldSignature: previousSignature },
        { timeout: 15000 }
      );

      const currentSignature = await this.getOptionSignature(this.selectors.optimization.serviceTypeSelect);
      const serviceOptions = await this.getUsableOptions(this.selectors.optimization.serviceTypeSelect);
      logger.debug(
        `✅ Tipo de Servicio recargado. firmaActual=${currentSignature || 'sin-opciones'} | opciones=${serviceOptions.map(option => option.text).join(' | ') || 'sin-opciones'}`
      );
    });
  }

  private async selectDefaultServiceType(): Promise<void> {
    await this.withActionScreenshot('ultimamilla-asignar-service-type-error', async () => {
      logger.debug('Seleccionando Tipo de Servicio = defecto');
      await this.ensureSelectHasUsableOptions(this.selectors.optimization.serviceTypeSelect, 'Tipo de Servicio');
      await this.selectByVisibleText(
        this.selectors.optimization.serviceTypeSelect,
        ['button[data-id="text_service_type"]'],
        'defecto',
        'Tipo de Servicio'
      );

      const serviceValue = await this.getSelectedOptionText(this.selectors.optimization.serviceTypeSelect);
      logger.info(`✅ Tipo de Servicio configurado: ${serviceValue || 'sin-seleccion'}`);
    });
  }

  private async waitForOptionalResponseAfterAction(
    endpointFragment: string,
    action: () => Promise<void>
  ): Promise<void> {
    const responsePromise = this.page
      .waitForResponse(
        response => response.request().method() === 'POST' && response.url().includes(endpointFragment),
        { timeout: 10000 }
      )
      .catch(() => null);

    await action();

    const response = await responsePromise;
    if (!response) {
      logger.warn(`No se capturó la respuesta esperada ${endpointFragment}; continuando tras recarga visual.`);
      await this.page.waitForTimeout(1000);
      return;
    }

    logger.debug(`Respuesta detectada para ${endpointFragment}. status=${response.status()} url=${response.url()}`);
    await this.page.waitForTimeout(1000);
  }

  private async getSelectedOptionTexts(selectSelector: string): Promise<string[]> {
    const selected = await this.getSelectedOptions(selectSelector);
    return selected.map(option => option.text).filter(Boolean);
  }

  private async waitForOptionalResponseLegacy(endpointFragment: string): Promise<void> {
    await this.page
      .waitForResponse(
        response => response.request().method() === 'POST' && response.url().includes(endpointFragment),
        { timeout: 10000 }
      )
      .catch(() => {
        logger.warn(`No se capturó la respuesta esperada ${endpointFragment}; continuando tras recarga visual.`);
      });
    await this.page.waitForTimeout(1000);
  }

  private async assignDrivers(): Promise<string[]> {
    return this.withActionScreenshot('ultimamilla-asignar-driver-selection-error', async () => {
      const routeContexts = await this.getDriverRouteContexts();

      if (routeContexts.length === 0) {
        throw new UltimaMillaAssignmentConfigurationError('No se detectaron selects de conductores para las rutas optimizadas.');
      }

      logger.debug(
        `Detectados ${routeContexts.length} select(s) dinámicos de conductor: ${routeContexts.map(route => `${route.selector}=>${route.vehicle}`).join(' | ')}`
      );

      const selections: string[] = [];

      for (const routeContext of routeContexts) {
        const options = await this.getUsableOptions(routeContext.selector);
        if (options.length === 0) {
          throw new UltimaMillaAssignmentConfigurationError(
            `La ruta ${routeContext.routeIndex} (vehículo=${routeContext.vehicle}) no tiene conductores seleccionables. selector=${routeContext.selector}`
          );
        }

        const selectedDriver = [...options].sort((left, right) => {
          const textComparison = this.normalizeValue(left.text).localeCompare(this.normalizeValue(right.text));
          return textComparison || left.value.localeCompare(right.value);
        })[0];

        if (!selectedDriver) {
          throw new UltimaMillaAssignmentConfigurationError(
            `La ruta ${routeContext.routeIndex} (vehículo=${routeContext.vehicle}) no pudo resolver un conductor determinístico.`
          );
        }

        logger.debug(
          `Seleccionando conductor determinístico para ruta ${routeContext.routeIndex}. vehiculo=${routeContext.vehicle} | selector=${routeContext.selector} | opciones=${options.map(option => option.text).join(' | ')}`
        );

        await this.selectSingleNativeValue(
          routeContext.selector,
          selectedDriver.value,
          `Conductor ruta ${routeContext.routeIndex} (${routeContext.vehicle})`
        );

        const selectedLabel = `${routeContext.vehicle}:${selectedDriver.text}`;
        selections.push(selectedLabel);
        logger.info(`✅ Conductor asignado a ruta ${routeContext.routeIndex}: ${selectedLabel}`);
      }

      return selections;
    });
  }

  private async getDriverRouteContexts(): Promise<DriverRouteContext[]> {
    const driverSelects = this.page.locator(this.selectors.optimization.driverSelects);
    const driverCount = await driverSelects.count();
    const contexts: DriverRouteContext[] = [];

    for (let index = 0; index < driverCount; index++) {
      const locator = driverSelects.nth(index);
      const driverSelector = await this.getUniqueSelectorForLocator(locator, index);
      const options = await this.getUsableOptions(driverSelector);
      const vehicle = await locator.getAttribute('data-vehicle').then(value => value?.trim() || `route-${index + 1}`);

      contexts.push({
        routeIndex: index + 1,
        selector: driverSelector,
        vehicle,
        optionCount: options.length,
      });
    }

    return contexts;
  }

  private async getUniqueSelectorForLocator(locator: Locator, index: number): Promise<string> {
    const metadata = await locator.evaluate((element, routeIndex) => {
      const select = element as HTMLSelectElement;
      if (select.id) {
        return { selector: `#${select.id}` };
      }

      const vehicle = select.getAttribute('data-vehicle');
      if (vehicle) {
        return { selector: `select.driver-select[data-vehicle="${vehicle}"]` };
      }

      return { selector: `select.driver-select[data-idx="${routeIndex}"]`, routeIndex };
    }, index);

    if (metadata.selector.includes('[data-idx=')) {
      await locator.evaluate((element, routeIndex) => {
        (element as HTMLSelectElement).setAttribute('data-idx', String(routeIndex));
      }, index);
    }

    return metadata.selector;
  }

  private async getSelectedOptionText(selectSelector: string): Promise<string> {
    const selected = await this.getSelectedOptions(selectSelector);
    return selected[0]?.text || '';
  }

  private async tryClickRowSelectionTarget(
    rowLocator: Locator,
    strategy: RowSelectionStrategy
  ): Promise<boolean> {
    try {
      switch (strategy) {
        case 'native-checkbox-click':
          await rowLocator.evaluate(element => (element as HTMLInputElement).click());
          return true;
        case 'native-checkbox-dispatch':
          await rowLocator.evaluate(element => {
            const input = element as HTMLInputElement;
            if (input.disabled) {
              return;
            }

            input.checked = true;
            input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return true;
        case 'label-for': {
          const inputId = await rowLocator.getAttribute('id');
          if (!inputId) {
            break;
          }

          const label = this.page.locator(`label[for="${inputId}"]`).first();
          if (await label.count()) {
            await label.click({ force: true, timeout: 5000 });
            return true;
          }
          break;
        }
        case 'ancestor-label': {
          const label = rowLocator.locator('xpath=ancestor::label[1]').first();
          if (await label.count()) {
            await label.click({ force: true, timeout: 5000 });
            return true;
          }
          break;
        }
        case 'checkbox-cell': {
          const cell = rowLocator.locator('xpath=ancestor::td[1]').first();
          if (await cell.count()) {
            await cell.click({ force: true, timeout: 5000 });
            return true;
          }
          break;
        }
        case 'checkbox-wrapper': {
          const wrapper = rowLocator.locator('xpath=..').first();
          if (await wrapper.count()) {
            await wrapper.click({ force: true, timeout: 5000 });
            return true;
          }
          break;
        }
        case 'table-row': {
          const tableRow = rowLocator.locator('xpath=ancestor::tr[1]').first();
          if (await tableRow.count()) {
            await tableRow.click({ force: true, timeout: 5000 });
            return true;
          }
          break;
        }
      }
    } catch (error) {
      logger.warn(`Falló click de selección con estrategia ${strategy}.`, error);
    }

    return false;
  }

  private async waitForRowSelectionEffect(rowLocator: Locator, rowId: string, previousCheckedCount: number): Promise<boolean> {
    await this.page.waitForTimeout(250);

    const selected = await this.page
      .waitForFunction(
        ({ rowSelector, rowDataId, previousCount }) => {
          const row = document.querySelector(rowSelector) as HTMLInputElement | null;
          const checkedRows = Array.from(document.querySelectorAll('input.row-check[data-id]:checked')) as HTMLInputElement[];
          const checkedRowIds = checkedRows
            .map(input => input.getAttribute('data-id')?.trim() || '')
            .filter(Boolean);
          const tableRow = row?.closest('tr');

          return Boolean(
            row?.checked ||
              (rowDataId && checkedRowIds.includes(rowDataId)) ||
              checkedRowIds.length > previousCount ||
              tableRow?.classList.contains('selected') ||
              tableRow?.classList.contains('table-active') ||
              tableRow?.getAttribute('aria-selected') === 'true'
          );
        },
        {
          rowSelector: this.getRowInputSelector(rowId),
          rowDataId: rowId,
          previousCount: previousCheckedCount,
        },
        { timeout: 1500 }
      )
      .then(() => true)
      .catch(() => false);

    if (!selected) {
      await this.page.waitForTimeout(250);
    }

    return selected && this.isOrderRowSelected(rowLocator, rowId, previousCheckedCount);
  }

  private async isOrderRowSelected(rowLocator: Locator, rowId: string, previousCheckedCount: number): Promise<boolean> {
    const isChecked = await rowLocator.isChecked().catch(() => false);
    if (isChecked) {
      return true;
    }

    const snapshot = await this.getAssignmentGridSnapshot();
    if (snapshot.checkedRowIds.includes(rowId) || snapshot.checkedRowIds.length > previousCheckedCount) {
      return true;
    }

    return rowLocator
      .evaluate(element => {
        const tableRow = (element as HTMLInputElement).closest('tr');
        return Boolean(
          tableRow?.classList.contains('selected') ||
            tableRow?.classList.contains('table-active') ||
            tableRow?.getAttribute('aria-selected') === 'true'
        );
      })
      .catch(() => false);
  }

  private async getRowSelectionDiagnostics(rowLocator: Locator, rowId: string): Promise<Record<string, unknown>> {
    const snapshot = await this.getAssignmentGridSnapshot();
    const isChecked = await rowLocator.isChecked().catch(() => false);
    const inputClass = await rowLocator.getAttribute('class').catch(() => null);
    const ariaChecked = await rowLocator.getAttribute('aria-checked').catch(() => null);
    const disabled = await rowLocator.isDisabled().catch(() => false);
    const rowContext = await rowLocator
      .evaluate(element => {
        const input = element as HTMLInputElement;
        const tableRow = input.closest('tr');
        const tableCell = input.closest('td');
        const label = input.labels?.[0] || input.closest('label');

        return {
          id: input.id || null,
          name: input.getAttribute('name'),
          value: input.value || null,
          tableRowClass: tableRow?.getAttribute('class') || null,
          tableRowAriaSelected: tableRow?.getAttribute('aria-selected') || null,
          tableCellClass: tableCell?.getAttribute('class') || null,
          labelText: label?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) || null,
          htmlSnippet: (tableRow?.outerHTML || input.outerHTML).replace(/\s+/g, ' ').trim().slice(0, 500),
        };
      })
      .catch(() => null);

    return {
      rowId: rowId || null,
      isChecked,
      ariaChecked,
      disabled,
      inputClass,
      rowContext,
      checkedRowIds: snapshot.checkedRowIds,
      checkedCount: snapshot.checkedRowIds.length,
      rowCount: snapshot.rowIds.length,
      noDataVisible: snapshot.noDataVisible,
    };
  }

  private getRowInputSelector(rowId: string): string {
    return rowId ? `input.row-check[data-id="${rowId}"]` : this.selectors.table.firstRow;
  }

  private async getOptionSignature(selectSelector: string): Promise<string> {
    const options = await this.getUsableOptions(selectSelector);
    return options.map(option => `${option.value}::${this.normalizeValue(option.text)}`).join('|');
  }

  private async validateCreateTripPreflight(): Promise<CreateTripPreflightResult> {
    return this.withCreateTripStage('preflight-validation', 'ultimamilla-asignar-create-trip-preflight-error', async () => {
      const operationValue = await this.getSelectedOptionText(this.selectors.optimization.operationTypeSelect);
      if (!operationValue) {
        throw new UltimaMillaAssignmentConfigurationError('No se puede crear viaje: Tipo de Operación vacío.');
      }

      const serviceValue = await this.getSelectedOptionText(this.selectors.optimization.serviceTypeSelect);
      if (!serviceValue) {
        throw new UltimaMillaAssignmentConfigurationError('No se puede crear viaje: Tipo de Servicio vacío.');
      }

      const routeContexts = await this.getDriverRouteContexts();
      if (routeContexts.length === 0) {
        throw new UltimaMillaAssignmentConfigurationError('No se puede crear viaje: no hay conductores configurados.');
      }

      const driverSelections: string[] = [];

      for (const routeContext of routeContexts) {
        if (!routeContext.selector) {
          throw new UltimaMillaAssignmentConfigurationError(
            `No se puede crear viaje: la ruta ${routeContext.routeIndex} no resolvió un selector de conductor estable.`
          );
        }

        if (routeContext.optionCount === 0) {
          throw new UltimaMillaAssignmentConfigurationError(
            `No se puede crear viaje: la ruta ${routeContext.routeIndex} (${routeContext.vehicle}) no tiene conductores disponibles.`
          );
        }

        const selectedDriver = await this.getSelectedOptions(routeContext.selector);
        if (selectedDriver.length !== 1) {
          throw new UltimaMillaAssignmentConfigurationError(
            `No se puede crear viaje: la ruta ${routeContext.routeIndex} (${routeContext.vehicle}) no tiene un conductor seleccionado.`
          );
        }

        driverSelections.push(`${routeContext.vehicle}:${selectedDriver[0].text}`);
      }

      logger.info(
        `✅ Preflight createTrip OK. operacion=${operationValue} | servicio=${serviceValue} | conductores=${driverSelections.join(' | ')}`
      );

      return {
        operationValue,
        serviceValue,
        driverSelections,
      };
    });
  }

  private async getAssignmentGridSnapshot(): Promise<AssignmentGridSnapshot> {
    return this.page.evaluate(
      ({ rowsSelector, checkedRowsSelector, noDataSelector }) => {
        const rows = Array.from(document.querySelectorAll(rowsSelector));
        const checkedRows = Array.from(document.querySelectorAll(checkedRowsSelector));
        const noData = document.querySelector(noDataSelector) as HTMLElement | null;
        const rowIds = rows
          .map(row => row.getAttribute('data-id')?.trim() || '')
          .filter(Boolean);
        const checkedRowIds = checkedRows
          .map(row => row.getAttribute('data-id')?.trim() || '')
          .filter(Boolean);
        const noDataVisible = Boolean(noData && noData.offsetParent !== null);

        return {
          rowIds,
          checkedRowIds,
          noDataVisible,
          signature: `${rowIds.join('|')}::checked=${checkedRowIds.join('|')}::noData=${noDataVisible}`,
        };
      },
      {
        rowsSelector: this.selectors.table.rows,
        checkedRowsSelector: this.selectors.table.checkedRows,
        noDataSelector: this.selectors.states.noData,
      }
    );
  }

  private async waitForAssignmentGridMutation(previousSnapshot: AssignmentGridSnapshot): Promise<boolean> {
    return this.withCreateTripStage('grid-refresh-wait', 'ultimamilla-asignar-grid-refresh-error', async () => {
      await this.page.waitForFunction(
        ({ rowsSelector, checkedRowsSelector, noDataSelector, previousSignature }) => {
          const rows = Array.from(document.querySelectorAll(rowsSelector));
          const checkedRows = Array.from(document.querySelectorAll(checkedRowsSelector));
          const noData = document.querySelector(noDataSelector) as HTMLElement | null;
          const rowIds = rows
            .map(row => row.getAttribute('data-id')?.trim() || '')
            .filter(Boolean);
          const checkedRowIds = checkedRows
            .map(row => row.getAttribute('data-id')?.trim() || '')
            .filter(Boolean);
          const noDataVisible = Boolean(noData && noData.offsetParent !== null);
          const currentSignature = `${rowIds.join('|')}::checked=${checkedRowIds.join('|')}::noData=${noDataVisible}`;

          return currentSignature !== previousSignature || checkedRowIds.length === 0;
        },
        {
          rowsSelector: this.selectors.table.rows,
          checkedRowsSelector: this.selectors.table.checkedRows,
          noDataSelector: this.selectors.states.noData,
          previousSignature: previousSnapshot.signature,
        },
        { timeout: 15000 }
      );

      return true;
    });
  }
}
