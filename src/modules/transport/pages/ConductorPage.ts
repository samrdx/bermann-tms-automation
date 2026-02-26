import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

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
    logger.info('Navigating to Conductor creation page');
    await this.page.goto('/conductores/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillUsuario(usuario: string): Promise<void> {
    logger.info(`Filling usuario: ${usuario}`);
    await this.fill(this.selectors.usuario, usuario);
  }

  async fillClave(clave: string): Promise<void> {
    logger.info('Filling clave');
    await this.fill(this.selectors.clave, clave);
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Filling nombre: ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillApellido(apellido: string): Promise<void> {
    logger.info(`Filling apellido: ${apellido}`);
    await this.fill(this.selectors.apellido, apellido);
  }

  async fillDocumento(documento: string): Promise<void> {
    logger.info(`Filling documento (RUT): ${documento}`);
    await this.fillRutWithVerify(this.selectors.documento, documento);
  }

  async fillTelefono(telefono: string): Promise<void> {
    logger.info(`Filling telefono: ${telefono}`);
    await this.fill(this.selectors.telefono, telefono);
  }

  async fillEmail(email: string): Promise<void> {
    logger.info(`Filling email: ${email}`);
    await this.fill(this.selectors.email, email);
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    try {
      if (!(await this.isVisible(this.selectors.transportistaButton))) return;
      
      const dropdownContainer = this.page.locator('div.dropdown')
        .filter({ has: this.page.locator(this.selectors.transportistaButton) });

      await this.page.click(this.selectors.transportistaButton);

      const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      await this.page.waitForTimeout(2000);

      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.isVisible()) {
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(500);
      }

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();
      await option.click();

      logger.info(`✅ Transportista "${nombre}" selected`);
    } catch (error) {
      logger.error(`Failed to select transportista: ${nombre}`, error);
      throw error;
    }
  }

  async selectLicencia(tipo: string): Promise<void> {
    logger.info(`Selecting licencia: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.licenciaButton))) return;
      const btn = this.page.locator(this.selectors.licenciaButton);
      await btn.click();
      await this.page.waitForTimeout(500);

      const container = this.page.locator('.dropdown, .bootstrap-select').filter({ has: btn }).first();
      const dropdownMenu = container.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo }).first();
      await option.click();
      logger.info(`✅ Licencia "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select licencia: ${tipo}`, error);
      throw error;
    }
  }

  async setVencimientoLicencia(fecha: string): Promise<void> {
    logger.info(`Setting vencimiento licencia: ${fecha}`);
    const locator = this.page.locator(this.selectors.vencimientoLicencia);
    if (!(await locator.isVisible())) return;
    
    try {
      await locator.fill(fecha);
    } catch (error) {
      await this.page.evaluate(
        ({ selector, value }) => {
          const element = document.querySelector(selector) as HTMLInputElement;
          if (element) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { selector: this.selectors.vencimientoLicencia, value: fecha }
      );
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking save button');
    await this.click(this.selectors.btnGuardar);
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForURL(
        url => url.toString().includes('/conductores/index') || url.toString().includes('/conductores/ver'),
        { timeout: 15000 }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}
