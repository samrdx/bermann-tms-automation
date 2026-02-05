import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { expect } from '@playwright/test';

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
      await this.fillRutWithVerify(this.selectors.rut, rut);
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

  //  ===== REGION/CIUDAD/COMUNA SELECTION =====
  
  async selectRandomRegion(): Promise<void> {
    logger.info('Selecting random Region');
    try {
      const button = this.page.locator(this.selectors.regionButton);
      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..');

      let isOpened = false;
      for (let i = 0; i < 3; i++) {
        await button.click({ force: true });
        await this.page.waitForTimeout(500);

        const menu = parent.locator('.dropdown-menu.inner.show');
        if (await menu.isVisible()) {
          isOpened = true;
          break;
        }
        logger.warn(`Region Dropdown not visible on attempt ${i + 1}, retrying...`);
      }

      if (!isOpened) {
        throw new Error('Failed to open region dropdown after 3 attempts');
      }

      const dropdownMenu = parent.locator('.dropdown-menu.inner.show');
      const options = await dropdownMenu.locator('.dropdown-item').all();

      const validOptions = [];
      for (const option of options) {
        if (await option.isVisible()) {
          validOptions.push(option);
        }
      }

      if (validOptions.length === 0) {
        throw new Error('No visible region options found');
      }

      const randomIndex = Math.floor(Math.random() * validOptions.length);
      const randomOption = validOptions[randomIndex];
      const optionText = await randomOption.innerText();

      await randomOption.click();
      logger.info(`✅ Random Region selected: "${optionText}"`);
      await this.page.waitForTimeout(1500);
    } catch (error) {
      logger.error('Failed to select random region', error);
      await this.takeScreenshot('select-random-region-error');
      throw error;
    }
  }

  async selectRandomCiudad(): Promise<void> {
    logger.info('Selecting random Ciudad');
    try {
      const button = this.page.locator(this.selectors.ciudadButton);
      await expect(button).toBeEnabled({ timeout: 5000 });
      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..');

      let isOpened = false;
      for (let i = 0; i < 3; i++) {
        await button.click({ force: true });
        await this.page.waitForTimeout(500);

        const menu = parent.locator('.dropdown-menu.inner.show');
        if (await menu.isVisible()) {
          isOpened = true;
          break;
        }
        logger.warn(`Ciudad Dropdown not visible on attempt ${i + 1}, retrying...`);
      }

      if (!isOpened) {
        throw new Error('Failed to open Ciudad dropdown');
      }

      const dropdownMenu = parent.locator('.dropdown-menu.inner.show');
      const options = await dropdownMenu.locator('.dropdown-item').all();

      const validOptions = [];
      for (const option of options) {
        if (await option.isVisible()) {
          validOptions.push(option);
        }
      }

      if (validOptions.length === 0) {
        throw new Error('No visible ciudad options found');
      }

      const randomIndex = Math.floor(Math.random() * validOptions.length);
      const randomOption = validOptions[randomIndex];
      const optionText = await randomOption.innerText();

      await randomOption.click();
      logger.info(`✅ Random Ciudad selected: "${optionText}"`);
      await this.page.waitForTimeout(1500);
    } catch (error) {
      logger.error('Failed to select random ciudad', error);
      await this.takeScreenshot('select-random-ciudad-error');
      throw error;
    }
  }

  async selectRandomComuna(): Promise<boolean> {
    logger.info('Selecting random Comuna');
    try {
      const button = this.page.locator(this.selectors.comunaButton);

      const isEnabled = await button.isEnabled({ timeout: 5000 }).catch(() => false);
      if (!isEnabled) {
        logger.warn('⚠️ Comuna dropdown is disabled - skipping');
        return false;
      }

      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..');

      let isOpened = false;
      for (let i = 0; i < 3; i++) {
        await button.click({ force: true });
        await this.page.waitForTimeout(500);

        const menu = parent.locator('.dropdown-menu.inner.show');
        if (await menu.isVisible()) {
          isOpened = true;
          break;
        }
 logger.warn(`Comuna Dropdown not visible on attempt ${i + 1}, retrying...`);
      }

      if (!isOpened) {
        logger.warn('⚠️ Failed to open Comuna dropdown - skipping');
        return false;
      }

      const dropdownMenu = parent.locator('.dropdown-menu.inner.show');
      const options = await dropdownMenu.locator('.dropdown-item').all();

      const validOptions = [];
      for (const option of options) {
        if (await option.isVisible()) {
          validOptions.push(option);
        }
      }

      if (validOptions.length === 0) {
        logger.warn('⚠️ No Comuna options - skipping');
        return false;
      }

      const randomIndex = Math.floor(Math.random() * validOptions.length);
      const randomOption = validOptions[randomIndex];
      const optionText = await randomOption.innerText();

      await randomOption.click();
      logger.info(`✅ Random Comuna selected: "${optionText}"`);
      return true;
    } catch (error) {
      logger.warn('⚠️ Comuna selection failed - skipping', error);
      return false;
    }
  }

  // ===== POLIGONOS =====
  
  async selectAllPoligonos(): Promise<void> {
    logger.info('Selecting all Poligonos');
    try {
      const button = this.page.locator("button[title='Polígonos']").first();
      
      try {
        await button.waitFor({ state: 'visible', timeout: 3000 });
      } catch (e) {
        logger.warn('⚠️ Poligonos button not visible within 3s');
        return;
      }
      
      await button.scrollIntoViewIfNeeded();

      // Open dropdown
      await button.click({ force: true });
      await this.page.waitForTimeout(500);

      // Try user suggested selectors for "Seleccionar Todos"
      // 1. Specific XPath inside dropdown-menu
      const selAll1 = this.page.locator("//div[contains(@class, 'dropdown-menu') and contains(@class, 'show')]//button[@type='button'][normalize-space()='Seleccionar Todos']");
      
      // 2. Global XPath (first one visible)
      const selAll2 = this.page.locator("(//button[@type='button'][normalize-space()='Seleccionar Todos'])[1]");
      
      // 3. CSS Selector
      const selAll3 = this.page.locator("div.bs-actionsbox button.bs-select-all");

      let clicked = false;
      if (await selAll1.isVisible()) {
          await selAll1.click();
          clicked = true;
          logger.info('✅ Clicked "Seleccionar Todos" (Selector 1)');
      } else if (await selAll2.isVisible()) {
          await selAll2.click();
          clicked = true;
          logger.info('✅ Clicked "Seleccionar Todos" (Selector 2)');
      } else if (await selAll3.isVisible()) {
          await selAll3.click();
          clicked = true;
          logger.info('✅ Clicked "Seleccionar Todos" (Selector 3)');
      }

      if (!clicked) {
        logger.warn('⚠️ "Seleccionar Todos" button not found. Selecting checkboxes manually...');
        // Fallback to manual selection
        const checkboxes = this.page.locator('.dropdown-menu.show li:not(.disabled) a[role="option"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            const option = checkboxes.nth(i);
            const isSelected = await option.getAttribute('class').then(c => c?.includes('selected'));
            if (!isSelected) await option.click();
        }
      }

      // Close dropdown
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      logger.error('Failed to select all poligonos', error);
      await this.takeScreenshot('select-all-poligonos-error');
      throw error;
    }
  }

  // Helper for opening Bootstrap dropdowns reliably
  private async robustOpenDropdown(button: any, parent: any, name: string): Promise<void> {
      let isOpened = false;
      for (let i = 0; i < 3; i++) {
        await button.click({ force: true });
        await this.page.waitForTimeout(500);

        const menu = parent.locator('.dropdown-menu.show');
        if (await menu.isVisible()) {
          isOpened = true;
          break;
        }
        logger.warn(`${name} Dropdown not visible on attempt ${i + 1}, retrying...`);
      }
      if (!isOpened) throw new Error(`Failed to open ${name} dropdown`);
  }

  // ===== TRANSPORTISTAS ASOCIADOS =====
  
  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    try {
      const button = this.page.locator(this.selectors.transportistasButton);
      
      // Graceful skip if button not visible (may be conditional field)
      try {
        await button.waitFor({ state: 'visible', timeout: 3000 });
      } catch (e) {
        logger.warn(`⚠️ Transportistas button not visible within 3s - skipping (may not be required for this form)`);
        return;
      }
      
      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..');

      // Open dropdown
      await button.click({ force: true });
      await this.page.waitForTimeout(500);

      const dropdownMenu = parent.locator('.dropdown-menu.show');
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      // Use search box if available
      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.count() > 0 && await searchInput.isVisible()) {
        logger.info(`Using search box to filter: ${nombre}`);
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(1000);
      }

      // Select the option
      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();
      
      if (await option.count() === 0) {
        logger.warn(`Transportista "${nombre}" not found in dropdown - closing and continuing`);
        await this.page.keyboard.press('Escape');
        return;
      }

      await option.scrollIntoViewIfNeeded();
      await option.click();
      
      logger.info(`✅ Transportista "${nombre}" selected`);
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.warn(`Failed to select transportista: ${nombre} - continuing without selection`, error);
      // Don't throw - make this optional
    }
  }

  // ===== CONTACT FIELDS =====
  
  async fillEmail(email: string): Promise<void> {
    logger.info(`Filling email: ${email}`);
    try {
      const locator = this.page.locator(this.selectors.email);
      // Graceful skip if not visible
      try {
        await locator.waitFor({ state: 'visible', timeout: 3000 });
      } catch (e) {
        logger.warn('⚠️ Email field not visible - skipping (may not be required for this form)');
        return;
      }
      await this.fill(this.selectors.email, email);
    } catch (error) {
      logger.warn('Failed to fill email - continuing', error);
    }
  }

  async fillTelefono(telefono: string): Promise<void> {
    logger.info(`Filling telefono: ${telefono}`);
    try {
      const locator = this.page.locator(this.selectors.telefono);
      // Graceful skip if not visible
      try {
        await locator.waitFor({ state: 'visible', timeout: 3000 });
      } catch (e) {
        logger.warn('⚠️ Telefono field not visible - skipping (may not be required for this form)');
        return;
      }
      await this.fill(this.selectors.telefono, telefono);
    } catch (error) {
      logger.warn('Failed to fill telefono - continuing', error);
    }
  }

  // ===== SAVE & VALIDATION =====

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
