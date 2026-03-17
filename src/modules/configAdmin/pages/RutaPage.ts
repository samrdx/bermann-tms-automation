import { BasePage } from '../../../core/BasePage.js';
import type { Locator, Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('RutaPage');

export interface RutaData {
  nombreRuta: string;
  nroRuta: string;
  origen?: string;
  destino?: string;
}

export interface RutaCreationResult {
  origen: string;
  destino: string;
}

/**
 * Page Object for Ruta creation page
 * URL: /ruta/crear
 */
export class RutaPage extends BasePage {
  private readonly selectors = {
    nombreRuta: '#ruta-nombre_ruta',
    nroRuta: '#ruta-nro_ruta',

    origenDropdownCandidates: [
      'button[data-id="ruta-origen_id"]',
      'button[data-id="ruta-zona_origen_id"]',
      'button[data-id="ruta-origen"]',
      '.form-group:has(label:has-text("Origen")) button.dropdown-toggle',
    ],
    destinoDropdownCandidates: [
      'button[data-id="ruta-destino_id"]',
      'button[data-id="ruta-zona_destino_id"]',
      'button[data-id="ruta-destino"]',
      '.form-group:has(label:has-text("Destino")) button.dropdown-toggle',
    ],

    btnGuardar: '#btn_guardar',
    btnGuardarFallback: 'button.btn-success:has-text("Guardar"), button:has-text("Guardar")',
    successAlert: '.alert-success, .toast-success, .swal2-success',
    errorAlert: '.alert-danger, .alert.alert-danger, .toast-error, .alert',
    searchInput: '#search',
    searchButton: '#buscar',
    tableRows: '#tabla table tbody tr, #tabla-ruta tbody tr, table tbody tr',
    dropdownOpenMenu: 'div.dropdown-menu.show',
    dropdownSearchInput: 'div.dropdown-menu.show .bs-searchbox input[type="text"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la pagina de creacion de Ruta');
    await this.page.goto('/ruta/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.nombreRuta).waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillNombreRuta(nombreRuta: string): Promise<void> {
    logger.info(`Completando nombre de ruta: ${nombreRuta}`);
    await this.fill(this.selectors.nombreRuta, nombreRuta);
  }

  async fillNroRuta(nroRuta: string): Promise<void> {
    logger.info(`Completando numero de ruta: ${nroRuta}`);
    await this.fill(this.selectors.nroRuta, nroRuta);
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando a la pagina de indice de Rutas');
    await this.page.goto('/ruta/index');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.searchInput).first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async searchRuta(nombreRuta: string): Promise<void> {
    logger.info(`Buscando ruta en grilla: ${nombreRuta}`);
    const searchInput = this.page.locator(this.selectors.searchInput).first();
    await searchInput.fill('');
    await searchInput.fill(nombreRuta);

    const searchButton = this.page.locator(this.selectors.searchButton).first();
    if (await searchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchButton.click({ timeout: 5000 }).catch(async () => {
        await searchButton.evaluate((el) => (el as HTMLElement).click());
      });
    } else {
      await searchInput.press('Enter');
    }

    await this.page.waitForLoadState('networkidle').catch(() => { });
    await this.page.waitForTimeout(1200);
  }

  async isRutaInSearchResults(nombreRuta: string, nroRuta: string): Promise<boolean> {
    try {
      const escapedNombre = this.escapeForRegex(nombreRuta);
      const escapedNro = this.escapeForRegex(nroRuta);

      const row = this.page.locator(this.selectors.tableRows)
        .filter({ hasText: new RegExp(escapedNombre, 'i') })
        .filter({ hasText: new RegExp(escapedNro, 'i') })
        .first();

      const visible = await row.isVisible({ timeout: 5000 }).catch(() => false);
      if (!visible) {
        await this.takeScreenshot('ruta-search-not-found');
      }
      return visible;
    } catch (error) {
      logger.error('Fallo al verificar ruta en resultados de busqueda', error);
      await this.takeScreenshot('ruta-search-verify-error');
      return false;
    }
  }

  async crearRuta(data: RutaData): Promise<RutaCreationResult> {
    try {
      await this.fillNombreRuta(data.nombreRuta);
      await this.fillNroRuta(data.nroRuta);

      const origenSelected = await this.selectOrigenByValue(data.origen);
      await this.page.waitForTimeout(1200);
      const destinoSelected = await this.selectDestinoByValue(data.destino, origenSelected);
      await this.page.waitForTimeout(1200);

      await this.clickGuardar();

      const isSaved = await this.isFormSaved();
      if (!isSaved) {
        const errorMessage = await this.getFormErrorMessage();
        if (errorMessage) {
          throw new Error(`No se pudo confirmar el guardado de la Ruta. Mensaje UI: ${errorMessage}`);
        }
        throw new Error('No se pudo confirmar el guardado de la Ruta');
      }

      return {
        origen: origenSelected,
        destino: destinoSelected,
      };
    } catch (error) {
      logger.error('Fallo al crear Ruta', error);
      await this.takeScreenshot('ruta-crear-error');
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Guardando Ruta');
    try {
      const primary = this.page.locator(this.selectors.btnGuardar).first();
      const fallback = this.page.locator(this.selectors.btnGuardarFallback).first();

      if (await primary.isVisible({ timeout: 3000 }).catch(() => false)) {
        await primary.click({ timeout: 7000 }).catch(async () => {
          await primary.evaluate((el) => (el as HTMLElement).click());
        });
      } else if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallback.click({ timeout: 7000 }).catch(async () => {
          await fallback.evaluate((el) => (el as HTMLElement).click());
        });
      } else {
        throw new Error('No se encontro un boton Guardar visible para Ruta');
      }

      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      logger.error('Fallo al guardar Ruta', error);
      await this.takeScreenshot('ruta-guardar-error');
      throw error;
    }
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(1500);
      const url = this.page.url();
      const redirected =
        url.includes('/ruta/index') ||
        url.includes('/ruta/ver/') ||
        url.includes('/rutas/index') ||
        url.includes('/rutas/ver/');

      if (redirected) {
        return true;
      }

      const successVisible = await this.page.locator(this.selectors.successAlert).first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      return successVisible;
    } catch (error) {
      logger.error('Fallo al verificar guardado de Ruta', error);
      return false;
    }
  }

  private async getFormErrorMessage(): Promise<string | null> {
    try {
      const alert = this.page.locator(this.selectors.errorAlert).first();
      if (!(await alert.isVisible({ timeout: 2000 }).catch(() => false))) {
        return null;
      }

      const text = (await alert.innerText()).trim();
      return text || null;
    } catch {
      return null;
    }
  }

  private async selectOrigenByValue(origen?: string): Promise<string> {
    await this.openDropdownStrict(this.selectors.origenDropdownCandidates, 'Origen');
    await this.resetOpenDropdownSearch();

    const originSelected = origen || await this.getRandomZoneFromOpenDropdown('Origen');
    logger.info(`Seleccionando Origen: ${originSelected}`);
    await this.searchInOpenDropdown(originSelected);
    await this.selectOptionByTextStrict('Origen', originSelected);
    return originSelected;
  }

  private async selectDestinoByValue(destino?: string, originSelected?: string): Promise<string> {
    await this.openDropdownStrict(this.selectors.destinoDropdownCandidates, 'Destino');
    await this.resetOpenDropdownSearch();

    const destinationSelected = destino || await this.getRandomZoneFromOpenDropdown(
      'Destino',
      new Set(originSelected ? [originSelected] : [])
    );
    logger.info(`Seleccionando Destino: ${destinationSelected}`);
    await this.searchInOpenDropdown(destinationSelected);
    await this.selectOptionByTextStrict('Destino', destinationSelected);
    return destinationSelected;
  }

  private async openDropdownStrict(candidates: string[], fieldName: string): Promise<void> {
    const dropdownMenu = this.page.locator(this.selectors.dropdownOpenMenu).first();

    for (const selector of candidates) {
      const btn = this.page.locator(selector).first();
      if (!(await btn.isVisible({ timeout: 1200 }).catch(() => false))) {
        continue;
      }

      await btn.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => { });
      await btn.click({ timeout: 4000 }).catch(async () => {
        await btn.evaluate((el) => (el as HTMLElement).click());
      });

      if (await dropdownMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }
    }

    await this.takeScreenshot(`ruta-${fieldName.toLowerCase()}-dropdown-not-found`);
    throw new Error(`No se pudo abrir el dropdown de ${fieldName}. Revisar selectores del campo.`);
  }

  private async searchInOpenDropdown(searchText: string): Promise<void> {
    const searchInput = this.page.locator(this.selectors.dropdownSearchInput).first();
    if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await searchInput.fill('');
      await searchInput.fill(searchText);
      await this.page.waitForTimeout(500);
    }
  }

  private async resetOpenDropdownSearch(): Promise<void> {
    const searchInput = this.page.locator(this.selectors.dropdownSearchInput).first();
    if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await searchInput.fill('');
      await this.page.waitForTimeout(300);
    }
  }

  private async getRandomZoneFromOpenDropdown(fieldName: string, exclude: Set<string> = new Set()): Promise<string> {
    const rawOptions = await this.page.locator(
      `${this.selectors.dropdownOpenMenu} [role="option"], ${this.selectors.dropdownOpenMenu} li a, ${this.selectors.dropdownOpenMenu} span.text`
    ).allTextContents();

    const uniqueOptions = Array.from(new Set(
      rawOptions.map((text) => text.trim()).filter((text) => text.length > 0)
    ));

    const candidates = uniqueOptions.filter((text) => this.isZoneInAllowedRange(text) && !exclude.has(text));
    if (candidates.length === 0) {
      await this.takeScreenshot(`ruta-${fieldName.toLowerCase()}-random-zone-not-found`);
      throw new Error(`No existen opciones de ${fieldName} en rango 1_..467_ para seleccionar aleatoriamente`);
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    logger.info(`[${fieldName}] Opcion aleatoria seleccionada (1_..467_): ${selected}`);
    return selected;
  }

  private isZoneInAllowedRange(zoneText: string): boolean {
    const match = zoneText.match(/^(\d+)_/);
    if (!match) return false;
    const code = Number(match[1]);
    return code >= 1 && code <= 467;
  }

  private escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async selectOptionByTextStrict(fieldName: string, expectedValue: string): Promise<void> {
    const roleOption = this.page.getByRole('option', { name: expectedValue, exact: true }).first();
    const bootstrapOption = this.page.locator(
      `${this.selectors.dropdownOpenMenu} .dropdown-item:has-text("${expectedValue}"), ` +
      `${this.selectors.dropdownOpenMenu} li a:has-text("${expectedValue}"), ` +
      `${this.selectors.dropdownOpenMenu} span.text:has-text("${expectedValue}")`
    ).first();

    if (await roleOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.selectOptionStrict(roleOption, fieldName, expectedValue);
      return;
    }

    await this.selectOptionStrict(bootstrapOption, fieldName, expectedValue);
  }

  private async selectOptionStrict(option: Locator, fieldName: string, expectedValue: string): Promise<void> {
    if (!(await option.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.takeScreenshot(`ruta-${fieldName.toLowerCase()}-option-not-found`);
      throw new Error(`No se encontro la opcion hardcodeada para ${fieldName}: "${expectedValue}"`);
    }

    await option.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => { });
    await option.click({ timeout: 5000 }).catch(async () => {
      await option.evaluate((el) => (el as HTMLElement).click());
    });
  }
}
