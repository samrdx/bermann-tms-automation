import { BasePage } from '../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TransportistaFormPage');

export class TransportistaFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nombre: '#transportistas-nombre',
    razonSocial: '#transportistas-razon_social',
    documento: '#transportistas-documento', // RUT
    calle: '#transportistas-calle',
    altura: '#transportistas-altura', // Número (street number)
    otros: '#transportistas-otros', // Referencia
    descuento: '#transportistas-descuento', // % Descuento

    // Dropdowns
    tipoTransportistaButton: 'button[data-id="transportistas-tipo_transportista_id"]',
    regionButton: 'button[data-id="transportistas-region_id"]',
    ciudadButton: 'button[data-id="transportistas-ciudad_id"]',
    comunaButton: 'button[data-id="transportistas-comuna_id"]',
    formaPagoButton: 'button[data-id="transportistas-forma_pago_id"]',
    tercerizarButton: 'button[data-id="transportistas-tercerizar"]',

    // Actions
    btnGuardar: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/transportistas/crear');
    await this.page.waitForLoadState('domcontentloaded');
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

  async fillRazonSocial(razonSocial: string): Promise<void> {
    logger.info(`Filling razón social: ${razonSocial}`);
    try {
      await this.fill(this.selectors.razonSocial, razonSocial);
    } catch (error) {
      logger.error('Failed to fill razón social', error);
      await this.takeScreenshot('fill-razon-social-error');
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

  async fillDescuento(descuento: string): Promise<void> {
    logger.info(`Filling descuento: ${descuento}`);
    try {
      await this.fill(this.selectors.descuento, descuento);
    } catch (error) {
      logger.error('Failed to fill descuento', error);
      await this.takeScreenshot('fill-descuento-error');
      throw error;
    }
  }

  async selectTipoTransportista(tipo: string): Promise<void> {
    logger.info(`Selecting tipo transportista: ${tipo}`);
    try {
      await this.page.click(this.selectors.tipoTransportistaButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.click();

      logger.info(`✅ Tipo transportista "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo transportista: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-transportista-error');
      throw error;
    }
  }

  async selectRegion(region: string): Promise<void> {
    logger.info(`Selecting región: ${region}`);
    try {
      await this.page.click(this.selectors.regionButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: region }).first();
      await option.click();

      logger.info(`✅ Región "${region}" selected`);
      await this.page.waitForTimeout(800); // Wait for ciudad cascade
    } catch (error) {
      logger.error(`Failed to select región: ${region}`, error);
      await this.takeScreenshot('select-region-error');
      throw error;
    }
  }

  async selectCiudad(ciudad: string): Promise<void> {
    logger.info(`Selecting ciudad: ${ciudad}`);
    try {
      await this.page.click(this.selectors.ciudadButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: ciudad }).first();
      await option.click();

      logger.info(`✅ Ciudad "${ciudad}" selected`);
      await this.page.waitForTimeout(800); // Wait for comuna cascade
    } catch (error) {
      logger.error(`Failed to select ciudad: ${ciudad}`, error);
      await this.takeScreenshot('select-ciudad-error');
      throw error;
    }
  }

  async selectComuna(comuna: string): Promise<void> {
    logger.info(`Selecting comuna: ${comuna}`);
    try {
      await this.page.click(this.selectors.comunaButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: comuna }).first();
      await option.click();

      logger.info(`✅ Comuna "${comuna}" selected`);
    } catch (error) {
      logger.error(`Failed to select comuna: ${comuna}`, error);
      await this.takeScreenshot('select-comuna-error');
      throw error;
    }
  }

  async selectFormaPago(formaPago: string): Promise<void> {
    logger.info(`Selecting forma de pago: ${formaPago}`);
    try {
      const button = this.page.locator(this.selectors.formaPagoButton);
      
      // Check if button exists and is visible
      const isVisible = await button.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        logger.warn('⚠️ Forma Pago field not visible - skipping (may be conditional)');
        return;
      }
      
      await button.click();
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: formaPago });
      await option.click();

      logger.info(`✅ Forma de pago "${formaPago}" selected`);
    } catch (error) {
      logger.warn(`⚠️ Failed to select forma de pago: ${formaPago} - skipping (may be conditional)`, error);
      await this.takeScreenshot('select-forma-pago-skipped');
      // Don't throw - this field might be conditional
    }
  }

  async selectTercerizar(value: string): Promise<void> {
    logger.info(`Selecting tercerizar viajes: ${value}`);
    try {
      await this.page.click(this.selectors.tercerizarButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: value }).first();
      await option.click();

      logger.info(`✅ Tercerizar viajes "${value}" selected`);
    } catch (error) {
      logger.error(`Failed to select tercerizar: ${value}`, error);
      await this.takeScreenshot('select-tercerizar-error');
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
      return url.includes('/transportistas/index') || url.includes('/transportistas/ver');
    } catch (error) {
      logger.error('Failed to check if form saved', error);
      return false;
    }
  }

  // Random Selection Methods
  
  // Random Selection Methods
  
  // Random Selection Methods
  
  // Random Selection Methods
  
  // Scoped Dropdown Selection (Pattern: Button Parent -> Menu)
  
  async selectRandomRegion(): Promise<void> {
    logger.info('Selecting random Region');
    try {
      const button = this.page.locator(this.selectors.regionButton);
      await button.scrollIntoViewIfNeeded();
      const parent = button.locator('..'); // Bootstrap select wrapper

      // Retry loop to ensure menu opens
      let isOpened = false;
      for (let i = 0; i < 3; i++) {
        await button.click({ force: true });
        await this.page.waitForTimeout(500);
        
        // Check for SHOWING menu inside this specific wrapper
        const menu = parent.locator('.dropdown-menu.inner.show');
        if (await menu.isVisible()) {
          isOpened = true;
          break;
        }
        logger.warn(`Region Dropdown (scoped) not visible on attempt ${i + 1}, retrying...`);
        await this.page.waitForTimeout(500);
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
      
      await this.page.waitForTimeout(1500); // Cascade wait
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
        logger.warn(`Ciudad Dropdown (scoped) not visible on attempt ${i + 1}, retrying...`);
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
      
      await this.page.waitForTimeout(1500); // Cascade wait
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
       
       // Check if button is enabled (cascade check)
       const isEnabled = await button.isEnabled({ timeout: 5000 }).catch(() => false);
       if (!isEnabled) {
         logger.warn('⚠️ Comuna dropdown is disabled - skipping (field is optional)');
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
        logger.warn(`Comuna Dropdown (scoped) not visible on attempt ${i + 1}, retrying...`);
      }

      if (!isOpened) {
          logger.warn('⚠️ Failed to open Comuna dropdown - skipping (field is optional)');
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
          logger.warn('⚠️ No Comuna options available - skipping (field is optional)');
          return false;
      }

      const randomIndex = Math.floor(Math.random() * validOptions.length);
      const randomOption = validOptions[randomIndex];
      const optionText = await randomOption.innerText();
      
      await randomOption.click();
      logger.info(`✅ Random Comuna selected: "${optionText}"`);
      return true;
    } catch (error) {
      logger.warn('⚠️ Comuna selection failed - skipping (field is optional)', error);
      await this.takeScreenshot('select-random-comuna-skipped');
      return false;
    }
  }
}
