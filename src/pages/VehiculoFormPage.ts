import { BasePage } from '../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VehiculoFormPage');

export class VehiculoFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    patente: '#vehiculos-patente',
    muestra: '#vehiculos-muestra',

    // Dropdowns
    tipoVehiculoButton: 'button[data-id="vehiculos-tipo_vehiculo_id"]',
    tipoRamplaButton: 'button[data-id="vehiculos-tipo_rampla_id"]',
    transportistaButton: 'button[data-id="vehiculos-transportista_id"]', // Cascading!
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
    await this.page.goto('https://moveontruckqa.bermanntms.cl/vehiculos/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillPatente(patente: string): Promise<void> {
    logger.info(`Filling patente: ${patente}`);
    try {
      await this.fill(this.selectors.patente, patente);
    } catch (error) {
      logger.error('Failed to fill patente', error);
      await this.takeScreenshot('fill-patente-error');
      throw error;
    }
  }

  async fillMuestra(muestra: string): Promise<void> {
    logger.info(`Filling muestra: ${muestra}`);
    try {
      await this.fill(this.selectors.muestra, muestra);
    } catch (error) {
      logger.error('Failed to fill muestra', error);
      await this.takeScreenshot('fill-muestra-error');
      throw error;
    }
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    try {
      // Wait for dropdown button to be visible
      await this.page.waitForSelector(this.selectors.transportistaButton, { state: 'visible' });

      // Identify the specific dropdown container
      const dropdownContainer = this.page.locator('div.dropdown')
        .filter({ has: this.page.locator(this.selectors.transportistaButton) });

      // Click dropdown button
      await this.page.click(this.selectors.transportistaButton);

      // Wait for specific dropdown menu to appear
      const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      // CRITICAL: Wait for dropdown options to load (AJAX call)
      await this.page.waitForTimeout(2000);

      // Wait for at least one dropdown item to appear
      const firstItem = dropdownMenu.locator('.dropdown-item').first();
      await firstItem.waitFor({ state: 'visible', timeout: 10000 });

      // Check for search box (long list)
      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.count() > 0 && await searchInput.isVisible()) {
        logger.info('Using search box to filter transportista');
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(1000); // Increased wait for search filtering
      }

      // Debug: Log all available options
      const allOptions = await dropdownMenu.locator('.dropdown-item').allTextContents();
      logger.info(`Available transportistas in dropdown (${allOptions.length} total):`);
      allOptions.slice(0, 10).forEach((opt, idx) => {
        logger.info(`  [${idx}] ${opt.trim()}`);
      });

      // Select option by text
      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();

      if (await option.count() === 0) {
        logger.error(`Transportista "${nombre}" not found. Searching for partial match...`);

        // Try partial match as fallback
        const partialMatch = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre.split(' ')[0] }).first();
        if (await partialMatch.count() > 0) {
          logger.info(`Found partial match for "${nombre.split(' ')[0]}"`);
          await partialMatch.scrollIntoViewIfNeeded();
          await partialMatch.click();
          logger.info(`✅ Selected partial match`);
          return;
        }

        throw new Error(`Transportista "${nombre}" not found in dropdown. Available: ${allOptions.slice(0, 5).join(', ')}`);
      }

      await option.scrollIntoViewIfNeeded();
      await option.click();

      logger.info(`✅ Transportista "${nombre}" selected`);
      await this.page.waitForTimeout(500);

    } catch (error) {
      logger.error(`Failed to select transportista: ${nombre}`, error);
      await this.takeScreenshot('select-transportista-error');
      throw error;
    }
  }

  async selectTipoVehiculo(tipo: string): Promise<void> {
    logger.info(`Selecting tipo vehículo: ${tipo}`);
    try {
      await this.page.click(this.selectors.tipoVehiculoButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();

      logger.info(`✅ Tipo vehículo "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo vehículo: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-vehiculo-error');
      throw error;
    }
  }

  async selectTipoRampla(tipo: string): Promise<void> {
    logger.info(`Selecting tipo rampla: ${tipo}`);
    try {
      await this.page.click(this.selectors.tipoRamplaButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();

      logger.info(`✅ Tipo rampla "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo rampla: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-rampla-error');
      throw error;
    }
  }

  async selectCapacidad(capacidad: string): Promise<void> {
    logger.info(`Selecting capacidad: ${capacidad}`);
    try {
      await this.page.click(this.selectors.capacidadButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: capacidad });
      await option.click();

      logger.info(`✅ Capacidad "${capacidad}" selected`);
    } catch (error) {
      logger.error(`Failed to select capacidad: ${capacidad}`, error);
      await this.takeScreenshot('select-capacidad-error');
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking save button');
    try {
      await this.click(this.selectors.btnGuardar);
    } catch (error) {
      logger.error('Failed to click save button', error);
      await this.takeScreenshot('click-guardar-error');
      throw error;
    }
  }

  async hasValidationErrors(): Promise<boolean> {
    try {
      const invalidFields = await this.page.$$(this.selectors.invalidField);
      return invalidFields.length > 0;
    } catch (error) {
      logger.error('Failed to check validation errors', error);
      return false;
    }
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      const url = this.page.url();
      return url.includes('/vehiculos/index') || url.includes('/vehiculos/ver');
    } catch (error) {
      logger.error('Failed to check if form saved', error);
      return false;
    }
  }
}
