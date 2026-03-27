import type { Page } from 'playwright';
import { BasePage } from '../../../core/BasePage.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('UltimaMillaPedidoIndexPage');

export interface PedidoIndexSearchResult {
  tripId: string;
  orderCode: string;
  status: string;
  rowIndex: number;
}

export interface PedidoIndexTripLookupOptions {
  maxAttempts?: number;
  pollIntervalMs?: number;
}

/**
 * Page Object for Última Milla order index page.
 * URL: /order/index
 *
 * Selectors verified via Playwright inspection on 2026-03-26:
 * - Search input: #txt_search
 * - Results table: #tabla_data
 * - Trip ID cell: column 1, rendered as <a onclick="tripDetails(TRIP_ID)">
 * - Order code cell: column 2
 * - Empty state: #div_no_data
 * - Processing indicator: #tabla_data_processing
 */
export class UltimaMillaPedidoIndexPage extends BasePage {
  private readonly selectors = {
    searchInput: '#txt_search',
    table: '#tabla_data',
    rows: '#tabla_data tbody tr',
    info: '#tabla_data_info',
    processing: '#tabla_data_processing',
    noData: '#div_no_data',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a Última Milla > Listado de pedidos');
    await this.page.goto('/order/index');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.selectors.searchInput, {
      state: 'visible',
      timeout: 15000,
    });
  }

  async searchByOrderCode(orderCode: string): Promise<void> {
    await this.withActionScreenshot('ultimamilla-pedido-index-search-error', async () => {
      logger.info(`Buscando pedido en /order/index. codigo=${orderCode}`);

      await this.page.locator(this.selectors.searchInput).waitFor({
        state: 'visible',
        timeout: 10000,
      });

      const searchResponsePromise = this.page
        .waitForResponse(
          response => response.request().method() === 'POST' && response.url().includes('/order/search'),
          { timeout: 10000 }
        )
        .catch(() => null);

      await this.page.evaluate(({ selector, value }) => {
        const input = document.querySelector(selector) as HTMLInputElement | null;
        if (!input) {
          throw new Error(`No se encontró ${selector}`);
        }

        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const windowWithDatatable = window as Window & {
          datatable?: {
            search?: (term: string) => { draw?: () => void };
            draw?: () => void;
          };
        };

        windowWithDatatable.datatable?.search?.(value)?.draw?.();
        windowWithDatatable.datatable?.draw?.();
      }, { selector: this.selectors.searchInput, value: orderCode.trim() });

      await searchResponsePromise;
      await this.waitForResultsToSettle();
    });
  }

  async extractTripIdFromResults(
    orderCode: string,
    options: PedidoIndexTripLookupOptions = {}
  ): Promise<string> {
    return this.withActionScreenshot('ultimamilla-pedido-index-tripid-error', async () => {
      const maxAttempts = options.maxAttempts ?? 8;
      const pollIntervalMs = options.pollIntervalMs ?? 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info(`Resolviendo Trip ID por UI. codigo=${orderCode} | intento=${attempt}/${maxAttempts}`);
        await this.searchByOrderCode(orderCode);

        const matches = await this.getVisibleResults();
        const exactMatch = matches.find(result => result.orderCode === orderCode.trim());
        if (exactMatch?.tripId) {
          logger.info(
            `✅ Trip ID resuelto desde /order/index. codigo=${orderCode} | tripId=${exactMatch.tripId} | intento=${attempt}`
          );
          return exactMatch.tripId;
        }

        if (attempt < maxAttempts) {
          logger.warn(
            `Trip ID aún no visible en /order/index. codigo=${orderCode} | coincidencias=${matches.length}. Reintentando en ${pollIntervalMs}ms.`
          );
          await this.page.waitForTimeout(pollIntervalMs);
        }
      }

      const diagnostics = await this.getVisibleResults();
      throw new Error(
        `No se pudo resolver el Trip ID desde /order/index para el pedido ${orderCode}. resultados=${JSON.stringify(diagnostics)}`
      );
    });
  }

  private async waitForResultsToSettle(): Promise<void> {
    await this.page.waitForTimeout(400);

    await this.page
      .locator(this.selectors.processing)
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {
        logger.debug('El indicador de procesamiento no apareció o ya estaba oculto.');
      });

    await this.page.waitForFunction(
      ({ rowsSelector, noDataSelector, infoSelector }) => {
        const rows = Array.from(document.querySelectorAll(rowsSelector));
        const info = document.querySelector(infoSelector);
        const noData = document.querySelector(noDataSelector) as HTMLElement | null;
        const hasRows = rows.some(row => row.querySelectorAll('td').length > 0);
        const noDataVisible = Boolean(noData && getComputedStyle(noData).display !== 'none');
        const hasInfo = Boolean(info?.textContent?.trim());
        return hasRows || noDataVisible || hasInfo;
      },
      {
        rowsSelector: this.selectors.rows,
        noDataSelector: this.selectors.noData,
        infoSelector: this.selectors.info,
      },
      { timeout: 10000 }
    );
  }

  private async getVisibleResults(): Promise<PedidoIndexSearchResult[]> {
    return this.page.evaluate(rowsSelector => {
      return Array.from(document.querySelectorAll(rowsSelector))
        .map((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) {
            return null;
          }

          const tripLink = cells[1]?.querySelector('a');
          const tripId = (tripLink?.textContent || cells[1]?.textContent || '').replace(/\s+/g, ' ').trim();
          const orderCode = (cells[2]?.textContent || '').replace(/\s+/g, ' ').trim();
          const status = (cells[3]?.textContent || '').replace(/\s+/g, ' ').trim();

          if (!orderCode) {
            return null;
          }

          return {
            tripId,
            orderCode,
            status,
            rowIndex,
          };
        })
        .filter((value): value is PedidoIndexSearchResult => value !== null);
    }, this.selectors.rows);
  }

  protected async withActionScreenshot<T>(screenshotName: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Falló acción en UltimaMillaPedidoIndexPage: ${screenshotName}`, error);
      await this.takeScreenshot(screenshotName);
      throw error;
    }
  }
}
