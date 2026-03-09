import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

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
    vencimientoLicenciaInput: '#conductores-vencimiento_licencia',

    // Underlying select elements
    transportistaSelect: '#conductores-transportista_id',
    licenciaSelect: '#conductores-licencia',

    // Dropdown triggers (Bootstrap Select)
    transportistaBtn: 'button[data-id="conductores-transportista_id"]',
    licenciaBtn: 'button[data-id="conductores-licencia"]',

    // Actions
    guardarBtn: '#btn_guardar',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a la página de creación de Conductor');
    await this.page.goto('/conductores/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillUsuario(usuario: string): Promise<void> {
    logger.info(`Llenando usuario: ${usuario}`);
    await this.fill(this.selectors.usuario, usuario);
  }

  async fillClave(clave: string): Promise<void> {
    logger.info('Llenando clave');
    await this.fill(this.selectors.clave, clave);
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Llenando nombre: ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillApellido(apellido: string): Promise<void> {
    logger.info(`Llenando apellido: ${apellido}`);
    await this.fill(this.selectors.apellido, apellido);
  }

  async fillDocumento(documento: string): Promise<void> {
    logger.info(`Llenando documento: ${documento}`);
    await this.fillRutWithVerify(this.selectors.documento, documento);
    await this.page.keyboard.press('Tab'); // Trigger validation
  }

  async fillTelefono(telefono: string): Promise<void> {
    logger.info(`Llenando telefono: ${telefono}`);
    await this.fill(this.selectors.telefono, telefono);
  }

  async fillEmail(email: string): Promise<void> {
    logger.info(`Llenando email: ${email}`);
    await this.fill(this.selectors.email, email);
  }

  async selectTransportista(name: string): Promise<void> {
    logger.info(`Seleccionando transportista: [${name}]`);
    await this.selectFromBootstrapDropdown(this.selectors.transportistaBtn, name);
  }

  async selectLicencia(tipo: string): Promise<void> {
    logger.info(`Seleccionando licencia: [${tipo}]`);
    await this.selectFromBootstrapDropdown(this.selectors.licenciaBtn, tipo);
  }

  /**
   * Sets the license expiration date robustly.
   * Uses JS evaluate to bypass datetimepicker limitations.
   * @param date Date in YYYY-MM-DD or DD-MM-YYYY format
   */
  async setVencimientoLicencia(date: string): Promise<void> {
    logger.info(`Configurando vencimiento licencia: [${date}]`);

    // Normalize format to DD-MM-YYYY if it's YYYY-MM-DD
    let formattedDate = date;
    if (date.includes('-') && date.split('-')[0].length === 4) {
      const [y, m, d] = date.split('-');
      formattedDate = `${d}-${m}-${y}`;
    }

    await this.page.waitForSelector(this.selectors.vencimientoLicenciaInput, { state: 'visible' });

    await this.page.evaluate(({ selector, value }) => {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, { selector: this.selectors.vencimientoLicenciaInput, value: formattedDate });

    logger.debug(`Fecha configurada via JS: ${formattedDate}`);
  }

  /**
   * Private helper for Bootstrap Select dropdowns (Hybrid Pattern)
   */
  private async selectFromBootstrapDropdown(btnSelector: string, optionText: string): Promise<void> {
    const button = this.page.locator(btnSelector);
    await button.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
    await button.waitFor({ state: 'visible', timeout: 1500 }).catch(() => { });

    // 1. Open dropdown via evaluate to be extremely robust
    await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLElement;
      if (btn) btn.click();
    }, btnSelector);

    // 2. Locate the container
    const container = this.page.locator('div.bootstrap-select').filter({ has: button });
    const searchInput = container.locator('div.bs-searchbox input');

    // 3. Search and select
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill(optionText);
      await this.page.waitForTimeout(500); // Wait for filter
    }

    // Use a more relaxed search for the option
    const option = container.locator('ul.dropdown-menu li a').filter({ hasText: optionText }).first();
    await option.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
    await option.evaluate((node: HTMLElement) => node.click());

    // 4. Verification & Force Sync (Crucial for Demo & Firefox)
    await this.page.waitForTimeout(500);
    const selectedText = await button.innerText();
    if (!selectedText.toLowerCase().includes(optionText.toLowerCase())) {
      logger.warn(`⚠️ La UI del dropdown no se actualizó a [${optionText}]. Actual: [${selectedText}]. Forzando valor vía JS...`);
    }

    // ALWAYS force sync the underlying <select> to prevent validation errors like "Transportista ID no puede estar vacío"
    // even if the Bootstrap UI button updated correctly, Firefox sometimes drops the underlying change event.
    await this.page.evaluate(({ btnSel, text }) => {
      const btn = document.querySelector(btnSel) as HTMLElement;
      const container = btn.closest('.bootstrap-select');
      const select = container?.querySelector('select') as HTMLSelectElement;
      const options = Array.from(select?.options || []);
      const target = options.find(o => o.text.trim().toLowerCase().includes(text.toLowerCase()));
      if (select && target) {
        select.value = target.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        // Try to trigger bootstrap-select refresh if possible
        try { (window as any).$(select).selectpicker('refresh'); } catch (e) { }
      }
    }, { btnSel: btnSelector, text: optionText });
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en Guardar');
    const btn = this.page.locator(this.selectors.guardarBtn);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    // Use evaluate to bypass Firefox backdrop/overlay interception (same fix as ContratosPage)
    await btn.evaluate((el: HTMLElement) => el.click());
  }

  async isFormSaved(): Promise<boolean> {
    try {
      // Check for validation errors that might be blocking the save
      const errorMsg = this.page.locator('.help-block-error, .invalid-feedback, .alert-danger').filter({ hasText: /./ }).first();
      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await errorMsg.innerText();
        logger.error(`❌ Error de validación detectado: "${text}"`);
        return false;
      }

      // Firefox can be slower navigating after form submit — increased to 25s
      await this.page.waitForURL(
        url => url.toString().includes('/conductores/index') || url.toString().includes('/conductores/ver'),
        { timeout: 25000 }
      );
      return true;
    } catch (error) {
      logger.error('Error esperando el guardado del formulario', error);
      return false;
    }
  }
}
