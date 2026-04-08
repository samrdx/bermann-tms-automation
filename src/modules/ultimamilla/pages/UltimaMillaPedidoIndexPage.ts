import type { Page } from 'playwright';
import { BasePage } from '../../../core/BasePage.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('UltimaMillaPedidoIndexPage');

export interface PedidoIndexSearchResult {
  tripId: string;
  tripIdSource: 'link-text' | 'cell-text' | 'onclick' | 'href' | 'data-attr' | 'none';
  orderCode: string;
  status: string;
  rowIndex: number;
  tripCandidates: string[];
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
      const normalizedOrderCode = this.normalizeValue(orderCode);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info(`Resolviendo Trip ID por UI. codigo=${orderCode} | intento=${attempt}/${maxAttempts}`);
        await this.searchByOrderCode(orderCode);

        const matches = await this.getVisibleResults();
        const exactMatch = matches.find(result => this.normalizeValue(result.orderCode) === normalizedOrderCode);
        if (exactMatch?.tripId) {
          logger.info(
            `✅ Trip ID resuelto desde /order/index. codigo=${orderCode} | tripId=${exactMatch.tripId} | source=${exactMatch.tripIdSource} | intento=${attempt}`
          );
          return exactMatch.tripId;
        }

        const fuzzyMatch = matches.find(result => this.normalizeValue(result.orderCode).includes(normalizedOrderCode));
        if (fuzzyMatch?.tripId) {
          logger.warn(
            `Trip ID resuelto por coincidencia parcial de pedido. codigo=${orderCode} | pedidoVisible=${fuzzyMatch.orderCode} | tripId=${fuzzyMatch.tripId} | source=${fuzzyMatch.tripIdSource}`
          );
          return fuzzyMatch.tripId;
        }

        if (exactMatch && !exactMatch.tripId) {
          logger.warn(
            `Fila del pedido encontrada sin Trip ID parseable. codigo=${orderCode} | source=${exactMatch.tripIdSource} | candidates=[${exactMatch.tripCandidates.join(' | ')}]`
          );
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
      const normalizeValue = (value: string) => value.replace(/\s+/g, ' ').trim();

      const normalizeTripIdCandidate = (value: string | null | undefined): string | null => {
        const trimmed = value?.trim();
        if (!trimmed) {
          return null;
        }

        const numericMatch = trimmed.match(/^(\d{3,})$/);
        if (numericMatch?.[1]) {
          return numericMatch[1];
        }

        const tripLabelMatch = trimmed.match(/(?:trip(?:_id)?|viaje(?:_id)?|nro(?:\s+)?viaje)[^0-9]{0,20}(\d{3,})/i);
        if (tripLabelMatch?.[1]) {
          return tripLabelMatch[1];
        }

        return null;
      };

      const extractTripIdFromOnclick = (value: string | null | undefined): string | null => {
        const onclick = value?.trim();
        if (!onclick) {
          return null;
        }

        const tripDetailsMatch = onclick.match(/tripDetails\(\s*['\"]?(\d{3,})['\"]?\s*\)/i);
        if (tripDetailsMatch?.[1]) {
          return tripDetailsMatch[1];
        }

        const changeStatusMatch = onclick.match(/changeStatus(?:LastMille)?\(\s*[^,]+,\s*['\"]?(\d{3,})['\"]?\s*\)/i);
        if (changeStatusMatch?.[1]) {
          return changeStatusMatch[1];
        }

        return normalizeTripIdCandidate(onclick);
      };

      const extractTripIdFromHref = (value: string | null | undefined): string | null => {
        const href = value?.trim();
        if (!href) {
          return null;
        }

        const queryMatch = href.match(/[?&](?:trip(?:_id)?|viaje(?:_id)?|id)=([0-9]{3,})/i);
        if (queryMatch?.[1]) {
          return queryMatch[1];
        }

        const pathMatch = href.match(/\/(?:trip|viaje)\/(\d{3,})(?:\b|\/|\?)/i);
        if (pathMatch?.[1]) {
          return pathMatch[1];
        }

        return normalizeTripIdCandidate(href);
      };

      const getTripIdFromDataAttrs = (element: Element | null): string | null => {
        if (!element) {
          return null;
        }

        const candidates = [
          element.getAttribute('data-trip-id'),
          element.getAttribute('data-tripid'),
          element.getAttribute('data-viaje-id'),
          element.getAttribute('data-id-trip'),
          element.getAttribute('data-id-viaje'),
          element.getAttribute('data-trip'),
          element.getAttribute('data-viaje'),
          element.getAttribute('data-id'),
        ];

        for (const candidate of candidates) {
          const normalized = normalizeTripIdCandidate(candidate);
          if (normalized) {
            return normalized;
          }
        }

        return null;
      };

      return Array.from(document.querySelectorAll(rowsSelector))
        .map((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) {
            return null;
          }

          const tripCell = cells[1] || null;
          const tripLink = cells[1]?.querySelector('a');
          const orderCode = normalizeValue(cells[2]?.textContent || '');
          const status = normalizeValue(cells[3]?.textContent || '');

          const textTripId = normalizeTripIdCandidate(normalizeValue(tripLink?.textContent || ''));
          const cellTripId = normalizeTripIdCandidate(normalizeValue(tripCell?.textContent || ''));
          const onclickTripId =
            extractTripIdFromOnclick(tripLink?.getAttribute('onclick'))
            || extractTripIdFromOnclick(tripCell?.getAttribute('onclick'))
            || extractTripIdFromOnclick(row.getAttribute('onclick'));
          const hrefTripId = extractTripIdFromHref(tripLink?.getAttribute('href'));
          const dataAttrTripId =
            getTripIdFromDataAttrs(tripLink)
            || getTripIdFromDataAttrs(tripCell)
            || getTripIdFromDataAttrs(row);

          let tripId = '';
          let tripIdSource: PedidoIndexSearchResult['tripIdSource'] = 'none';
          if (textTripId) {
            tripId = textTripId;
            tripIdSource = 'link-text';
          } else if (cellTripId) {
            tripId = cellTripId;
            tripIdSource = 'cell-text';
          } else if (onclickTripId) {
            tripId = onclickTripId;
            tripIdSource = 'onclick';
          } else if (hrefTripId) {
            tripId = hrefTripId;
            tripIdSource = 'href';
          } else if (dataAttrTripId) {
            tripId = dataAttrTripId;
            tripIdSource = 'data-attr';
          }

          if (!orderCode) {
            return null;
          }

          return {
            tripId,
            tripIdSource,
            orderCode,
            status,
            rowIndex,
            tripCandidates: [
              normalizeValue(tripLink?.textContent || ''),
              normalizeValue(tripCell?.textContent || ''),
              tripLink?.getAttribute('onclick')?.trim() || '',
              tripCell?.getAttribute('onclick')?.trim() || '',
              row.getAttribute('onclick')?.trim() || '',
              tripLink?.getAttribute('href')?.trim() || '',
              tripLink?.getAttribute('data-trip-id')?.trim() || '',
              tripCell?.getAttribute('data-trip-id')?.trim() || '',
              row.getAttribute('data-trip-id')?.trim() || '',
            ].filter(Boolean),
          };
        })
        .filter((value): value is PedidoIndexSearchResult => value !== null);
    }, this.selectors.rows);
  }

  private normalizeValue(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
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
