import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    nroContrato: '#contrato-nro_contrato',
    btnGuardar: '#btn_guardar',
    errorMessages: '.text-danger, .help-block, .alert-danger, .toast-message'
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    await this.page.goto(`${config.get().baseUrl}/contrato/crear`);
    // networkidle ensures Bootstrap-Select widgets are initialised before interaction
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
      logger.warn('⚠️ navigateToCreate: networkidle timeout — continuing anyway');
    });
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');
    try {
      // --- STEP 1: Navigate to /contrato/crear if not already there ---
      if (!this.page.url().includes('/contrato/crear')) {
        logger.info('🔄 Navigating to /contrato/crear...');
        await this.navigateToCreate();
      }

      // --- STEP 2: Fill Nro Contrato ---
      const nroContratoInput = this.page.locator(this.selectors.nroContrato);
      await nroContratoInput.waitFor({ state: 'visible', timeout: 15000 });
      await nroContratoInput.fill(nroContrato);
      logger.info(`✅ Nro Contrato filled: ${nroContrato}`);

      // --- STEP 3: Select Tipo Contrato = Costo (via real UI click) ---
      logger.info('🔽 Selecting Tipo Contrato = Costo...');
      await this.page.click('button[data-id="contrato-tipo_tarifa_contrato_id"]');
      await this.page.waitForTimeout(400);
      // The tipo dropdown has only 2 items (Costo, Venta) — no searchbox needed
      await this.page.click('.bootstrap-select.show .dropdown-menu .dropdown-item:has-text("Costo")');
      logger.info('✅ Tipo Contrato = Costo selected');

      // --- STEP 4: Wait for AJAX to load Transportista options ---
      logger.info('⏳ Waiting for transportista dropdown to populate via AJAX...');
      await this.page.waitForTimeout(2500);

      // --- STEP 5: Select Transportista via Bootstrap Select searchbox ---
      logger.info(`🔽 Selecting transportista: "${transportistaNombre}"...`);
      // Open the transportista dropdown
      await this.page.click('button[data-id="contrato-transportista_id"]');
      await this.page.waitForTimeout(600);

      // Wait for the open bootstrap-select (has .show class)
      await this.page.waitForSelector('.bootstrap-select.show', { timeout: 5000 });

      // Fill the searchbox inside the open dropdown
      const searchBox = this.page.locator('.bootstrap-select.show .bs-searchbox input');
      await searchBox.waitFor({ state: 'visible', timeout: 5000 });
      await searchBox.fill(transportistaNombre);
      await this.page.waitForTimeout(800); // Wait for filter to apply

      // Click the first visible (non-hidden) result — Bootstrap marks it as .active
      // Primary: click the .active item if present
      const activeItem = this.page.locator('.bootstrap-select.show .dropdown-menu .dropdown-item.active');
      const nonHiddenItem = this.page.locator('.bootstrap-select.show .dropdown-menu .dropdown-item:not(.hidden)').first();

      const hasActive = await activeItem.count() > 0;
      if (hasActive) {
        await activeItem.first().click();
      } else {
        // Fallback: click first non-hidden result
        await nonHiddenItem.click();
      }
      await this.page.waitForTimeout(400);

      // Verify selection was registered
      const transportistaBtnText = await this.page.locator('button[data-id="contrato-transportista_id"]').textContent();
      logger.info(`✅ Transportista selected: "${transportistaBtnText?.trim()}"`);

      // --- STEP 6: Click Guardar directly (no form.submit()) ---
      await this.clickGuardar();

      // --- STEP 7: Determine result from URL ---
      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) {
        logger.info(`✅ Contract saved — ID: ${match[1]}, URL: ${currentUrl}`);
        return match[1];
      }
      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';

      // Fallback: still on /crear — check index (TMS bug: shows error but saves anyway)
      if (currentUrl.includes('/crear')) {
        logger.warn('⚠️ Still on /crear — checking index for contract...');
        return await this.findContractInIndex(nroContrato);
      }

      throw new Error(`Unexpected URL after save: ${currentUrl}`);

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  /** Click #btn_guardar directly (proven to work; avoids form.submit() TMS bug) */
  private async clickGuardar(): Promise<void> {
    logger.info('💾 Clicking Guardar...');
    const btn = this.page.locator(this.selectors.btnGuardar);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await expect(btn).toBeEnabled({ timeout: 5000 });
    await btn.click();
    // Wait for backend to process and navigate
    await this.page.waitForTimeout(5000);
    logger.info(`✅ Guardar clicked — current URL: ${this.page.url()}`);
  }

  /** Look up nroContrato in /contrato/index (fallback when URL stays on /crear) */
  private async findContractInIndex(nroContrato: string): Promise<string> {
    await this.page.goto(`${config.get().baseUrl}/contrato/index`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    const contractRow = this.page.locator('table tbody tr').filter({ hasText: nroContrato }).first();
    try {
      await expect(contractRow).toBeVisible({ timeout: 5000 });
      logger.info(`✅ Contract ${nroContrato} found in index`);
      const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
      const href = await editLink.getAttribute('href');
      const idMatch = href?.match(/\/editar\/(\d+)/);
      if (idMatch) return idMatch[1];
      return 'FOUND_IN_INDEX_NO_ID';
    } catch {
      logger.error(`❌ Contract ${nroContrato} NOT found in index — save truly failed`);
      throw new Error(`Contract ${nroContrato} not found in index after save attempts`);
    }
  }

  // --- HELPERS MEJORADOS ---
  private async injectValue(text: string) {
    logger.info(`💉 Injecting value: "${text}"`);

    const result = await this.page.evaluate((t) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const opt = Array.from(s.options).find(o => o.text.includes(t));
        if (opt) {
          const selectId = s.id || s.name || 'unknown';
          console.log(`[InjectValue] Found option "${opt.text}" (value: ${opt.value}) in select #${selectId}`);

          // Paso 1: Focus element (activa jQuery handlers)
          s.focus();
          s.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

          // Paso 2: Mouse interaction (Bootstrap validation)
          s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

          // Paso 3: Set value
          s.value = opt.value;

          // Paso 4: Input event (triggers real-time validation)
          s.dispatchEvent(new Event('input', { bubbles: true }));

          // Paso 5: Change event (triggers form state update)
          s.dispatchEvent(new Event('change', { bubbles: true }));

          // Paso 6: Mouse release
          s.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

          // Paso 7: Blur element (final validation trigger)
          s.blur();
          s.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

          // Paso 8: Bootstrap Select refresh
          // @ts-ignore
          if (window.$) window.$(s).selectpicker('refresh');

          return { success: true, selectId, optionText: opt.text, optionValue: opt.value };
        }
      }
      return { success: false };
    }, text);

    if (result.success) {
      logger.info(`✅ Value injected: "${result.optionText}" (${result.optionValue}) in select #${result.selectId}`);
    } else {
      logger.error(`❌ Failed to inject value: "${text}" - option not found in any select`);
    }

    await this.page.waitForTimeout(1000); // Espera para validación AJAX
  }

  private async saveWithRetry(): Promise<void> {
    logger.info('💾 Saving contract with routes+tariffs via btn_guardar click...');
    // CRITICAL: We must click #btn_guardar directly, NOT use form.submit().
    // The btn_guardar has onclick="validarFormulario()" which MUST run to:
    //   1. Serialize rutaArray → #rutaCarga hidden field
    //   2. Read tariff values from inputs
    // form.submit() bypasses this JS, resulting in empty rutaCarga and no tariffs saved.
    //
    // ALSO: The backend validates estado (not empty), valor_hora, valor_toque (numbers).
    // If these fail, the server returns JSON errors and does NOT save routes/tariffs.
    await this.fixRequiredBackendFields();
    const btnSelector = '#btn_guardar';
    await this.page.waitForSelector(btnSelector);

    // Verificar si está deshabilitado ANTES de intentar
    const isDisabled = await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement;
      return btn.disabled || btn.classList.contains('disabled');
    }, btnSelector);

    if (isDisabled) {
      logger.error('🚨 BUTTON DISABLED. Form validation failed.');
      // Intentar loguear campos vacíos
      const emptyFields = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[required], select[required]'))
          .filter(el => !(el as HTMLInputElement).value)
          .map(el => el.id || el.getAttribute('name'));
      });
      if (emptyFields.length > 0) logger.error(`EMPTY REQUIRED FIELDS: ${emptyFields.join(', ')}`);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const guardarButton = this.page.locator(btnSelector);
        await expect(guardarButton).toBeVisible({ timeout: 5000 });
        await expect(guardarButton).toBeEnabled({ timeout: 5000 });
        logger.info(`💾 Attempt ${attempt}: Clicking #btn_guardar (triggers validarFormulario)...`);

        // MUST use real click — btn_guardar has onclick="validarFormulario()"
        // validarFormulario() serializes rutaArray → #rutaCarga AND reads tariff inputs.
        // form.submit() would bypass this and send empty rutaCarga.
        await guardarButton.click();

        // Wait for validarFormulario + AJAX + navigation
        await this.page.waitForTimeout(5000);

        const currentUrl = this.page.url();
        logger.info(`   URL after save: ${currentUrl}`);

        // /editar endpoint stays on /editar/ID after a successful save — that's OK.
        // /crear would redirect to /editar/ID.
        // Either way, as long as we're NOT still on /crear this is a success.
        if (!currentUrl.includes('/contrato/crear')) {
          logger.info(`✅ Save successful — URL: ${currentUrl}`);
          return;
        }

        if (attempt < 3) {
          logger.warn(`⚠️ Still on /crear after attempt ${attempt} — retrying...`);
          await this.page.waitForTimeout(2000);
        }
      } catch (e) {
        logger.warn(`⚠️ Save attempt ${attempt} error: ${e}`);
        await this.page.waitForTimeout(2000);
      }
    }
    throw new Error('Save failed after 3 attempts.');
  }


  public async forceCloseModal(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') $('.modal').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
  }

  /**
   * Fills a field slowly using pressSequentially to avoid character loss
   * Critical for Bootstrap inputs with masking/validation
   */
  private async fillSlowly(selector: string, value: string, delay: number = 80): Promise<void> {
    const locator = this.page.locator(selector);
    await locator.click();
    await locator.clear();
    await this.page.waitForTimeout(200);
    await locator.pressSequentially(value, { delay });
    await this.page.waitForTimeout(300);
    // Trigger events to ensure form recognizes the value
    await this.page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, selector);
  }

  // -----------------------------------------------------------------------
  // CRITICAL: Fix backend-required fields before saving routes+tariffs.
  // The backend validates: estado (not empty), valor_hora (number),
  // valor_toque (number). If any fails, the server returns JSON errors
  // and DOES NOT save the routes — silently from the UI perspective.
  // -----------------------------------------------------------------------
  private async fixRequiredBackendFields(): Promise<void> {
    await this.page.evaluate(() => {
      // Estado = Activo (1) via Bootstrap selectpicker
      const estadoEl = document.getElementById('contrato-estado') as HTMLSelectElement;
      if (estadoEl && !estadoEl.value) {
        estadoEl.value = '1';
        const $ = (window as any).$;
        if ($) { $('#contrato-estado').selectpicker('val', '1').selectpicker('refresh').trigger('change'); }
      }
      // valor_hora and valor_toque: backend rejects "0,00" (comma-decimal),
      // so force a plain numeric "0".
      const vh = document.getElementById('contrato-valor_hora') as HTMLInputElement | null;
      const vt = document.getElementById('contrato-valor_toque') as HTMLInputElement | null;
      if (vh && (vh.value === '' || vh.value === '0,00')) vh.value = '0';
      if (vt && (vt.value === '' || vt.value === '0,00')) vt.value = '0';
    });
    await this.page.waitForTimeout(200);
  }

  // -----------------------------------------------------------------------
  // Helper: set value on an inputmask field via nativeInputValueSetter.
  // pressSequentially / .fill() both fail because the inputmask library
  // intercepts keydown events and transforms/resets the value.
  // Using the native setter bypasses inputmask and correctly sets the value,
  // after which we dispatch keyup so calcularTarifaCliente() runs.
  // -----------------------------------------------------------------------
  private async setInputMaskValue(id: string, value: string): Promise<void> {
    await this.page.evaluate(({ elId, val }) => {
      const el = document.getElementById(elId) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, { elId: id, val: value });
    await this.page.waitForTimeout(150);
  }

  // Métodos legacy necesarios
  async addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding specific Route 715 and Cargo 715_19');
    await this.forceCloseModal();
    await this.page.waitForTimeout(500);

    // --- STEP 1: Open #modalRutas and add ruta 715 ---
    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();
    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });
    await btnAnadirRuta.scrollIntoViewIfNeeded();
    await btnAnadirRuta.click();
    try {
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });
    } catch {
      logger.warn('⚠️ #modalRutas did not open, retrying...');
      await this.page.waitForTimeout(500);
      await btnAnadirRuta.click();
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });
    }
    // Clicking btn_plus_715 calls rutaPropiedadesPush(715) → adds to rutaArray
    await this.page.click('a#btn_plus_715');
    await this.page.waitForTimeout(600);
    // Close #modalRutas (only modalRutas, NOT all modals)
    await this.page.evaluate(() => {
      const $ = (window as any).$;
      if ($) $('#modalRutas').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach((b: Element) => b.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(500);

    // --- STEP 2: Expand ruta 715 panel in the form ---
    await this.page.click('#btn_click_715');
    await this.page.waitForTimeout(1000);

    // --- STEP 3: Click btn_plus_ruta_715_19 — opens #modalCargas ---
    // IMPORTANT: this click opens #modalCargas (the cargo selection modal).
    // We must close it with the × button (which triggers guardarRutaCargaEnArreglo
    // internally to persist cargo 19 in rutaArray[ruta=715].carga).
    // Using force-close (jQuery .modal('hide')) skips this and leaves carga empty.
    await this.page.click('a#btn_plus_ruta_715_19');
    await this.page.waitForTimeout(600);
    // Close #modalCargas with the × close button
    const closeCargasBtn = this.page.locator('#modalCargas button.close').first();
    if (await closeCargasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeCargasBtn.click();
    } else {
      // Fallback: force-close if button not found
      await this.forceCloseModal();
    }
    await this.page.waitForTimeout(500);

    // Verify cargo was added to rutaArray
    const rutaArrayState = await this.page.evaluate(() => JSON.stringify((window as any).rutaArray));
    logger.info(`📦 rutaArray after adding cargo: ${rutaArrayState}`);

    // --- STEP 4: Fill tariff inputs via nativeInputValueSetter ---
    // pressSequentially DOES NOT work: the inputmask library intercepts
    // keydown and transforms/resets the value before it's committed.
    // The only reliable approach is to set via nativeInputValueSetter.
    await this.page.locator('#txt_tarifa_conductor_715').waitFor({ state: 'visible', timeout: 8000 });
    logger.info(`💰 Setting tarifaConductor=${tarifaConductor}, tarifaViaje=${tarifaViaje}`);

    await this.setInputMaskValue('txt_tarifa_conductor_715', tarifaConductor);
    await this.setInputMaskValue('txt_tarifa_extra_715', tarifaViaje);

    // Trigger calcularTarifaCliente(715) to update the total field
    await this.page.evaluate(() => {
      if (typeof (window as any).calcularTarifaCliente === 'function') {
        (window as any).calcularTarifaCliente(715);
      }
    });
    await this.page.waitForTimeout(400);

    // Wait for total to show non-zero
    try {
      await this.page.waitForFunction(() => {
        const el = document.getElementById('txt_tarifa_cliente_715') as HTMLInputElement | null;
        if (!el) return false;
        return el.value.replace(/[.,\s]/g, '') !== '0' && el.value.trim() !== '';
      }, { timeout: 8000 });
      const totalValue = await this.page.locator('#txt_tarifa_cliente_715').inputValue();
      logger.info(`✅ Tarifa Total confirmed: ${totalValue}`);
    } catch {
      const condVal = await this.page.locator('#txt_tarifa_conductor_715').inputValue().catch(() => 'N/A');
      logger.warn(`⚠️ Tarifa Total did not update. conductor=${condVal}`);
    }
  }

  async saveAndExtractId(): Promise<string> {
    await this.saveWithRetry();
    const match = this.page.url().match(/\/contrato\/(?:ver|editar)\/(\d+)/);
    return match ? match[1] : '';
  }
}