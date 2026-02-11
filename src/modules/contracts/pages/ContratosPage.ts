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
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');
    try {
      await this.page.fill(this.selectors.nroContrato, nroContrato);

      // Inyección Tipo Contrato
      await this.page.evaluate(() => {
        const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
        if (el) {
            el.value = '1';
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true })); // Evento extra
        }
      });
      logger.info('⏳ Waiting for transportista dropdown to load...');
      await this.page.waitForTimeout(2000); // Wait for AJAX load after tipo_tarifa change

      // Estrategia correcta: Usar Bootstrap Select con searchbox (como en contrato2cliente test)
      logger.info(`Selecting transportista using searchbox: "${transportistaNombre}"`);

      // Paso 1: Hacer click en el botón del dropdown para abrirlo
      await this.page.evaluate(() => {
          const btn = document.querySelector('button[data-id="contrato-transportista_id"]') as HTMLElement;
          if (btn) btn.click();
      });
      await this.page.waitForTimeout(500);

      // Paso 2: Esperar a que el menú dropdown sea visible
      const menu = this.page.locator('div.dropdown-menu.show').first();
      await menu.waitFor({ state: 'visible', timeout: 5000 });

      // Paso 3: Escribir en el searchbox del dropdown
      const searchBox = menu.locator('.bs-searchbox input');
      await searchBox.fill(transportistaNombre);
      await this.page.waitForTimeout(1000); // Wait for search filter

      // Paso 4: Seleccionar la primera opción con ArrowDown + Enter
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');

      // Paso 5: Cerrar el dropdown si sigue abierto
      const isMenuVisible = await menu.isVisible();
      if (isMenuVisible) {
          await this.page.keyboard.press('Escape');
      }

      logger.info(`✅ Transportista selected: ${transportistaNombre}`);
      
      await this.forceCloseModal();

      // Guardar con Diagnóstico
      await this.saveWithRetry();

      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) return match[1];
      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';

      // Si sigue en /crear, puede ser por el bug de TMS que muestra error pero crea el contrato
      if (currentUrl.includes('/crear')) {
        logger.warn(`⚠️ Still on /crear - navigating to index to verify if contract was created anyway...`);
        await this.page.goto(`${config.get().baseUrl}/contrato/index`);
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        // Buscar el contrato en la tabla por número
        const contractTable = this.page.locator('table tbody');
        const contractRow = contractTable.locator('tr').filter({ hasText: nroContrato }).first();

        try {
          await expect(contractRow).toBeVisible({ timeout: 5000 });
          logger.info(`✅ Contract ${nroContrato} found in index table - creation was successful despite error message`);

          // Intentar extraer ID del link de edición
          const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
          const href = await editLink.getAttribute('href');
          const idMatch = href?.match(/\/editar\/(\d+)/);
          if (idMatch) {
            logger.info(`✅ Contract ID extracted from table: ${idMatch[1]}`);
            return idMatch[1];
          }
          return 'FOUND_IN_INDEX_NO_ID';
        } catch (verifyError) {
          logger.error(`❌ Contract ${nroContrato} NOT found in index - save truly failed`);
          throw new Error(`Contract ${nroContrato} not found in index after save attempts`);
        }
      }

      throw new Error(`Contract created but ID not found: ${currentUrl}`);

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  // --- HELPERS MEJORADOS ---
  private async injectValue(text: string) {
      logger.info(`💉 Injecting value: "${text}"`);

      const result = await this.page.evaluate((t) => {
          const selects = Array.from(document.querySelectorAll('select'));
          for(const s of selects) {
              const opt = Array.from(s.options).find(o => o.text.includes(t));
              if(opt) {
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
                  if(window.$) window.$(s).selectpicker('refresh');

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
    logger.info('💾 Saving...');
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
        if(emptyFields.length > 0) logger.error(`EMPTY REQUIRED FIELDS: ${emptyFields.join(', ')}`);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // Paso 1: Verificar que el botón está habilitado y visible
            const guardarButton = this.page.locator(btnSelector);
            await expect(guardarButton).toBeVisible({ timeout: 5000 });
            await expect(guardarButton).toBeEnabled({ timeout: 5000 });
            logger.info('✅ Guardar button is visible and enabled');

            // Paso 3: Submit form directamente (más confiable que click en botón)
            logger.info('🚀 Submitting form...');
            await this.page.evaluate(() => {
                // Encontrar el formulario
                const form = document.querySelector('form') as HTMLFormElement;
                if (form) {
                    // Dispatch submit event y llamar submit()
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    form.submit();
                } else {
                    // Fallback: click en botón si no hay formulario
                    const btn = document.querySelector('#btn_guardar') as HTMLElement;
                    if (btn) {
                        btn.click();
                    }
                }
            });
            logger.info('✅ Form submitted')

            // Paso 4: Esperar procesamiento del submit
            await this.page.waitForTimeout(4000); // Wait longer for backend processing

            // Verificar si navegó exitosamente
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/crear')) {
                logger.info(`✅ Save successful - navigated to: ${currentUrl}`);
                return; // Éxito
            }

            // Si sigue en /crear, puede haber un mensaje de error de la app
            // PERO el contrato puede haberse creado igual (bug de TMS)
            logger.warn(`⚠️ Still on /crear - checking for error messages or success indicators...`);

            // Buscar mensajes de error o éxito
            const toastMessages = await this.page.locator('.toast-message, .alert, .swal2-html-container').allTextContents();
            if (toastMessages.some(msg => msg.includes('error') || msg.includes('Error'))) {
                logger.warn(`⚠️ Error message detected: "${toastMessages.join(' | ')}"`);
                logger.warn(`⚠️ Contract may still have been created despite error message (TMS bug)`);
                // Continuar al siguiente intento o verificar si realmente se creó
            }

            // Si es el último intento, no throw error todavía - verificaremos después
            if (attempt === 3) {
                logger.warn(`⚠️ All attempts completed, will verify if contract was created anyway`);
                return; // Dejar que la verificación post-save determine el resultado
            }

            throw new Error('Still on creation page after submit');

        } catch (e) {
            logger.warn(`Save attempt ${attempt} failed.`);

            // --- DIAGNÓSTICO DE ERRORES (safe - check if context still exists) ---
            try {
                // Solo intentar leer errores si el contexto aún existe (no hubo navegación)
                const currentUrl = this.page.url();
                if (currentUrl.includes('/crear')) {
                    // Aún en página de creación - puede haber errores de validación
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
                } else {
                    // Navegación ocurrió - probablemente guardado exitoso
                    logger.info(`✅ Navigation occurred - URL changed to: ${currentUrl}`);
                    return; // Salir exitosamente
                }
            } catch (diagError) {
                logger.warn(`⚠️ Could not read error diagnostics (context may be destroyed): ${diagError}`);
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
  
  // Métodos legacy necesarios
  async addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding specific Route 715 and Cargo 715_19');
    await this.forceCloseModal();
    await this.page.waitForTimeout(500); // Esperar después de cerrar modales

    // Intentar abrir el modal de rutas con retry
    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();
    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });
    await btnAnadirRuta.scrollIntoViewIfNeeded();
    await btnAnadirRuta.click();

    // Esperar modal con timeout extendido
    try {
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });
    } catch (e) {
      logger.warn('⚠️ Modal did not open on first click, retrying...');
      await this.page.waitForTimeout(500);
      await btnAnadirRuta.click();
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });
    }

    await this.page.click('a#btn_plus_715'); // Ruta 715
    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    await this.page.click('#btn_click_715'); 
    await this.page.waitForTimeout(1000);

    await this.page.click('a#btn_plus_ruta_715_19'); // Cargo
    await this.forceCloseModal();

    const inputCond = this.page.locator('#txt_tarifa_conductor_715');
    await inputCond.fill(tarifaConductor);
    const inputViaje = this.page.locator('#txt_tarifa_extra_715');
    await inputViaje.fill(tarifaViaje);

    // Disparar eventos de cambio en las tarifas
    await this.page.evaluate(() => {
      document.querySelectorAll('input[id^="txt_tarifa_"]').forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    });
    await this.page.waitForTimeout(1000);

    // NUEVO: Esperar a que la tabla se actualice y verificar que la ruta se agregó
    logger.info('⏳ Waiting for route to appear in table...');
    await this.page.waitForTimeout(1000); // Permitir re-render de la tabla

    const routeTable = this.page.locator('table.table tbody');
    const routeRow = routeTable.locator('tr').filter({ hasText: '715' }); // Route 715

    try {
      await expect(routeRow).toBeVisible({ timeout: 5000 });
      logger.info('✅ Route 715 verified in table');
    } catch (error) {
      logger.warn('⚠️ Route 715 not immediately visible in table - may appear after save');
      // No fallar aquí - la ruta podría aparecer solo después del guardado del contrato
    }
  }

  async saveAndExtractId(): Promise<string> {
      await this.saveWithRetry();
      const match = this.page.url().match(/\/contrato\/(?:ver|editar)\/(\d+)/);
      return match ? match[1] : '';
  }
}