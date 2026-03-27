import type { Page } from 'playwright';
import { BasePage } from '../../../core/BasePage.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('UltimaMillaMonitoreoPage');

export type UltimaMillaTerminalStatus =
  | 'Entregado'
  | 'Entregado Parcial'
  | 'No Entregado'
  | 'Rechazado';

export interface UltimaMillaStatusUpdateInput {
  tripId: string;
  orderCode: string;
  status: UltimaMillaTerminalStatus;
  dateTime?: string;
  requireTripTransition?: boolean;
}

export interface UltimaMillaStatusUpdateResult {
  tripId: string;
  orderCode: string;
  status: UltimaMillaTerminalStatus;
  dateTime: string;
  modalResponseStatus: number | null;
  modalResponseUrl: string | null;
  transitionDetected: boolean;
  finalizedVisible: boolean;
  pendingStatusActions: number;
  tripVisible: boolean;
  snapshotText: string;
}

export interface WaitForTripTransitionResult {
  transitionDetected: boolean;
  finalizedVisible: boolean;
  pendingStatusActions: number;
  tripVisible: boolean;
  snapshotText: string;
}

/**
 * Page Object para Última Milla en /viajes/monitoreo.
 *
 * Selectores verificados en batch 1:
 * - Categoría: #drop_categoria / button[data-id="drop_categoria"] / value=1 => Ultima Milla
 * - Filtro viaje: #id
 * - Modal UM: #modalChangeStatusLastMille
 * - Estado: #drop_status
 * - Fechas obligatorias: .entry_date / .out_date
 * - Guardar: #changeStatusLastMille
 */
