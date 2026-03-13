import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('UnidadNegocioPage');

export interface UnidadNegocioData {
  nombre: string;
}

/**
 * Page Object for Unidad de Negocio creation page
 * URL: /unidadnegocio/crear
 */
export class UnidadNegocioPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nombre: '#unidadnegocio-nombre',

    // Actions
    btnGuardar: 'button.btn-success:has-text("Guardar")',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a la página de creación de Unidad de Negocio');
    await this.page.goto('/unidadnegocio/crear');
    await this.page.waitForLoadState('domcontentloaded');
    const coreElement = this.page.locator(this.selectors.nombre);
    await coreElement.waitFor({ state: 'visible' });
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Completando nombre: ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en el botón guardar');
    await this.page.waitForSelector(this.selectors.btnGuardar, { state: 'visible' }); // Ensure button is visible
    await this.click(this.selectors.btnGuardar);
    await this.page.waitForLoadState('networkidle'); // Wait for network to be idle after save
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000); // Give time for redirection/save
      const url = this.page.url();
      // Expecting a redirect to /unidadnegocio/index or /unidadnegocio/ver/:id after save
      return url.includes('/unidadnegocio/index') || url.includes('/unidadnegocio/ver/');
    } catch (error) {
      logger.error('Fallo al verificar si el formulario se guardó', error);
      return false;
    }
  }
}