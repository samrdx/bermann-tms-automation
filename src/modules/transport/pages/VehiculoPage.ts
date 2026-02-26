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
    logger.info('Navigating to Vehiculo creation page');
    await this.page.goto('/vehiculos/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillPatente(patente: string): Promise<void> {
    logger.info(`Filling patente: ${patente}`);
    await this.fill(this.selectors.patente, patente);
  }

  async fillMuestra(muestra: string): Promise<void> {
    logger.info(`Filling muestra: ${muestra}`);
    await this.fill(this.selectors.muestra, muestra);
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    try {
      if (!(await this.isVisible(this.selectors.transportistaButton))) return;
      const dropdownContainer = this.page.locator('div.dropdown')
        .filter({ has: this.page.locator(this.selectors.transportistaButton) });

      await this.page.click(this.selectors.transportistaButton);

      const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show:visible').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      await this.page.waitForTimeout(2000);

      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.isVisible()) {
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(1000);
      }

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();
      await option.click();

      logger.info(`✅ Transportista "${nombre}" selected`);
    } catch (error) {
      logger.error(`Failed to select transportista: ${nombre}`, error);
      throw error;
    }
  }

  async selectTipoVehiculo(tipo: string): Promise<void> {
    logger.info(`Selecting tipo vehículo: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.tipoVehiculoButton))) return;
      const btn = this.page.locator(this.selectors.tipoVehiculoButton);
      await btn.click();
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:visible').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo }).first();
      await option.click();
      logger.info(`✅ Tipo vehículo "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo vehículo: ${tipo}`, error);
      throw error;
    }
  }

  async selectCapacidad(capacidad: string): Promise<void> {
    logger.info(`Selecting capacidad: ${capacidad}`);
    try {
      if (!(await this.isVisible(this.selectors.capacidadButton))) return;
      const btn = this.page.locator(this.selectors.capacidadButton);
      await btn.click();
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:visible').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: capacidad }).first();
      await option.click();
      logger.info(`✅ Capacidad "${capacidad}" selected`);
    } catch (error) {
      logger.error(`Failed to select capacidad: ${capacidad}`, error);
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking save button');
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
