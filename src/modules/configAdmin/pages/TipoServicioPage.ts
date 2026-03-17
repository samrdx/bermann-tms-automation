import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('TipoServicioPage');

export interface TipoServicioData {
  nombre: string;
  tipoOperacionNombre: string;
}

/**
 * Page Object for Tipo de Servicio create/index pages.
 * URL Create: /tiposervicio/crear
 * URL Index: /tiposervicio
 */
export class TipoServicioPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nombre: '#tiposervicio-nombre',

    // Dropdowns (Confluence validation pending)
    tipoOperacionButton: 'button[data-id="tiposervicio-tipo_operacion_id"]',
    tipoOperacionLabelFallback: ':text("Tipo de Operación")',
    dropdownMenuOpen: '.dropdown-menu.show',
    dropdownSearchInput: '.dropdown-menu.show .bs-searchbox input[type="text"]',
    dropdownOption: '.dropdown-menu.show .dropdown-item',

    // Actions
    btnGuardar: '#btn_guardar',
    btnGuardarFallback: 'button.btn-success:has-text("Guardar")',

    // Index search
    searchInput: '#search',
    btnBuscar: '#buscar',
    tableRows: 'table tbody tr',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la pagina de creacion de Tipo de Servicio');
    await this.page.goto('/tiposervicio/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.nombre).waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Completando nombre de Tipo de Servicio: ${nombre}`);
    try {
      await this.fill(this.selectors.nombre, nombre);
    } catch (error) {
      logger.error('Fallo al completar el nombre de Tipo de Servicio', error);
      await this.takeScreenshot('tiposervicio-fill-nombre-error');
      throw error;
    }
  }

  async selectTipoOperacion(tipoOperacionNombre: string): Promise<void> {
    logger.info(`Seleccionando Tipo de Operacion vinculado: ${tipoOperacionNombre}`);
    try {
      const button = this.page.locator(this.selectors.tipoOperacionButton).first();
      const hasPrimaryButton = await button.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPrimaryButton) {
        try {
          await button.click({ timeout: 5000 });
        } catch {
          await button.evaluate((el) => (el as HTMLElement).click());
        }
      } else {
        logger.warn('No se encontro boton por data-id, aplicando fallback por texto visible');
        const labelFallback = this.page.locator(this.selectors.tipoOperacionLabelFallback).first();
        if (await labelFallback.isVisible({ timeout: 2000 }).catch(() => false)) {
          await labelFallback.click({ force: true });
        } else {
          throw new Error('No fue posible abrir el dropdown de Tipo de Operacion');
        }
      }

      await this.page.waitForSelector(this.selectors.dropdownMenuOpen, { state: 'visible', timeout: 5000 });

      const searchInput = this.page.locator(this.selectors.dropdownSearchInput).first();
      if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await searchInput.fill(tipoOperacionNombre);
        await this.page.waitForTimeout(500);
      }

      const exactOption = this.page.locator(this.selectors.dropdownOption).filter({ hasText: tipoOperacionNombre }).first();
      const hasExactOption = await exactOption.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasExactOption) {
        await exactOption.scrollIntoViewIfNeeded();
        await exactOption.click({ timeout: 5000 });
      } else {
        throw new Error(`No se encontro opcion de Tipo de Operacion: ${tipoOperacionNombre}`);
      }

      const selectedText = await button.textContent().catch(() => null);
      if (!selectedText || !selectedText.toLowerCase().includes(tipoOperacionNombre.toLowerCase())) {
        logger.warn(`Texto seleccionado no confirmado al 100%. Visible: ${selectedText ?? 'N/A'}`);
      }

      // Cascading dropdowns in TMS require stabilization after selection.
      await this.page.waitForTimeout(1500);
    } catch (error) {
      logger.error('Fallo al seleccionar Tipo de Operacion', error);
      await this.takeScreenshot('tiposervicio-select-tipo-operacion-error');
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en Guardar para Tipo de Servicio');
    try {
      const primary = this.page.locator(this.selectors.btnGuardar).first();
      const fallback = this.page.locator(this.selectors.btnGuardarFallback).first();

      if (await primary.isVisible({ timeout: 3000 }).catch(() => false)) {
        await primary.click({ timeout: 5000 }).catch(() => primary.evaluate((el) => (el as HTMLElement).click()));
      } else if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallback.click({ timeout: 5000 }).catch(() => fallback.evaluate((el) => (el as HTMLElement).click()));
      } else {
        throw new Error('No se encontro boton Guardar visible');
      }

      await Promise.race([
        this.page.waitForLoadState('networkidle').catch(() => {}),
        this.page.waitForURL(url => url.pathname.includes('/index') || url.pathname.includes('/ver') || url.pathname.includes('/view'), { timeout: 10000 }).catch(() => {}),
        this.page.locator('.alert-success, .toast-success, .swal2-success').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
        this.page.locator('.alert-danger, .alert.alert-danger, .toast-error').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      ]);
    } catch (error) {
      logger.error('Fallo al guardar Tipo de Servicio', error);
      await this.takeScreenshot('tiposervicio-click-guardar-error');
      throw error;
    }
  }

  async isFormSaved(): Promise<boolean> {
    try {
      // Polling de 10 segundos
      for (let i = 0; i < 10; i++) {
        const url = this.page.url();
        const isRedirected = url.includes('/tiposervicio/index') || 
                            url.includes('/tiposervicio/ver/') || 
                            url.includes('/tiposervicio/view/');
        
        if (isRedirected) return true;

        const successAlert = await this.page.locator('.alert-success, .toast-success, .swal2-success').first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        
        if (successAlert) return true;
        
        await this.page.waitForTimeout(1000);
      }
      return false;
    } catch (error) {
      logger.error('Fallo al verificar guardado del formulario de Tipo de Servicio', error);
      return false;
    }
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando al indice de Tipo de Servicio');
    await this.page.goto('/tiposervicio');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.searchInput).waitFor({ state: 'visible', timeout: 10000 });
  }

  async searchAndVerify(nombre: string): Promise<boolean> {
    logger.info(`Buscando Tipo de Servicio en index: ${nombre}`);
    try {
      await this.fill(this.selectors.searchInput, nombre);
      await this.click(this.selectors.btnBuscar);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1200);

      const matchingRow = this.page.locator(this.selectors.tableRows).filter({ hasText: nombre }).first();
      return await matchingRow.isVisible({ timeout: 5000 }).catch(() => false);
    } catch (error) {
      logger.error(`Fallo al buscar Tipo de Servicio "${nombre}" en index`, error);
      await this.takeScreenshot('tiposervicio-search-verify-error');
      return false;
    }
  }
}
