import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nroContrato: '#contrato-nro_contrato',
    transportistaBtn: 'button[data-id="contrato-transportista_id"]',

    // Route Modal
    btnAddRuta: 'button:has-text("Añadir Ruta")',
    modalRutas: '#modalRutas',
    btnRoute715: 'a#btn_plus_715',
    btnCargo715_19: 'a#btn_plus_ruta_715_19',
    inputTarifaViaje715: '#txt_tarifa_extra_715',
    inputTarifaConductor715: '#txt_tarifa_conductor_715',

    // Actions (Usamos ID específico)
    btnGuardar: '#btn_guardar',
    
    // Validations
    errorMessages: '.text-danger, .help-block, .alert-danger, .toast-message'
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

  // Helper de dropdown (Mantenemos Playwright click aquí porque suele funcionar bien si el selector es único)
  async selectBootstrapDropdown(triggerSelector: string, value: string) {
    const btn = this.page.locator(triggerSelector).first();
    await btn.waitFor({ state: 'visible' });
    await btn.scrollIntoViewIfNeeded();
    
    // JS Click también para el dropdown por seguridad
    await this.page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (el) el.click();
    }, triggerSelector);

    const parent = btn.locator('xpath=..');
    const menu = parent.locator('.dropdown-menu.show').first();
    await menu.waitFor({ state: 'visible' });

    const search = menu.locator('.bs-searchbox input');
    if (await search.isVisible()) {
      await search.fill(value);
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Enter');
    } else {
      await menu.locator('li a').filter({ hasText: value }).first().click();
    }

    if (await menu.isVisible()) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');

    try {
      await this.page.fill(this.selectors.nroContrato, nroContrato);

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

      logger.info(`Selecting Transportista: ${transportistaNombre}`);
      await this.selectBootstrapDropdown(this.selectors.transportistaBtn, transportistaNombre);
      logger.info('✅ Transportista selected');

      await this.forceCloseModal();

      // Guardar usando JS Injection
      await this.saveWithJsInjection();

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

  // --- OPCIÓN 1: JS INJECTION PARA GUARDAR ---
  private async saveWithJsInjection(): Promise<void> {
    logger.info('💾 Saving using JS Injection (Ghost Click)...');
    
    // Aseguramos que el elemento existe antes de inyectar
    await this.page.waitForSelector(this.selectors.btnGuardar, { state: 'attached' });
    await this.page.waitForTimeout(1000); // Estabilización final

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            logger.info(`JS Save Attempt ${attempt}...`);
            
            await Promise.all([
                this.page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 8000 }),
                // INYECCIÓN JS: Click directo al elemento DOM por ID
                this.page.evaluate((selector) => {
                    const btn = document.querySelector(selector) as HTMLElement;
                    if (btn) {
                        btn.click();
                    } else {
                        throw new Error(`Button ${selector} not found in DOM during evaluation`);
                    }
                }, this.selectors.btnGuardar)
            ]);
            
            logger.info('✅ Navigation successful');
            return;

        } catch (e) {
            logger.warn(`Attempt ${attempt} failed.`);
            
            // Verificar errores
            const rawErrors = await this.page.locator(this.selectors.errorMessages).allTextContents();
            const realErrors = rawErrors
                .map(err => err.trim())
                .filter(err => err.length > 1 && !err.includes('*') && err !== '|');

            if (realErrors.length > 0) {
                throw new Error(`Validation Errors prevented save: ${realErrors.join(' | ')}`);
            }

            if (attempt === 3) throw new Error(`Save failed after 3 JS injection attempts. URL: ${this.page.url()}`);
            
            await this.page.waitForTimeout(2000);
        }
    }
  }

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

    const inputCond = this.page.locator(this.selectors.inputTarifaConductor715);
    await inputCond.click();
    await inputCond.fill(tarifaConductor);

    const inputViaje = this.page.locator(this.selectors.inputTarifaViaje715);
    await inputViaje.click();
    await inputViaje.fill(tarifaViaje);

    await this.page.evaluate(() => {
      document.querySelectorAll('input[id^="txt_tarifa_"]').forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    });
    await this.page.waitForTimeout(1000);
  }

  async saveAndExtractId(): Promise<string> {
    await this.forceCloseModal();
    await this.saveWithJsInjection(); 
    const match = this.page.url().match(/\/contrato\/(?:ver|editar)\/(\d+)/);
    return match ? match[1] : '';
  }
}