export class UltimaMillaMonitoreoPage extends BasePage {
  private readonly selectors = {
    categorySelect: '#drop_categoria',
    categoryButton: 'button[data-id="drop_categoria"]',
    tripIdInput: '#id',
    searchButton: '#buscar',
    resultsContainer: '#registros',
    modal: '#modalChangeStatusLastMille',
    statusSelect: '#drop_status',
    entryDateFields: '.entry_date',
        outDateFields: '.out_date',
    saveButton: '#changeStatusLastMille',
    confirmButtons: '.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")',
    anyModalVisible: '.modal.show, .modal.fade.show, .modal[style*="display: block"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a Viajes > Monitoreo');
    await this.page.goto('/viajes/monitoreo');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.selectors.tripIdInput, {
      state: 'visible',
      timeout: 15000,
    });
  }

  async setCategoryUltimaMilla(): Promise<void> {
    await this.withActionScreenshot('ultimamilla-monitoreo-category-error', async () => {
      logger.info('Configurando categoría = Ultima milla');

      await this.page.waitForSelector(this.selectors.categorySelect, { state: 'attached', timeout: 10000 });

      await this.page.evaluate(({ selectSelector, optionValue }) => {
        const select = document.querySelector(selectSelector) as HTMLSelectElement | null;
        if (!select) {
          throw new Error(`No se encontró ${selectSelector}`);
        }

        select.value = optionValue;
        // @ts-ignore
        Array.from(select.options).forEach((option) => {
          option.selected = option.value === optionValue;
        });
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        const windowWithJQuery = window as any;

        if (windowWithJQuery.jQuery) {
          const jq = windowWithJQuery.jQuery(select);
          jq.selectpicker?.('val', optionValue);
          jq.selectpicker?.('refresh');
          jq.trigger?.('change');
        }
      }, { selectSelector: this.selectors.categorySelect, optionValue: '1' });

      await this.page.waitForTimeout(1200);
      const categoryLabel = await this.page.locator(this.selectors.categoryButton).textContent().catch(() => '');
      if (!this.normalizeText(categoryLabel).includes('ultima')) {
        throw new Error(`La categoría no quedó en Ultima milla. visible="${categoryLabel || 'sin-texto'}"`);
      }

      logger.info(`✅ Categoría configurada: ${categoryLabel?.trim() || 'Ultima milla'}`);
    });
  }

  async searchTripById(tripId: string): Promise<void> {
    await this.withActionScreenshot('ultimamilla-monitoreo-search-trip-error', async () => {
      logger.info(`Buscando viaje en monitoreo. tripId=${tripId}`);
      const input = this.page.locator(this.selectors.tripIdInput);
      await input.waitFor({ state: 'visible', timeout: 10000 });
      await input.fill('');
      await input.fill(tripId);

      await Promise.all([
        input.press('Enter').catch(() => undefined),
        this.page.evaluate(() => {
          const searchButton = document.getElementById('buscar') as HTMLElement | null;
          searchButton?.click();
        }).catch(() => undefined),
      ]);

      await this.page.waitForTimeout(1800);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.debug('networkidle no terminó luego de buscar en monitoreo; continúo con verificación visual.');
      });
      await this.page.waitForTimeout(500);
    });
  }

  async loadTripById(tripId: string): Promise<void> {
    await this.searchTripById(tripId);
    await this.page.waitForFunction(
      ({ containerSelector, currentTripId }) => {
        const container = document.querySelector(containerSelector) as HTMLElement | null;
        if (!container) {
          return false;
        }

        const text = (container.textContent || '').replace(/\s+/g, ' ').trim();
        const actionNodes = Array.from(container.querySelectorAll('[onclick*="changeStatusLastMille"]'));
        const matchingAction = actionNodes.some(node => {
          const onclick = node.getAttribute('onclick') || '';
          return onclick.includes(`,${currentTripId}`) || onclick.includes(`, ${currentTripId}`) || onclick.includes(`(${currentTripId},`);
        });

        return text.includes(currentTripId) || matchingAction || container.querySelectorAll('span.manito, [onclick]').length > 0;
      },
      {
        containerSelector: this.selectors.resultsContainer,
        currentTripId: tripId,
      },
      { timeout: 20000 }
    );

    logger.info(`✅ Resultado de monitoreo visible para tripId=${tripId}`);
  }

  async updateOrderStatusViaHorarioGps(input: UltimaMillaStatusUpdateInput): Promise<UltimaMillaStatusUpdateResult> {
    return this.withActionScreenshot('ultimamilla-monitoreo-update-status-error', async () => {
      const normalizedStatus = this.normalizeStatus(input.status);
      const dateTime = input.dateTime || this.createCurrentDateTime();
      const requireTripTransition = input.requireTripTransition ?? true;

      logger.info(
        `Actualizando pedido en monitoreo. tripId=${input.tripId} | pedido=${input.orderCode} | estado=${normalizedStatus} | fecha=${dateTime}`
      );

      await this.loadTripById(input.tripId);
      await this.openHorarioGpsModalForOrder(input.orderCode, input.tripId);
      await this.fillStatusModal(normalizedStatus); // dateTime ya no es necesario aquí
      const modalSave = await this.saveStatusModal();
      const transition = requireTripTransition
        ? await this.waitForTripTransition(input.tripId, normalizedStatus, input.orderCode)
        : {
            transitionDetected: false,
            finalizedVisible: false,
            pendingStatusActions: -1,
            tripVisible: true,
            snapshotText: '',
          };

      logger.info(
        `✅ Estado aplicado. tripId=${input.tripId} | pedido=${input.orderCode} | estado=${normalizedStatus} | transition=${transition.transitionDetected} | requireTripTransition=${requireTripTransition}`
      );

      return {
        tripId: input.tripId,
        orderCode: input.orderCode,
        status: normalizedStatus,
        dateTime,
        modalResponseStatus: modalSave.responseStatus,
        modalResponseUrl: modalSave.responseUrl,
        transitionDetected: transition.transitionDetected,
        finalizedVisible: transition.finalizedVisible,
        pendingStatusActions: transition.pendingStatusActions,
        tripVisible: transition.tripVisible,
        snapshotText: transition.snapshotText,
      };
    });
  }

  private async openHorarioGpsModalForOrder(orderCode: string, tripId: string): Promise<void> {
    logger.info(`Abriendo Horario GPS para pedido=${orderCode} tripId=${tripId}`);

    const clicked = await this.page.evaluate(({ currentTripId }) => {
      const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tripIdPattern = new RegExp(`changeStatusLastMille\\([^,]+,\\s*${escapeRegex(String(currentTripId))}\\)`);
      const spans = Array.from(document.querySelectorAll('span.manito'));
      const agregarButton = spans.find(span => {
        const text = span.textContent?.trim() || '';
        const onclick = span.getAttribute('onclick') || '';
        return text === 'Agregar' && tripIdPattern.test(onclick);
      }) as HTMLElement | undefined;

      if (!agregarButton) {
        return false;
      }

      agregarButton.click();
      return true;
    }, { currentTripId: tripId });

    if (!clicked) {
      logger.warn(`⚠️ UI: span.manito de "Agregar" no encontrado para tripId=${tripId}. Tomando captura de pantalla...`);
      await this.takeScreenshot('agregar-button-not-found-ultimamilla');
      throw new Error(`❌ UI: No se encontró el botón "Agregar" para el tripId ${tripId} en la página.`);
    }
    logger.info(`✅ Clic en Agregar para tripId=${tripId} vía JS`);

    await this.page.waitForFunction(modalSelector => {
      const modal = document.querySelector(modalSelector) as HTMLElement | null;
      return Boolean(modal && (modal.classList.contains('show') || modal.style.display === 'block'));
    }, this.selectors.modal, { timeout: 15000 });
    logger.info('✅ Modal Última Milla abierto');
  }

  private async fillStatusModal(status: UltimaMillaTerminalStatus): Promise<void> {
    logger.info(`Completando modal Última Milla. estado=${status} (fecha/hora se autocompletan)`);
    await this.page.evaluate(
      ({ modalSelector, statusSelector, entrySelector, outSelector, desiredStatus }) => {
        // @ts-ignore
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const modal = document.querySelector(modalSelector);
        if (!modal) {
          throw new Error(`No se encontró el modal ${modalSelector}`);
        }

        const statusSelect = modal.querySelector(statusSelector);
        if (!statusSelect) {
          throw new Error(`No se encontró el select ${statusSelector}`);
        }

        // @ts-ignore
        const statusOption = Array.from(statusSelect.options).find(option => normalize(option.text) === normalize(desiredStatus));
        if (!statusOption) {
          throw new Error(`No existe la opción de estado ${desiredStatus}`);
        }

        // @ts-ignore
        statusSelect.value = statusOption.value;
        // @ts-ignore
        Array.from(statusSelect.options).forEach(option => {
          // @ts-ignore
          option.selected = option.value === statusOption.value;
        });
        statusSelect.dispatchEvent(new Event('input', { bubbles: true }));
        statusSelect.dispatchEvent(new Event('change', { bubbles: true }));

        const windowWithJQuery = window;

        // @ts-ignore
        if (windowWithJQuery.jQuery) {
          // @ts-ignore
          const jq = windowWithJQuery.jQuery(statusSelect);
          // @ts-ignore
          jq.selectpicker?.('val', statusOption.value);
          // @ts-ignore
          jq.selectpicker?.('refresh');
          // @ts-ignore
          jq.trigger?.('change');
        }

        const dateFields = [
          ...Array.from(modal.querySelectorAll(entrySelector)),
          ...Array.from(modal.querySelectorAll(outSelector)),
        ] as HTMLInputElement[];

        if (dateFields.length === 0) {
          throw new Error('No se encontraron campos .entry_date/.out_date en el modal Última Milla');
        }

        for (const field of dateFields) {
          field.click(); // Esto debería autofill la fecha/hora actual
          field.dispatchEvent(new Event('blur', { bubbles: true })); // Perder el foco para cerrar el picker
        }
      },
      {
        modalSelector: this.selectors.modal,
        statusSelector: this.selectors.statusSelect,
        entrySelector: this.selectors.entryDateFields,
        outSelector: this.selectors.outDateFields,
        desiredStatus: status,
      }
    );
    await this.page.waitForTimeout(400);
  }

  private async saveStatusModal(): Promise<{ responseStatus: number | null; responseUrl: string | null }> {
    logger.info('Guardando modal Última Milla');

    const responsePromise = this.page
      .waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          /changestatuslastmille|lastmille|lastmile|changeStatusLastMille/i.test(response.url()),
        { timeout: 15000 }
      )
      .catch(() => null);

    await this.page.locator(this.selectors.saveButton).waitFor({ state: 'visible', timeout: 10000 });
    await this.click(this.selectors.saveButton);

    const confirmButton = this.page.locator(this.selectors.confirmButtons).first();
    if (await confirmButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      logger.info('Confirmación adicional detectada; aceptando');
      await confirmButton.click();
    }

    await this.page.waitForFunction(modalSelector => {
      const modal = document.querySelector(modalSelector) as HTMLElement | null;
      return !modal || (!modal.classList.contains('show') && modal.style.display !== 'block');
    }, this.selectors.modal, { timeout: 15000 });

    const response = await responsePromise;
    if (response && !response.ok()) {
      throw new Error(`La persistencia del estado UM falló. status=${response.status()} url=${response.url()}`);
    }

    return {
      responseStatus: response?.status() ?? null,
      responseUrl: response?.url() ?? null,
    };
  }

  private async waitForTripTransition(
    tripId: string,
    expectedStatus: UltimaMillaTerminalStatus,
    orderCode: string
  ): Promise<WaitForTripTransitionResult> {
    const expectedStatusNeedle = this.normalizeText(expectedStatus);
    const orderNeedle = this.normalizeText(orderCode);

    for (let attempt = 1; attempt <= 5; attempt++) {
      logger.info(`Verificando transición automática del viaje. tripId=${tripId} | intento=${attempt}/5`);
      await this.searchTripById(tripId);

      const snapshot = await this.page.evaluate(({ containerSelector, currentTripId }) => {
        // @ts-ignore
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const container = document.querySelector(containerSelector);
        const text = normalize(container?.textContent);
        const actions = container
          ? Array.from(container.querySelectorAll('[onclick*="changeStatusLastMille"]')).filter(node => {
              const onclick = node.getAttribute('onclick') || '';
              return onclick.includes(`,${currentTripId}`) || onclick.includes(`, ${currentTripId}`) || onclick.includes(`(${currentTripId},`);
            }).length
          : 0;

        return {
          text,
          tripVisible: text.includes(String(currentTripId).trim().toLowerCase()),
          pendingStatusActions: actions,
        };
      }, { containerSelector: this.selectors.resultsContainer, currentTripId: tripId });

      const finalizedVisible = /finalizado|finalizada/.test(snapshot.text);
      const expectedStatusVisible = snapshot.text.includes(expectedStatusNeedle);
      const orderVisible = snapshot.text.includes(orderNeedle);
      const transitionDetected = expectedStatusVisible || finalizedVisible || snapshot.pendingStatusActions === 0 || !orderVisible;

      if (transitionDetected) {
        return {
          transitionDetected,
          finalizedVisible,
          pendingStatusActions: snapshot.pendingStatusActions,
          tripVisible: snapshot.tripVisible,
          snapshotText: snapshot.text,
        };
      }

      await this.page.waitForTimeout(1500);
    }

    const currentText = await this.page.locator(this.selectors.resultsContainer).textContent().catch(() => '');
    throw new Error(
      `No se detectó transición automática del viaje ${tripId} tras actualizar pedido ${orderCode} a ${expectedStatus}. snapshot="${this.createSnippet(currentText || '', 400)}"`
    );
  }

  private normalizeStatus(status: UltimaMillaStatusUpdateInput['status']): UltimaMillaTerminalStatus {
    const normalized = this.normalizeText(status);
    const mapping: Record<string, UltimaMillaTerminalStatus> = {
      entregado: 'Entregado',
      'entregado parcial': 'Entregado Parcial',
      'no entregado': 'No Entregado',
      rechazado: 'Rechazado',
    };

    const resolved = mapping[normalized];
    if (!resolved) {
      throw new Error(`Estado de Última Milla no soportado: ${status}`);
    }

    return resolved;
  }

  private createCurrentDateTime(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private createSnippet(value: string, maxLength = 240): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  protected async withActionScreenshot<T>(screenshotName: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Falló acción en UltimaMillaMonitoreoPage: ${screenshotName}`, error);
      await this.takeScreenshot(screenshotName);
      throw error;
    }
  }
}
