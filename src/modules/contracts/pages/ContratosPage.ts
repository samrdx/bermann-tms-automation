import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

const logger = createLogger('ContratosFormPage');

/**
 * Environment-specific route/cargo configuration.
 * QA uses Route 715 / Cargo 715_19.
 * Demo uses Route 47 / Cargo 47_6.
 */
interface RouteConfig {
  routeId: string;
  routeButtonSelector: string;
  addCargoButtonSelector: string;
  cargoButtonSelector: string;
  tarifaViajeSelector: string;
  tarifaConductorSelector: string | null;
  tarifaClienteSelector: string | null;
}

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    nroContrato: '#contrato-nro_contrato',
    tipoContratoButton: 'button[data-id="contrato-tipo_tarifa_contrato_id"]', // for bootstrap select helper
    subtipoDropdown: 'select#tipo', // for selecting subtype value
    transportistaButton: 'button[data-id="contrato-transportista_id"]',
    clienteDropdown: '#contrato-cliente_id', // for direct jQuery selection
    fechaVencimiento: '#contrato-fecha_vencimiento',
    unidadNegocioButton: 'button[data-id="drop_business_unit"]',
    btnGuardar: '#formContrato #btn_guardar, #form-dinamico #btn_guardar',
    btnGuardarContrato: '#formContrato #btn_guardar_contrato, #form-dinamico #btn_guardar_contrato',
    btnAddRuta: 'button:has-text("Añadir Ruta")',
    modalRutas: '#modal_rutas',
    errorMessages: '.text-danger, .help-block, .alert-danger, .toast-message',
  };

  constructor(page: Page) {
    super(page);
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------

  async navigateToCreate(): Promise<void> {
    // Use relative path — Playwright's baseURL (set in playwright.config.ts) handles ENV=QA/DEMO
    logger.info('Navigating to contract creation page: /contrato/crear');
    await this.page.goto('/contrato/crear');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {
      logger.warn('⚠️ navigateToCreate: domcontentloaded timeout — continuing anyway');
    });
    await this.page.waitForSelector(this.selectors.nroContrato, { state: 'visible', timeout: 10000 });
    logger.info('✅ Contract creation page loaded and Nro Contrato input visible');
  }

  // ---------------------------------------------------------------------------
  // TYPE AND SUBTYPE SELECTION
  // ---------------------------------------------------------------------------

  async selectTipoContrato(tipo: 'Costo' | 'Venta'): Promise<void> {
    logger.info(`🔽 Selecting Tipo Contrato = ${tipo}...`);
    // The dropdown itself is #contrato-tipo_tarifa_contrato_id, but the visible element is a button.
    await this.selectBootstrapDropdown(this.selectors.tipoContratoButton, tipo);
    await this.page.waitForTimeout(2500); // Wait for cascade (Transportista/Cliente dropdowns)

    // If 'Venta' is selected, wait for rendersubview AJAX call to complete
    if (tipo === 'Venta') {
      logger.info('⏳ Waiting for rendersubview (AJAX)...');
      await this.page.waitForResponse(
        r => r.url().includes('rendersubview') && r.status() === 200,
        { timeout: 15000 }
      ).catch(() => {
        logger.warn('⚠️ rendersubview response not detected for Tipo Venta, continuing with extra timeout...');
        return this.page.waitForTimeout(3000);
      });
      await this.page.waitForTimeout(1000); // Stability buffer
    }
    logger.info(`✅ Tipo ${tipo} selected`);
  }

  async selectSubtipo(subtipoValue: string): Promise<void> {
    logger.info(`Selecting Subtipo: ${subtipoValue}...`);
    await this.page.waitForSelector(this.selectors.subtipoDropdown, { state: 'attached', timeout: 10000 });
    await this.page.evaluate((value) => {
      const el = document.querySelector('select#tipo') as HTMLSelectElement; // select#tipo is the actual ID
      if (el) { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, subtipoValue);
    await this.page.waitForTimeout(800); // Give time for any cascade
    logger.info(`✅ Subtipo ${subtipoValue} selected`);
  }

  // ---------------------------------------------------------------------------
  // CLIENTE SELECTION
  // ---------------------------------------------------------------------------

  async selectCliente(clienteNombre: string): Promise<void> {
    logger.info(`Selecting Cliente: "${clienteNombre}"...`);
    const clienteSelected = await this.page.evaluate(({ nombre, selectorId }) => {
      const $ = (window as any).jQuery;
      const $sel = $(selectorId);
      const opt = $sel.find('option').filter(function (this: any) {
        return ($(this).text() || '').toUpperCase().includes(nombre.toUpperCase());
      });
      if (opt.length > 0) {
        const val = opt.first().val();
        $sel.val(val).trigger('change');
        if ($sel.selectpicker) $sel.selectpicker('refresh');
        return { found: true, text: opt.first().text(), val: String(val) };
      }
      return { found: false, text: '', val: '' };
    }, { nombre: clienteNombre, selectorId: this.selectors.clienteDropdown });

    if (!clienteSelected.found) {
      logger.warn(`⚠️ Cliente "${clienteNombre}" not found in dropdown. Available options:`);
      const options = await this.page.evaluate((selectorId) => {
        const $ = (window as any).jQuery;
        return $(selectorId + ' option').map(function (this: any) {
          return $(this).text();
        }).get().filter((t: string) => t.trim());
      }, this.selectors.clienteDropdown);
      logger.warn(`  Options: ${options.slice(0, 10).join(', ')}`);
      throw new Error(`Cliente "${clienteNombre}" not found in contract form dropdown.`);
    }
    logger.info(`✅ Cliente selected: "${clienteSelected.text}" (val: ${clienteSelected.val})`);
    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // BASIC CONTRACT INFO (Phase 1)
  // ---------------------------------------------------------------------------

  async fillBasicContractInfo(
    nroContrato: string,
    entityNombre: string, // transportista for Costo, cliente for Venta
    tipo: 'Costo' | 'Venta' = 'Costo',
    subtipoValue: string = '1'
  ): Promise<string> {
    logger.info(`📝 Filling basic contract information (Phase 1) - Tipo: ${tipo}`);

    try {
      if (!this.page.url().includes('/contrato/crear')) {
        await this.navigateToCreate();
      }

      // 1. Fill Nro Contrato
      logger.info(`Filling Nro Contrato: ${nroContrato}`);
      await this.page.fill(this.selectors.nroContrato, nroContrato);
      await this.page.waitForTimeout(300);

      // 2. Select Tipo Contrato
      await this.selectTipoContrato(tipo);

      // 3. Select Subtipo if Venta
      if (tipo === 'Venta') {
        await this.selectSubtipo(subtipoValue);
      }

      // 4. Select Entity (Transportista or Cliente)
      if (tipo === 'Costo') {
        logger.info(`🔽 Selecting transportista: "${entityNombre}"...`);
        await this.selectTransportista(entityNombre);
      } else {
        logger.info(`🔽 Selecting cliente: "${entityNombre}"...`);
        await this.selectCliente(entityNombre);
      }

      // 5. [DEMO ONLY] Set Fecha vencimiento via daypicker
      if (isDemoMode()) {
        logger.info('📅 [DEMO] Selecting Fecha vencimiento: 31/12/2026');
        await this.selectFechaVencimiento();
      }

      // 6. [DEMO ONLY] Select Unidad de negocio = "Defecto"
      if (isDemoMode()) {
        logger.info('🏢 [DEMO] Selecting Unidad de negocio: Defecto');
        await this.selectUnidadNegocio('Defecto');
      }

      // 6. Force close any phantom modals before saving
      logger.info('🔧 Forcing cleanup of any modal backdrops...');
      await this.forceCloseModal();
      await this.page.waitForTimeout(500);

      // 7. Save the contract header
      logger.info('💾 Saving basic contract header...');
      await this.click(this.selectors.btnGuardar);

      // Wait for navigation to edit/view page - broadened regex and increased timeout
      await this.page.waitForURL(/\/contrato\/(?:editar|update|ver|view)\/\d+/, { timeout: 30000 });

      // Extract contract ID from URL
      const currentUrl = this.page.url();
      const contractIdMatch = currentUrl.match(/\/contrato\/(?:editar|update|ver|view)\/(\d+)/);

      if (!contractIdMatch) {
        throw new Error(`Failed to extract contract ID from URL: ${currentUrl}`);
      }

      const contractId = contractIdMatch[1];
      logger.info(`✅ Contract header created successfully with ID: ${contractId}`);
      logger.info(`📍 Redirected to: ${currentUrl}`);

      return contractId;

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      await this.takeScreenshot('fill-basic-contract-error');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE 3: Route + Cargo (environment-aware)
  // ---------------------------------------------------------------------------

  /**
   * Opens modal, selects the correct Route & Cargo per environment, fills tariffs.
   * QA: Route 715 / Cargo 715_19
   * Demo: Route 47 / Cargo 47_6
   */
  async addSpecificRouteAndCargo(
    tarifaConductor: string,
    tarifaViaje: string,
    tarifaTotal?: string
  ): Promise<void> {
    const rc = this.getRouteConfig();
    logger.info(`🛣️ Adding Route ${rc.routeId} (${isDemoMode() ? 'DEMO' : 'QA'} environment)`);

    try {
      // Step A: Click "Añadir Ruta" button
      logger.info('Clicking "Añadir Ruta" button');
      await this.click(this.selectors.btnAddRuta);
      await this.page.waitForTimeout(1500);

      // Wait for route modal (QA uses #modal_rutas, Demo uses #modalRutas)
      logger.info('Waiting for route modal to appear...');
      await this.page.waitForSelector('#modal_rutas, #modalRutas, .modal.show', {
        state: 'visible',
        timeout: 5000,
      });
      logger.info('✅ Route modal visible');
      await this.page.waitForTimeout(1000);

      // Step B: Select the route
      logger.info(`Selecting Route ${rc.routeId}`);
      const btnRoute = this.page.locator(rc.routeButtonSelector);
      if (await btnRoute.isVisible()) {
        await btnRoute.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
        await btnRoute.click();
      }
      await this.page.waitForTimeout(1000);

      // Step B.5: Close the routes modal via "Cerrar" button
      logger.info('Closing routes modal');
      const btnCerrarRutas = this.page
        .locator('button.btn.btn-secondary.waves-effect.waves-light:visible')
        .first();
      await btnCerrarRutas.click();
      await this.page.waitForTimeout(1000);

      // Step C: Click "Añadir Carga" for the chosen route
      logger.info(`Clicking "Añadir Carga" for Route ${rc.routeId}`);
      const btnAddCarga = this.page.locator(rc.addCargoButtonSelector);
      await btnAddCarga.waitFor({ state: 'visible', timeout: 5000 });
      await btnAddCarga.click();
      await this.page.waitForTimeout(1000);

      // Wait for cargo modal to appear
      await this.page.waitForSelector('#modalCargas, .modal.show', {
        state: 'visible',
        timeout: 5000,
      });
      logger.info('✅ Cargo modal visible');

      // Step C.5: Select the specific cargo
      logger.info(`Selecting Cargo via: ${rc.cargoButtonSelector}`);
      const btnCargo = this.page.locator(rc.cargoButtonSelector);
      await btnCargo.waitFor({ state: 'visible', timeout: 5000 });
      if (await btnCargo.isVisible()) {
        await btnCargo.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
        await btnCargo.click();
      }
      await this.page.waitForTimeout(500);

      // Step C.6: Close the cargo modal via "Cerrar" button
      logger.info('Closing cargo modal');
      const btnCerrarCargas = this.page
        .locator('button.btn.btn-secondary.waves-effect.waves-light:visible')
        .first();
      if (await btnCerrarCargas.isVisible()) {
        await btnCerrarCargas.click();
        await this.page.waitForTimeout(1000);
      }

      // Step D: Fill Tariffs (tariff inputs use InputMask + onkeyup calculation)
      // MUST type slowly — InputMask needs time to process each keystroke
      logger.info(`Filling tariffs: Conductor=${tarifaConductor}, Viaje=${tarifaViaje}`);
      try {
        // Fill the viaje/extra tariff
        await this.fillTariffField(rc.tarifaViajeSelector, tarifaViaje);

        // Fill conductor tariff
        if (rc.tarifaConductorSelector) {
          await this.fillTariffField(rc.tarifaConductorSelector, tarifaConductor);
        }

        // Fill cliente tariff (Total) if available (usually for Venta contracts)
        if (rc.tarifaClienteSelector && tarifaTotal) {
          await this.fillTariffField(rc.tarifaClienteSelector, tarifaTotal);
        }
      } catch (e) {
        logger.warn('⚠️ Some tariff fields may not be available, continuing...');
      }

      await this.page.waitForTimeout(1000);

      // Force close any remaining modals (safety net)
      logger.info('🔧 Forcing cleanup of any remaining modals');
      await this.forceCloseModal();

      logger.info(`✅ Route ${rc.routeId} and cargo added successfully`);
    } catch (error) {
      logger.error('Failed to add route and cargo', error);
      await this.takeScreenshot('add-route-cargo-error');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE 4: Save final contract and extract ID
  // ---------------------------------------------------------------------------

  async saveAndExtractId(): Promise<string> {
    logger.info('💾 Saving contract and extracting ID');

    try {
      const saveBtn = this.page
        .locator(this.selectors.btnGuardarContrato)
        .or(this.page.locator(this.selectors.btnGuardar))
        .first();

      // Wait for navigation after save (Bermann TMS typically reloads the edit/view page)
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {
          logger.warn('⚠️ No navigation detected after save — continuing anyway');
        }),
        this.click(`${this.selectors.btnGuardarContrato}, ${this.selectors.btnGuardar}`)
      ]);

      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
      await this.page.waitForTimeout(2000);

      const url = this.page.url();
      logger.info(`Current URL after save: ${url}`);

      const match = url.match(/\/contrato\/(?:ver|view|editar|update)\/(\d+)/);

      if (match && match[1]) {
        const contractId = match[1];
        logger.info(`✅ Contract ID extracted: ${contractId}`);
        return contractId;
      } else {
        logger.warn(`⚠️ Failed to extract contract ID from URL: ${url}, returning empty string to rely on index search`);
        return '';
      }
    } catch (error) {
      logger.error('Failed to save and extract ID', error);
      await this.takeScreenshot('save-extract-id-error');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Bootstrap Select helper
  // ---------------------------------------------------------------------------

  /**
   * Clicks a Bootstrap Select dropdown button and selects an option by text.
   * Uses the robust Hybrid Pattern to ensure reliability.
   */
  private async selectBootstrapDropdown(
    buttonSelector: string,
    optionText: string
  ): Promise<void> {
    const container = this.page.locator('div.bootstrap-select').filter({
      has: this.page.locator(buttonSelector)
    });

    if (!(await container.isVisible().catch(() => false))) {
      logger.warn(`⚠️ selectBootstrapDropdown: Button container ${buttonSelector} not found`);
      return;
    }

    try {
      // 1. Open dropdown
      await container.locator('button.dropdown-toggle').evaluate(el => (el as HTMLElement).click());
      await this.page.waitForTimeout(500);

      // 2. Select option
      const option = container.locator('.dropdown-menu .dropdown-item').filter({ hasText: optionText }).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();

      // 3. Sync underlying select
      await container.locator('select').evaluate((el, val) => {
        const select = el as HTMLSelectElement;
        const opt = Array.from(select.options).find(o => o.text.trim().includes(val));
        if (opt) {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, optionText);

      await this.page.waitForTimeout(800);
    } catch (error) {
      logger.warn(`⚠️ Error in selectBootstrapDropdown for "${optionText}": ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Tariff field helper (InputMask + onkeyup calculation)
  // ---------------------------------------------------------------------------

  /**
   * Fills a tariff input field by typing slowly character by character.
   * Required because:
   * - jQuery InputMask reformats on each keystroke
   * - onkeyup="calcularTarifaCliente(routeId)" fires calculation per key
   * - Fast fill() breaks the mask and produces NaN/0 in calculations
   */
  private async fillTariffField(selector: string, value: string): Promise<void> {
    const input = this.page.locator(selector);
    await input.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
    await input.click();
    await this.page.waitForTimeout(300);

    // Clear with Ctrl+A + Backspace (more reliable than triple-click for InputMask)
    await this.page.keyboard.press('Control+a');
    await this.page.waitForTimeout(100);
    await this.page.keyboard.press('Backspace');
    await this.page.waitForTimeout(300);

    // Type value slowly so InputMask + onkeyup process each character
    await input.type(value, { delay: 100 });
    await this.page.waitForTimeout(300);

    // Tab out to trigger blur/change events and finalize InputMask formatting
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);

    logger.info(`✅ Tariff field ${selector} set to "${value}"`);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Transportista selection (handles search box difference)
  // ---------------------------------------------------------------------------

  private async selectTransportista(nombre: string): Promise<void> {
    const transBtn = this.page.locator(this.selectors.transportistaButton);
    if (!(await transBtn.isVisible())) {
      logger.warn('⚠️ Transportista button not visible');
      return;
    }

    await transBtn.click();
    await this.page.waitForTimeout(600);

    // Check whether dropdown has a search box (Demo) or not (QA)
    const searchBox = this.page.locator('.bootstrap-select.show .bs-searchbox input');
    if (await searchBox.isVisible()) {
      // Demo path: type into search box
      logger.info('🔍 Transportista dropdown has search box — using search');
      await searchBox.fill(nombre);
      await this.page.waitForTimeout(800);
      const firstItem = this.page
        .locator('.bootstrap-select.show .dropdown-menu .dropdown-item:not(.hidden)')
        .first();
      await firstItem.waitFor({ state: 'visible', timeout: 5000 });
      await firstItem.click();
    } else {
      // QA path: direct option matching
      logger.info('📋 Transportista dropdown without search — clicking matching option');
      const option = this.page.locator(
        `.bootstrap-select.show .dropdown-menu .dropdown-item:has-text("${nombre}")`
      );
      if ((await option.count()) > 0) {
        await option.first().click();
      } else {
        // Fallback: select first non-hidden option
        logger.warn('⚠️ No exact match found, selecting first visible option');
        await this.page
          .locator('.bootstrap-select.show .dropdown-menu .dropdown-item:not(.hidden)')
          .first()
          .click();
      }
    }
    logger.info('✅ Transportista selected');
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Fecha vencimiento — daypicker navigation (Demo only)
  // ---------------------------------------------------------------------------

  /**
   * Navigates the Bootstrap datetimepicker to select 31/12/2026.
   * Demo does NOT allow manual input in the fecha_vencimiento field.
   * Steps: click input → click picker-switch → click "dic." → click "31"
   */
  private async selectFechaVencimiento(): Promise<void> {
    try {
      // Open the daypicker
      await this.page.click(this.selectors.fechaVencimiento);
      await this.page.waitForTimeout(500);

      // Switch to month view by clicking the picker-switch (shows "febrero 2026" etc.)
      const pickerSwitch = this.page.locator('.datepicker-days th.picker-switch');
      await pickerSwitch.waitFor({ state: 'visible', timeout: 3000 });
      await pickerSwitch.click();
      await this.page.waitForTimeout(300);

      // Select December ("dic.")
      const dicMonth = this.page.locator('.datepicker-months span.month:has-text("dic.")');
      await dicMonth.waitFor({ state: 'visible', timeout: 3000 });
      await dicMonth.click();
      await this.page.waitForTimeout(300);

      // Select day 31
      const day31 = this.page.locator('.datepicker-days td.day:not(.old):not(.new):has-text("31")');
      await day31.waitFor({ state: 'visible', timeout: 3000 });
      await day31.click();
      await this.page.waitForTimeout(300);

      logger.info('✅ Fecha vencimiento set to 31/12/2026 via daypicker');
    } catch (error) {
      logger.error('Failed to select fecha vencimiento via daypicker', error);
      await this.takeScreenshot('fecha-vencimiento-daypicker-error');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Unidad de negocio — Bootstrap Select (Demo only)
  // ---------------------------------------------------------------------------

  /**
   * Selects a value in the "Unidad de negocio" Bootstrap Select dropdown.
   * This field only exists in Demo.
   */
  private async selectUnidadNegocio(value: string): Promise<void> {
    try {
      const btn = this.page.locator(this.selectors.unidadNegocioButton);
      if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
        logger.warn('⚠️ Unidad de negocio button not visible — skipping');
        return;
      }
      await btn.click();
      await this.page.waitForTimeout(400);
      await this.page.click(
        `.bootstrap-select.show .dropdown-menu .dropdown-item:has-text("${value}")`
      );
      await this.page.waitForTimeout(300);
      logger.info(`✅ Unidad de negocio set to "${value}"`);
    } catch (error) {
      logger.error('Failed to select Unidad de negocio', error);
      await this.takeScreenshot('unidad-negocio-error');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Environment-aware route/cargo configuration
  // ---------------------------------------------------------------------------

  private getRouteConfig(): RouteConfig {
    if (isDemoMode()) {
      return {
        routeId: '47',
        routeButtonSelector: 'a#btn_plus_47',
        addCargoButtonSelector: '#btn_click_47',
        cargoButtonSelector: "//a[@id='btn_plus_ruta_47_6']//i[@class='fa fa-plus']",
        tarifaViajeSelector: '#txt_tarifa_extra_47',
        tarifaConductorSelector: '#txt_tarifa_conductor_47',
        tarifaClienteSelector: null, // READONLY — auto-calculated by calcularTarifaCliente()
      };
    }
    // QA (default)
    return {
      routeId: '715',
      routeButtonSelector: 'a#btn_plus_715',
      addCargoButtonSelector: '#btn_click_715',
      cargoButtonSelector: 'a#btn_plus_ruta_715_19',
      tarifaViajeSelector: '#txt_tarifa_extra_715',
      tarifaConductorSelector: '#txt_tarifa_conductor_715',
      tarifaClienteSelector: '#txt_tarifa_cliente_715',
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Force-close modal (jQuery injection)
  // ---------------------------------------------------------------------------

  private async forceCloseModal(): Promise<void> {
    await this.page.evaluate(() => {
      // Force hide all modals using jQuery if available
      // @ts-ignore
      if (typeof $ !== 'undefined') {
        // @ts-ignore
        $('.modal').modal('hide');
      }

      // Manual cleanup of modal classes and backdrop
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        const modalElement = modal as HTMLElement;
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
      });

      // Remove all backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());

      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });

    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: Guardar button
  // ---------------------------------------------------------------------------

  private async clickGuardar(): Promise<void> {
    logger.info('💾 Clicking Guardar...');
    await this.click(this.selectors.btnGuardar);
    await this.page.waitForTimeout(5000);
  }
}
