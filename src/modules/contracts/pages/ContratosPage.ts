import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nroContrato: '#contrato-nro_contrato',
    tipoContratoDropdown: '.filter-option-inner-inner',
    tipoContratoOption: '.dropdown-item[role="option"]',
    
    // Transportista
    transportistaButton: 'button[data-id="contrato-transportista_id"]',
    transportistaOptions: '.dropdown-menu.show .dropdown-item',
    
    fechaVencimiento: '#contrato-fecha_vencimiento',
    valorHora: '#contrato-valor_hora',
    modalidadButton: '.btn.dropdown-toggle.btn-light[data-id="modalidad_contrato"]',
    modalidadOption: '.dropdown-item.selected.active',
    archivosAdjuntos: 'input[type="file"][name="adjuntos[]"]',
    
    // Actions
    btnGuardar: '#btn_guardar',
    btnVolver: 'a.btn.btn-primary[href="/contrato/index"]',
    
    // Validations
    invalidField: '[aria-invalid="true"]',
    helpBlock: '.help-block.badge.badge-danger',
    
    // Edit Mode Actions
    btnOutlineSuccess: '.btn.btn-outline-success.btn-sm',
    btnPlus715: '#btn_plus_715',
    
    // Additional Edit Actions
    btnCerrarModal: '.btn.btn-secondary.waves-effect.waves-light',
    btnAddCarga: '#btn_click_715',
    btnAddRuta: '#btn_plus_ruta_715_19',
    inputTarifaViaje: '#txt_tarifa_extra_715',
    inputTarifaConductor: '#txt_tarifa_conductor_715',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/contrato/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }



  async fillNroContrato(nro: string): Promise<void> {
    logger.info(`Filling contract number: ${nro}`);
    
    try {
      await this.fill(this.selectors.nroContrato, nro);
    } catch (error) {
      logger.error('Failed to fill contract number', error);
      await this.takeScreenshot('fill-nro-contrato-error');
      throw error;
    }
  }

  async selectTipoContrato(tipo: string): Promise<void> {
    logger.info(`Selecting contract type: ${tipo}`);
    
    try {
      // Click en el dropdown para abrirlo
      await this.page.click('.filter-option-inner-inner');
      await this.page.waitForTimeout(500);
      
      // Esperar que el dropdown esté visible
      await this.page.waitForSelector('.dropdown-item[role="option"]', { 
        state: 'visible',
        timeout: 5000 
      });
      
      // Click en la opción específica usando el texto
      const optionSelector = `.dropdown-item[role="option"]:has-text("${tipo}")`;
      await this.page.click(optionSelector);
      
      await this.page.waitForTimeout(500);
      
      logger.info(`✅ Contract type "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select contract type: ${tipo}`, error);
      await this.takeScreenshot(`select-tipo-contrato-error`);
      throw error;
    }
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting transportista: ${nombre}`);
    
    try {
      // Esperar que el dropdown de transportista aparezca
      await this.page.waitForSelector(this.selectors.transportistaButton, { state: 'visible' });
      
      // Identificar el contenedor específico del dropdown (padre del botón)
      const dropdownContainer = this.page.locator('div.dropdown')
        .filter({ has: this.page.locator(this.selectors.transportistaButton) });

      // Click en el dropdown de transportista
      await this.page.click(this.selectors.transportistaButton);
      
      // Esperar que el menú ESPECÍFICO se despliegue
      const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show').first();
      await dropdownMenu.waitFor({ state: 'visible' });
      
      // Intentar usar la búsqueda si existe (para listas largas)
      const searchInput = dropdownMenu.locator('.bs-searchbox input');
      if (await searchInput.count() > 0 && await searchInput.isVisible()) {
        logger.info('Using search box to filter transportista');
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(500); // Esperar filtrado
      }
      
      // Buscar la opción usando locator y filtro de texto dentro del menú específico
      const option = dropdownMenu.locator('.dropdown-item').filter({ hasText: nombre }).first();
      
      // Verificar si existe
      if (await option.count() === 0) {
        throw new Error(`Transportista "${nombre}" not found in dropdown`);
      }
      
      // Click en la opción
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

  async setFechaVencimiento(fecha: string): Promise<void> {
    logger.info(`Setting expiration date: ${fecha}`);
    
    try {
      await this.fill(this.selectors.fechaVencimiento, fecha);
    } catch (error) {
      logger.error('Failed to set expiration date', error);
      await this.takeScreenshot('set-fecha-vencimiento-error');
      throw error;
    }
  }

  async fillValorHora(valor: string): Promise<void> {
    logger.info(`Filling hourly rate: ${valor}`);
    
    try {
      await this.fill(this.selectors.valorHora, valor);
    } catch (error) {
      logger.error('Failed to fill hourly rate', error);
      await this.takeScreenshot('fill-valor-hora-error');
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

  async clickVolver(): Promise<void> {
    logger.info('Clicking back button');
    
    try {
      await this.click(this.selectors.btnVolver);
    } catch (error) {
      logger.error('Failed to click back button', error);
      await this.takeScreenshot('click-volver-error');
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

  async clickOutlineSuccessButton(): Promise<void> {
    logger.info('Clicking outline success button');
    try {
      await this.waitForElement(this.selectors.btnOutlineSuccess);
      await this.click(this.selectors.btnOutlineSuccess);
    } catch (error) {
      logger.error('Failed to click outline success button', error);
      await this.takeScreenshot('click-outline-success-error');
      throw error;
    }
  }

  async clickPlus715Button(): Promise<void> {
    logger.info('Clicking plus 715 button');
    try {
      await this.waitForElement(this.selectors.btnPlus715);
      await this.click(this.selectors.btnPlus715);
    } catch (error) {
      logger.error('Failed to click plus 715 button', error);
      await this.takeScreenshot('click-plus-715-error');
      throw error;
    }
  }

  async clickCerrarModal(): Promise<void> {
    logger.info('Clicking close modal button');
    try {
      // Target the visible 'Cerrar' button specifically
      // Using :visible pseudo-class to ignore hidden instances from other modals
      const button = this.page.locator(`${this.selectors.btnCerrarModal}:visible`)
        .filter({ hasText: 'Cerrar' })
        .first();
      
      await button.waitFor({ state: 'visible', timeout: 10000 });
      await button.scrollIntoViewIfNeeded();
      await button.click();
    } catch (error) {
      logger.error('Failed to click close modal button', error);
      await this.takeScreenshot('click-cerrar-modal-error');
      throw error;
    }
  }

  async clickAddCarga(): Promise<void> {
    logger.info('Clicking add carga button');
    try {
      await this.waitForElement(this.selectors.btnAddCarga);
      await this.click(this.selectors.btnAddCarga);
    } catch (error) {
      logger.error('Failed to click add carga button', error);
      await this.takeScreenshot('click-add-carga-error');
      throw error;
    }
  }

  async clickAddRuta(): Promise<void> {
    logger.info('Clicking add ruta button');
    try {
      await this.waitForElement(this.selectors.btnAddRuta);
      await this.click(this.selectors.btnAddRuta);
    } catch (error) {
      logger.error('Failed to click add ruta button', error);
      await this.takeScreenshot('click-add-ruta-error');
      throw error;
    }
  }

  async fillTarifaViaje(valor: string): Promise<void> {
    logger.info(`Filling tarifa viaje: ${valor}`);
    try {
      await this.fill(this.selectors.inputTarifaViaje, valor);
      // Press Enter to ensure value is committed/formatted by the system
      await this.page.press(this.selectors.inputTarifaViaje, 'Enter');
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.error('Failed to fill tarifa viaje', error);
      await this.takeScreenshot('fill-tarifa-viaje-error');
      throw error;
    }
  }

  async fillTarifaConductor(valor: string): Promise<void> {
    logger.info(`Filling tarifa conductor: ${valor}`);
    try {
      await this.fill(this.selectors.inputTarifaConductor, valor);
      // Press Enter to ensure value is committed/formatted by the system
      await this.page.press(this.selectors.inputTarifaConductor, 'Enter');
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.error('Failed to fill tarifa conductor', error);
      await this.takeScreenshot('fill-tarifa-conductor-error');
      throw error;
    }
  }
}