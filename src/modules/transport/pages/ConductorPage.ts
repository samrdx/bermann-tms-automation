import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ConductorFormPage');

export class ConductorFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    usuario: '#conductores-usuario',
    clave: '#conductores-clave',
    nombre: '#conductores-nombre',
    apellido: '#conductores-apellido',
    documento: '#conductores-documento', // RUT
    telefono: '#conductores-telefono',
    email: '#conductores-email',
    vencimientoLicencia: '#conductores-vencimiento_licencia',

    // Dropdowns
    transportistaButton: 'button[data-id="conductores-transportista_id"]', // Cascading!
    extranjeroButton: 'button[data-id="conductores-extranjero"]',
    licenciaButton: 'button[data-id="conductores-licencia"]',

    // Actions
    btnGuardar: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/conductores/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillUsuario(usuario: string): Promise<void> {
    logger.info(`Filling usuario: ${usuario}`);
    try {
      await this.fill(this.selectors.usuario, usuario);
    } catch (error) {
      logger.error('Failed to fill usuario', error);
      await this.takeScreenshot('fill-usuario-error');
      throw error;
    }
  }

  async fillClave(clave: string): Promise<void> {
    logger.info('Filling clave');
    try {
      await this.fill(this.selectors.clave, clave);
    } catch (error) {
      logger.error('Failed to fill clave', error);
      await this.takeScreenshot('fill-clave-error');
      throw error;
    }
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Filling nombre: ${nombre}`);
    try {
      await this.fill(this.selectors.nombre, nombre);
    } catch (error) {
      logger.error('Failed to fill nombre', error);
      await this.takeScreenshot('fill-nombre-error');
      throw error;
    }
  }

  async fillApellido(apellido: string): Promise<void> {
    logger.info(`Filling apellido: ${apellido}`);
    try {
      await this.fill(this.selectors.apellido, apellido);
    } catch (error) {
      logger.error('Failed to fill apellido', error);
      await this.takeScreenshot('fill-apellido-error');
      throw error;
    }
  }

  async fillDocumento(documento: string): Promise<void> {
    logger.info(`Filling documento (RUT): ${documento}`);
    try {
      await this.fill(this.selectors.documento, documento);
    } catch (error) {
      logger.error('Failed to fill documento', error);
      await this.takeScreenshot('fill-documento-error');
      throw error;
    }
  }

  async fillTelefono(telefono: string): Promise<void> {
    logger.info(`Filling telefono: ${telefono}`);
    try {
      await this.fill(this.selectors.telefono, telefono);
    } catch (error) {
      logger.error('Failed to fill telefono', error);
      await this.takeScreenshot('fill-telefono-error');
      throw error;
    }
  }

  async fillEmail(email: string): Promise<void> {
    logger.info(`Filling email: ${email}`);
    try {
      await this.fill(this.selectors.email, email);
    } catch (error) {
      logger.error('Failed to fill email', error);
      await this.takeScreenshot('fill-email-error');
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
        await this.page.waitForTimeout(500);
      }

      // Select option by text
      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();

      if (await option.count() === 0) {
        throw new Error(`Transportista "${nombre}" not found in dropdown`);
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

  async selectLicencia(tipo: string): Promise<void> {
    logger.info(`Selecting licencia: ${tipo}`);
    try {
      await this.page.click(this.selectors.licenciaButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();

      logger.info(`✅ Licencia "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select licencia: ${tipo}`, error);
      await this.takeScreenshot('select-licencia-error');
      throw error;
    }
  }

  async setVencimientoLicencia(fecha: string): Promise<void> {
    logger.info(`Setting vencimiento licencia: ${fecha}`);
    try {
      // Try to fill directly first
      try {
        await this.fill(this.selectors.vencimientoLicencia, fecha);
        logger.info(`✅ Vencimiento licencia set: ${fecha}`);
        return;
      } catch (error) {
        // Field might be readonly, try JavaScript
        logger.info('Field readonly, using JavaScript to set value');
      }

      // Use JavaScript to set value (for readonly date pickers)
      await this.page.evaluate(
        ({ selector, value }) => {
          const element = document.querySelector(selector) as HTMLInputElement;
          if (element) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        { selector: this.selectors.vencimientoLicencia, value: fecha }
      );

      await this.page.waitForTimeout(300);
      logger.info(`✅ Vencimiento licencia set via JavaScript: ${fecha}`);
    } catch (error) {
      logger.error('Failed to set vencimiento licencia', error);
      await this.takeScreenshot('set-vencimiento-error');
      // Don't throw - this is an optional field
      logger.warn('Vencimiento licencia is optional, continuing...');
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
      return url.includes('/conductores/index') || url.includes('/conductores/ver');
    } catch (error) {
      logger.error('Failed to check if form saved', error);
      return false;
    }
  }
}
