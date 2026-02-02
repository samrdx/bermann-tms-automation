import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

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

    // Actions
    btnGuardar: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/clientes/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Filling nombre (razón social): ${nombre}`);
    try {
      await this.fill(this.selectors.nombre, nombre);
    } catch (error) {
      logger.error('Failed to fill nombre', error);
      await this.takeScreenshot('fill-nombre-error');
      throw error;
    }
  }

  async fillRut(rut: string): Promise<void> {
    logger.info(`Filling RUT: ${rut}`);
    try {
      await this.fill(this.selectors.rut, rut);
    } catch (error) {
      logger.error('Failed to fill RUT', error);
      await this.takeScreenshot('fill-rut-error');
      throw error;
    }
  }

  async fillNombreFantasia(nombreFantasia: string): Promise<void> {
    logger.info(`Filling nombre fantasia: ${nombreFantasia}`);
    try {
      await this.fill(this.selectors.nombreFantasia, nombreFantasia);
    } catch (error) {
      logger.error('Failed to fill nombre fantasia', error);
      await this.takeScreenshot('fill-nombre-fantasia-error');
      throw error;
    }
  }

  async fillCalle(calle: string): Promise<void> {
    logger.info(`Filling calle: ${calle}`);
    try {
      await this.fill(this.selectors.calle, calle);
    } catch (error) {
      logger.error('Failed to fill calle', error);
      await this.takeScreenshot('fill-calle-error');
      throw error;
    }
  }

  async fillAltura(altura: string): Promise<void> {
    logger.info(`Filling altura: ${altura}`);
    try {
      await this.fill(this.selectors.altura, altura);
    } catch (error) {
      logger.error('Failed to fill altura', error);
      await this.takeScreenshot('fill-altura-error');
      throw error;
    }
  }

  async fillOtros(otros: string): Promise<void> {
    logger.info(`Filling otros: ${otros}`);
    try {
      await this.fill(this.selectors.otros, otros);
    } catch (error) {
      logger.error('Failed to fill otros', error);
      await this.takeScreenshot('fill-otros-error');
      throw error;
    }
  }

  async selectTipoCliente(tipo: string): Promise<void> {
    logger.info(`Selecting tipo cliente: ${tipo}`);
    try {
      await this.page.click(this.selectors.tipoClienteButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();

      logger.info(`✅ Tipo cliente "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo cliente: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-cliente-error');
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
      return url.includes('/clientes/index') || url.includes('/clientes/ver');
    } catch (error) {
      logger.error('Failed to check if form saved', error);
      return false;
    }
  }
}
