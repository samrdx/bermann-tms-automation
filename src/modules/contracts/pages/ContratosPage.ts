import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nroContrato: '#contrato-nro_contrato',
    
    // Transportista (Botón disparador del dropdown)
    transportistaBtn: 'button[data-id="contrato-transportista_id"]',

    // Route Modal
    btnAddRuta: 'button:has-text("Añadir Ruta")',
    modalRutas: '#modalRutas',
    btnRoute715: 'a#btn_plus_715',
    btnCargo715_19: 'a#btn_plus_ruta_715_19',
    inputTarifaViaje715: '#txt_tarifa_extra_715',
    inputTarifaConductor715: '#txt_tarifa_conductor_715',

    // Actions
    btnGuardar: '#btn_guardar',
    
    // Validations
    errorMessages: '.text-danger, .help-block, .alert-danger'
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('🧭 Navigating to contract creation page');
    const indexUrl = `${config.get().baseUrl}/contrato/index`;
    await this.page.goto(indexUrl);
    await this.page.waitForLoadState('networkidle');

    const createBtn = this.page.locator('a:has-text("Crear"), a:has-text("Nuevo"), a[href*="/crear"]').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
    } else {
      await this.page.goto(`${config.get().baseUrl}/contrato/crear`);
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Helper Robusto para Dropdowns Bootstrap (Scoping)
   */
  async selectBootstrapDropdown(triggerSelector: string, value: string) {
    const btn = this.page.locator(triggerSelector).first();
    await btn.waitFor({ state: 'visible' });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // SCOPING: Buscar menú dentro del padre para evitar errores de Strict Mode
    const parent = btn.locator('xpath=..');
    const menu = parent.locator('.dropdown-menu.show').first();
    await menu.waitFor({ state: 'visible' });

    const search = menu.locator('.bs-searchbox input');
    if (await search.isVisible()) {
      await search.fill(value);
      await this.page.waitForTimeout(500); // Espera técnica para filtrado
      await this.page.keyboard.press('Enter');
    } else {
      // Click directo si no hay search
      await menu.locator('li a').filter({ hasText: value }).first().click();
    }

    // Asegurar cierre
    if (await menu.isVisible()) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');

    try {
      // 1. Llenar Nro Contrato
      await this.page.fill(this.selectors.nroContrato, nroContrato);

      // 2. Seleccionar Tipo Contrato = "Costo" (1)
      await this.page.evaluate(() => {
        const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
        if (el) {
          el.value = '1';
          el.dispatchEvent(new Event('change', { bubbles: true }));
          // @ts-ignore
          if (typeof $ !== 'undefined') $(el).selectpicker('refresh');
        }
      });
      await this.page.waitForTimeout(1000);

      // 3. Seleccionar Transportista (Usando el Helper Robusto)
      logger.info(`Selecting Transportista: ${transportistaNombre}`);
      await this.selectBootstrapDropdown(this.selectors.transportistaBtn, transportistaNombre);
      logger.info('✅ Transportista selected');

      // 4. Limpieza Preventiva
      await this.forceCloseModal();

      // 5. Guardar
      logger.info('💾 Saving basic contract...');
      const btnGuardar = this.page.locator(this.selectors.btnGuardar).first();
      await btnGuardar.scrollIntoViewIfNeeded();
      await btnGuardar.click();

      // Esperar navegación o detectar error
      try {
        await this.page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 10000 });
        logger.info('✅ Navigation successful');
      } catch (e) {
        // --- FIX CRÍTICO: Filtrar asteriscos (*) del reporte de errores ---
        const rawErrors = await this.page.locator(this.selectors.errorMessages).allTextContents();
        const realErrors = rawErrors
            .map(err => err.trim())
            .filter(err => err.length > 1 && !err.includes('*') && err !== '|');

        if (realErrors.length > 0) {
          throw new Error(`Save Failed with Validation Errors: ${realErrors.join(' | ')}`);
        }
        // Si no hay errores visibles pero no navegó
        throw new Error('Save clicked but navigation did not occur and no validation errors found.');
      }

      // 6. Extraer ID
      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) return match[1];

      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';
      
      throw new Error(`Contract created but ID not found in URL: ${currentUrl}`);

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  // --- MÉTODOS AUXILIARES ---

  public async forceCloseModal(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') $('.modal').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(300);
  }

  async addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding specific Route 715 and Cargo 715_19');
    await this.forceCloseModal();

    await this.page.click(this.selectors.btnAddRuta);
    await this.page.waitForSelector('#modalRutas', { state: 'visible' });

    await this.page.click(this.selectors.btnRoute715);
    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    await this.page.click('#btn_click_715'); 
    await this.page.waitForTimeout(1000);

    await this.page.click(this.selectors.btnCargo715_19);
    await this.forceCloseModal();

    // Llenar tarifas
    const inputCond = this.page.locator(this.selectors.inputTarifaConductor715);
    await inputCond.click();
    await inputCond.fill(tarifaConductor);

    const inputViaje = this.page.locator(this.selectors.inputTarifaViaje715);
    await inputViaje.click();
    await inputViaje.fill(tarifaViaje);

    // Disparar eventos
    await this.page.evaluate(() => {
      document.querySelectorAll('input[id^="txt_tarifa_"]').forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    });
    await this.page.waitForTimeout(1000);
  }
}