import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { expect } from '@playwright/test';
import { isDemoMode } from '../../../utils/env-helper.js';

const logger = createLogger('ClienteFormPage');

export class ClienteFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nombre: '#clientes-nombre', // Razón social
    rut: '#clientes-rut',
    nombreFantasia: '#clientes-nombre_fantasia',
    calle: '#clientes-calle',
    altura: '#clientes-altura',
    otros: '#clientes-otros',

    // Dropdowns
    tipoClienteButton: 'button[data-id="clientes-tipo_cliente_id"]',
    regionButton: 'button[data-id="clientes-region_id"]',
    ciudadButton: 'button[data-id="clientes-ciudad_id"]',
    comunaButton: 'button[data-id="clientes-comuna_id"]',
    poligonosButton: 'button[data-id="clientes-poligonos"]',
    transportistasButton: 'button[data-id="clientes-transportistas"]',

    // Contact fields
    email: '#clientes-email',
    telefono: '#clientes-telefono',

    // Actions
    btnGuardar: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navigating to Cliente creation page');
    await this.page.goto('/clientes/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Filling nombre (razón social): ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillRut(rut: string): Promise<void> {
    logger.info(`Filling RUT: ${rut}`);
    await this.fillRutWithVerify(this.selectors.rut, rut);
  }

  async fillNombreFantasia(nombreFantasia: string): Promise<void> {
    logger.info(`Filling nombre fantasia: ${nombreFantasia}`);
    await this.fill(this.selectors.nombreFantasia, nombreFantasia);
  }

  async fillCalle(calle: string): Promise<void> {
    logger.info(`Filling calle: ${calle}`);
    await this.fill(this.selectors.calle, calle);
  }

  async fillAltura(altura: string): Promise<void> {
    logger.info(`Filling altura: ${altura}`);
    await this.fill(this.selectors.altura, altura);
  }

  async fillOtros(otros: string): Promise<void> {
    logger.info(`Filling otros: ${otros}`);
    await this.fill(this.selectors.otros, otros);
  }

  async selectTipoCliente(tipo: string): Promise<void> {
    logger.info(`Selecting tipo cliente: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.tipoClienteButton))) return;
      await this.page.click(this.selectors.tipoClienteButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();
      logger.info(`✅ Tipo cliente "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo cliente: ${tipo}`, error);
      throw error;
    }
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    try {
      if (!(await this.isVisible(this.selectors.transportistasButton))) return;
      const button = this.page.locator(this.selectors.transportistasButton);
      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..');

      await button.click({ force: true });
      await this.page.waitForTimeout(500);

      const dropdownMenu = parent.locator('.dropdown-menu.show');
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.isVisible()) {
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(1000);
      }

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();
      await option.click();
      logger.info(`✅ Transportista "${nombre}" selected`);
    } catch (error) {
      logger.warn(`Failed to select transportista: ${nombre} - continuing`, error);
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
      return url.includes('/clientes/index') || url.includes('/clientes/ver') || url.includes('/clientes/view');
    } catch (error) {
      return false;
    }
  }
}
