import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

const logger = createLogger('VehiculoFormPage');

export class VehiculoFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    patente: '#vehiculos-patente',
    muestra: '#vehiculos-muestra',

    // Underlying select elements (for page.evaluate scoping)
    tipoVehiculoSelect: '#vehiculos-tipo_vehiculo_id',
    transportistaSelect: '#vehiculos-transportista_id',
    capacidadSelect: '#vehiculos-capacidad_id',

    // Dropdown trigger buttons (data-id)
    tipoVehiculoButton: 'button[data-id="vehiculos-tipo_vehiculo_id"]',
    tipoRamplaButton: 'button[data-id="vehiculos-tipo_rampla_id"]',
    transportistaButton: 'button[data-id="vehiculos-transportista_id"]',
    capacidadButton: 'button[data-id="vehiculos-capacidad_id"]',

    // Actions
    btnGuardar: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a la página de creación de Vehículo');
    await this.page.goto('/vehiculos/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillPatente(patente: string): Promise<void> {
    logger.info(`Completando patente: ${patente}`);
    await this.fill(this.selectors.patente, patente);
  }

  async fillMuestra(muestra: string): Promise<void> {
    logger.info(`Completando muestra: ${muestra}`);
    await this.fill(this.selectors.muestra, muestra);
  }

  /**
   * Generic Bootstrap Select dropdown helper using page.evaluate for reliability.
   * Opens dropdown, optionally searches, clicks the matching option, and closes.
   */
  private async selectFromBootstrapDropdown(
    selectSelector: string,
    optionText: string,
    useSearch: boolean = false
  ): Promise<void> {
    const result = await this.page.evaluate(
      ({ selectSelector, optionText, useSearch }) => {
        const select = document.querySelector(selectSelector) as HTMLSelectElement;
        if (!select) return { success: false, error: `Select not found: ${selectSelector}` };

        const container = select.closest('.bootstrap-select') as HTMLElement;
        if (!container) return { success: false, error: `Bootstrap Select container not found for ${selectSelector}` };

        // Open dropdown
        const toggleBtn = container.querySelector('button.dropdown-toggle') as HTMLElement;
        if (!toggleBtn) return { success: false, error: 'Toggle button not found' };
        toggleBtn.click();

        return { success: true, opened: true };
      },
      { selectSelector, optionText, useSearch }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to open dropdown');
    }

    // Wait for dropdown to render
    await this.page.waitForTimeout(500);

    // If search is needed, type in the searchbox
    if (useSearch) {
      const searchInput = this.page.locator(`${selectSelector}`)
        .locator('xpath=ancestor::div[contains(@class,"bootstrap-select")]')
        .locator('.bs-searchbox input');

      const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (searchVisible) {
        await searchInput.fill(optionText);
        await this.page.waitForTimeout(1000);
      }
    }

    // Click the matching dropdown-item in the open menu
    const container = this.page.locator(selectSelector)
      .locator('xpath=ancestor::div[contains(@class,"bootstrap-select")]');
    const option = container.locator('.dropdown-menu .dropdown-item')
      .filter({ hasText: optionText })
      .first();

    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.evaluate((node: HTMLElement) => node.click());
  }

  /**
   * Selects a transportista from the Bootstrap Select dropdown using search.
   */
  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Seleccionando transportista: ${nombre}`);
    try {
      const btn = this.page.locator(this.selectors.transportistaButton);
      if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) {
        logger.warn('⚠️ Dropdown de transportista no visible — saltando');
        return;
      }
      await this.selectFromBootstrapDropdown(this.selectors.transportistaSelect, nombre, true);
      logger.info(`✅ Transportista "${nombre}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar transportista: ${nombre}`, error);
      throw error;
    }
  }

  /**
   * Selects a tipo vehiculo from the Bootstrap Select dropdown.
   */
  async selectTipoVehiculo(tipo: string): Promise<void> {
    logger.info(`Seleccionando tipo de vehículo: ${tipo}`);
    try {
      const btn = this.page.locator(this.selectors.tipoVehiculoButton);
      if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) return;
      await this.selectFromBootstrapDropdown(this.selectors.tipoVehiculoSelect, tipo, false);
      logger.info(`✅ Tipo de vehículo "${tipo}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tipo de vehículo: ${tipo}`, error);
      throw error;
    }
  }

  /**
   * Selects a capacidad from the Bootstrap Select dropdown.
   */
  async selectCapacidad(capacidad: string): Promise<void> {
    logger.info(`Seleccionando capacidad: ${capacidad}`);
    try {
      const btn = this.page.locator(this.selectors.capacidadButton);
      if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) return;
      await this.selectFromBootstrapDropdown(this.selectors.capacidadSelect, capacidad, false);
      logger.info(`✅ Capacidad "${capacidad}" seleccionada`);
    } catch (error) {
      logger.error(`Fallo al seleccionar capacidad: ${capacidad}`, error);
      throw error;
    }
  }

  async getSelectedTipoVehiculo(): Promise<string> {
    const btn = this.page.locator(this.selectors.tipoVehiculoButton);
    return (await btn.textContent()) || '';
  }

  async selectTipoRampla(tipo: string): Promise<void> {
    logger.info(`Seleccionando tipo de rampla: ${tipo}`);
    try {
      const btn = this.page.locator(this.selectors.tipoRamplaButton);
      if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) {
        logger.warn('⚠️ Dropdown de Tipo Rampla no visible — saltando');
        return;
      }
      await btn.click();
      await this.page.waitForTimeout(500);
      const option = this.page.locator('.dropdown-menu.show .dropdown-item')
        .filter({ hasText: tipo }).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.evaluate((node: HTMLElement) => node.click());
      logger.info(`✅ Tipo de rampla "${tipo}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tipo de rampla: ${tipo}`, error);
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en el botón guardar');
    await this.click(this.selectors.btnGuardar);
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      const url = this.page.url();
      return url.includes('/vehiculos/index') || url.includes('/vehiculos/ver');
    } catch (error) {
      return false;
    }
  }
}
