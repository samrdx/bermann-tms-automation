import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

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
    formaPagoButton: 'button[data-id="transportistas-forma_pago"]',
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
    logger.info('Navegando a la página de creación de Transportista');
    await this.page.goto('/transportistas/crear');
    await this.page.waitForLoadState('networkidle');
    const coreElement = this.page.locator(this.selectors.nombre);
    await coreElement.waitFor({ state: 'visible' });
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Completando nombre: ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillRazonSocial(razonSocial: string): Promise<void> {
    logger.info(`Completando razón social: ${razonSocial}`);
    await this.fill(this.selectors.razonSocial, razonSocial);
  }

  async fillDocumento(documento: string): Promise<void> {
    logger.info(`Completando documento (RUT): ${documento}`);
    await this.fillRutWithVerify(this.selectors.documento, documento);
  }

  async fillCalle(calle: string): Promise<void> {
    logger.info(`Completando calle: ${calle}`);
    await this.fill(this.selectors.calle, calle);
  }

  async fillAltura(altura: string): Promise<void> {
    logger.info(`Completando altura: ${altura}`);
    await this.fill(this.selectors.altura, altura);
  }

  async fillOtros(otros: string): Promise<void> {
    logger.info(`Completando otros: ${otros}`);
    await this.fill(this.selectors.otros, otros);
  }

  async fillDescuento(descuento: string): Promise<void> {
    logger.info(`Completando descuento: ${descuento}`);
    await this.fill(this.selectors.descuento, descuento);
  }

  async selectTipoTransportista(tipo: string): Promise<void> {
    logger.info(`Seleccionando tipo de transportista: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.tipoTransportistaButton))) return;
      await this.click(this.selectors.tipoTransportistaButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: tipo });
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Tipo de transportista "${tipo}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tipo de transportista: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-transportista-error');
      throw error;
    }
  }

  async selectRegion(region: string): Promise<void> {
    logger.info(`Seleccionando región: ${region}`);
    try {
      if (!(await this.isVisible(this.selectors.regionButton))) return;
      await this.click(this.selectors.regionButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: region }).first();
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Región "${region}" seleccionada`);
      await this.page.waitForTimeout(800); // Wait for ciudad cascade
    } catch (error) {
      logger.error(`Fallo al seleccionar región: ${region}`, error);
      await this.takeScreenshot('select-region-error');
      throw error;
    }
  }

  async selectCiudad(ciudad: string): Promise<void> {
    logger.info(`Seleccionando ciudad: ${ciudad}`);
    try {
      if (!(await this.isVisible(this.selectors.ciudadButton))) return;
      await this.click(this.selectors.ciudadButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: ciudad }).first();
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Ciudad "${ciudad}" seleccionada`);
      await this.page.waitForTimeout(800); // Wait for comuna cascade
    } catch (error) {
      logger.error(`Fallo al seleccionar ciudad: ${ciudad}`, error);
      await this.takeScreenshot('select-ciudad-error');
      throw error;
    }
  }

  async selectComuna(comuna: string): Promise<void> {
    logger.info(`Seleccionando comuna: ${comuna}`);
    try {
      if (!(await this.isVisible(this.selectors.comunaButton))) return;
      await this.click(this.selectors.comunaButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: comuna }).first();
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Comuna "${comuna}" seleccionada`);
    } catch (error) {
      logger.error(`Fallo al seleccionar comuna: ${comuna}`, error);
      await this.takeScreenshot('select-comuna-error');
      throw error;
    }
  }

  async selectFormaPago(formaPago: string): Promise<void> {
    logger.info(`Seleccionando forma de pago: ${formaPago}`);
    try {
      if (!(await this.isVisible(this.selectors.formaPagoButton))) return;
      await this.click(this.selectors.formaPagoButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: formaPago });
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Forma de pago "${formaPago}" seleccionada`);
    } catch (error) {
      logger.warn(`⚠️ Fallo al seleccionar forma de pago: ${formaPago} - saltando (puede ser condicional)`, error);
    }
  }

  async selectTercerizar(value: string): Promise<void> {
    logger.info(`Seleccionando tercerizar viajes: ${value}`);
    try {
      if (!(await this.isVisible(this.selectors.tercerizarButton))) return;
      await this.click(this.selectors.tercerizarButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible' });

      const option = dropdownMenu.locator('.dropdown-item').getByText(value, { exact: true });
      await option.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ Tercerizar viajes "${value}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tercerizar: ${value}`, error);
      await this.takeScreenshot('select-tercerizar-error');
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
      return url.includes('/transportistas/index') || url.includes('/transportistas/ver') || url.includes('/transportistas/view');
    } catch (error) {
      logger.error('Fallo al verificar si el formulario se guardó', error);
      return false;
    }
  }

  // ── Internal helpers that return success booleans ──

  private async trySelectRandomFromDropdown(
    buttonSelector: string,
    label: string,
    cascadeWaitMs = 0,
  ): Promise<{ success: boolean; selectedText?: string }> {
    try {
      if (!(await this.isVisible(buttonSelector))) return { success: false };
      await this.click(buttonSelector, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator('.dropdown-menu.show:not(.inner)').first();
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      const options = dropdownMenu.locator('.dropdown-item');
      const count = await options.count();

      if (count <= 1) {
        // Close the dropdown before returning so the page state is clean
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
        logger.warn(`⚠️ No hay opciones de ${label} disponibles (count=${count})`);
        return { success: false };
      }

      const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
      const selected = options.nth(randomIndex);
      const text = await selected.textContent();
      await selected.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ ${label} aleatorio seleccionado: ${text?.trim()}`);
      if (cascadeWaitMs > 0) await this.page.waitForTimeout(cascadeWaitMs);
      return { success: true, selectedText: text?.trim() ?? '' };
    } catch (error) {
      // Close dropdown if still open
      await this.page.keyboard.press('Escape').catch(() => { });
      await this.page.waitForTimeout(300);
      logger.warn(`⚠️ Fallo al seleccionar ${label} aleatorio`, error);
      return { success: false };
    }
  }

  // ── Public cascading location selector with retry ──

  /**
   * Selects a valid Región → Ciudad → Comuna combination.
   * If no Comunas are available for a given Ciudad, it retries
   * with a different Ciudad. If no Ciudades work, it retries
   * with a different Región. Up to `maxRetries` total attempts.
   */
  async selectRandomLocationCascade(maxRetries = 5): Promise<void> {
    logger.info(`🌍 Seleccionando ubicación aleatoria (Región → Ciudad → Comuna), máx ${maxRetries} intentos`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`📍 Intento de ubicación ${attempt}/${maxRetries}`);

      // Step 1: Select Región
      const region = await this.trySelectRandomFromDropdown(
        this.selectors.regionButton, 'región', 800,
      );
      if (!region.success) {
        logger.error('❌ No hay opciones de región disponibles');
        await this.takeScreenshot('select-location-no-regions');
        throw new Error('No region options available');
      }

      // Step 2: Select Ciudad
      const ciudad = await this.trySelectRandomFromDropdown(
        this.selectors.ciudadButton, 'ciudad', 800,
      );
      if (!ciudad.success) {
        logger.warn(`⚠️ No hay opciones de ciudad para la región "${region.selectedText}", reintentando con otra región...`);
        continue;
      }

      // Step 3: Select Comuna
      const comuna = await this.trySelectRandomFromDropdown(
        this.selectors.comunaButton, 'comuna',
      );
      if (!comuna.success) {
        logger.warn(`⚠️ No hay opciones de comuna para la ciudad "${ciudad.selectedText}" (región: "${region.selectedText}"), reintentando...`);
        continue;
      }

      // Success!
      logger.info(`✅ Ubicación seleccionada: ${region.selectedText} → ${ciudad.selectedText} → ${comuna.selectedText}`);
      return;
    }

    // All retries exhausted
    await this.takeScreenshot('select-location-all-retries-failed');
    throw new Error(`Failed to find a valid Región → Ciudad → Comuna combination after ${maxRetries} attempts`);
  }

  // ── Public convenience methods (backward compatible) ──

  async selectRandomRegion(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.regionButton, 'región', 800,
    );
    if (!result.success) {
      await this.takeScreenshot('select-random-region-error');
      throw new Error('No region options available');
    }
  }

  async selectRandomCiudad(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.ciudadButton, 'ciudad', 800,
    );
    if (!result.success) {
      await this.takeScreenshot('select-random-ciudad-error');
      throw new Error('No ciudad options available');
    }
  }

  async selectRandomComuna(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.comunaButton, 'comuna',
    );
    if (!result.success) {
      await this.takeScreenshot('select-random-comuna-error');
      throw new Error('No comuna options available');
    }
  }

  async hasValidationErrors(): Promise<boolean> {
    const invalidFields = this.page.locator(this.selectors.invalidField);
    const count = await invalidFields.count();
    if (count > 0) {
      logger.warn(`⚠️ Se encontraron ${count} error(es) de validación en el formulario`);
    }
    return count > 0;
  }
}
