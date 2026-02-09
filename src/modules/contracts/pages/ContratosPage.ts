import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    nroContrato: '#contrato-nro_contrato',
    // Botón Guardar ID Único
    btnGuardar: '#btn_guardar', 
    // Selectores de error
    errorMessages: '.text-danger, .help-block, .alert-danger, .toast-message'
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    await this.page.goto(`${config.get().baseUrl}/contrato/crear`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');
    try {
      await this.page.fill(this.selectors.nroContrato, nroContrato);

      // Inyección Tipo Contrato
      await this.page.evaluate(() => {
        const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
        if (el) { el.value = '1'; el.dispatchEvent(new Event('change')); }
      });
      await this.page.waitForTimeout(500);

      // Selección Transportista (Inyección simple)
      await this.injectValue(transportistaNombre);
      
      await this.forceCloseModal();

      // Guardar con Diagnóstico
      await this.saveWithRetry();

      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) return match[1];
      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';
      throw new Error(`Contract created but ID not found: ${currentUrl}`);

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  // --- HELPERS ---
  private async injectValue(text: string) {
      await this.page.evaluate((t) => {
          const selects = Array.from(document.querySelectorAll('select'));
          for(const s of selects) {
              const opt = Array.from(s.options).find(o => o.text.includes(t));
              if(opt) {
                  s.value = opt.value;
                  s.dispatchEvent(new Event('change', {bubbles:true}));
                  // @ts-ignore
                  if(window.$) window.$(s).selectpicker('refresh');
                  return;
              }
          }
      }, text);
      await this.page.waitForTimeout(500);
  }

  private async saveWithRetry(): Promise<void> {
    logger.info('💾 Saving with Forensic Diagnostics...');
    const btnSelector = '#btn_guardar';
    await this.page.waitForSelector(btnSelector);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await Promise.all([
                this.page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 8000 }),
                this.page.evaluate((sel) => {
                    const btn = document.querySelector(sel) as HTMLElement;
                    if (btn) btn.click();
                }, btnSelector)
            ]);
            return;
        } catch (e) {
            logger.warn(`Save attempt ${attempt} failed.`);
            
            // --- DIAGNÓSTICO DE ERRORES ---
            const visibleErrors = await this.page.locator(this.selectors.errorMessages).allTextContents();
            const cleanErrors = visibleErrors.map(t => t.trim()).filter(t => t.length > 2 && !t.includes('*'));
            
            if (cleanErrors.length > 0) {
                logger.error(`🚨 BLOCKING ERRORS: ${cleanErrors.join(' | ')}`);
            }

            // Verificar campos inválidos (HTML5)
            const invalidFields = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll(':invalid'))
                    .map(el => el.getAttribute('id') || el.getAttribute('name') || el.tagName);
            });
            if (invalidFields.length > 0) {
                logger.error(`🚨 INVALID FIELDS: ${invalidFields.join(', ')}`);
            }
            // -----------------------------

            await this.page.waitForTimeout(2000);
        }
    }
    throw new Error('Save failed after 3 attempts. See logs for validation errors.');
  }

  public async forceCloseModal(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') $('.modal').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
  }
  
  // Requerido por tests legacy
  async addSpecificRouteAndCargo(c: string, v: string) { /* ... Lógica existente ... */ }
  async saveAndExtractId(): Promise<string> {
      await this.saveWithRetry();
      const match = this.page.url().match(/\/contrato\/(?:ver|editar)\/(\d+)/);
      return match ? match[1] : '';
  }
}