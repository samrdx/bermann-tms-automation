import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nroContrato: '#contrato-nro_contrato',
    tipoContratoDropdown: '.filter-option-inner-inner',
    tipoContratoOption: '.dropdown-item[role="option"]',

    // Cliente (Select2)
    clienteContainer: '#select2-cliente_id-container',
    select2SearchField: '.select2-search__field',
    select2Result: '.select2-results__option',
    select2Highlighted: '.select2-results__option--highlighted',

    // Transportista (Select2)
    transportistaContainer: '#select2-transportista_id-container',
    transportistaButton: 'button[data-id="contrato-transportista_id"]',
    transportistaOptions: '.dropdown-menu.show .dropdown-item',

    // Dates
    fechaInicio: '#fecha_inicio',
    fechaFin: '#fecha_fin',
    fechaVencimiento: '#contrato-fecha_vencimiento',
    valorHora: '#contrato-valor_hora',

    // Route Modal
    btnAddRuta: 'button:has-text("Añadir Ruta")',
    modalRutas: '#modalRutas',
    btnRoute715: 'a#btn_plus_715',
    btnCargo715_19: 'a#btn_plus_ruta_715_19',
    tarifaConductor: '#tarifa_conductor',
    tarifaViaje: '#tarifa_viaje',
    btnGuardarRutaModal: '#btn_guardar_ruta_modal',

    // Specific Route Inputs (for JS injection if needed)
    inputTarifaViaje715: '#txt_tarifa_extra_715',
    inputTarifaConductor715: '#txt_tarifa_conductor_715',

    // Actions
    btnGuardar: '#btn_guardar',
    btnGuardarContrato: '#btn_guardar_contrato',
    btnVolver: 'a.btn.btn-primary[href="/contrato/index"]',

    // Modals
    modal: '.modal',
    modalBackdrop: '.modal-backdrop',
    btnCerrarModal: '.btn.btn-secondary.waves-effect.waves-light',

    // Validations
    invalidField: '[aria-invalid="true"]',
    helpBlock: '.help-block.badge.badge-danger',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/contratos/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Navigate to contract creation page with URL discovery
   * Discovers the correct "Create" URL by inspecting the index page
   */
  async navigateToCreate(): Promise<void> {
    logger.info('🧭 Navigating to contract creation page');

    // Step 1: Navigate to contracts index first
    const indexUrl = `${config.get().baseUrl}/contrato/index`;
    logger.info(`First navigating to index: ${indexUrl}`);
    await this.page.goto(indexUrl);
    await this.page.waitForLoadState('networkidle');

    // Step 2: Find the "Crear" / "Nuevo" / "Añadir" button
    try {
      // Try common button selectors for "Create"
      const createButtonSelectors = [
        'a:has-text("Crear")',
        'a:has-text("Nuevo")',
        'a:has-text("Añadir")',
        'a[href*="/crear"]',
        'button:has-text("Crear")',
        '.btn:has-text("Crear")',
      ];

      let createUrl: string | null = null;

      for (const selector of createButtonSelectors) {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          createUrl = await btn.getAttribute('href');
          if (createUrl) {
            logger.info(`✅ Found create button with URL: ${createUrl}`);
            break;
          }
        }
      }

      // Step 3: Navigate to the discovered URL or fallback
      if (createUrl) {
        // If relative URL, make it absolute
        if (createUrl.startsWith('/')) {
          createUrl = `${config.get().baseUrl}${createUrl}`;
        }
        logger.info(`Navigating to discovered create URL: ${createUrl}`);
        await this.page.goto(createUrl);
      } else {
        // Fallback to known URL pattern (SINGULAR form confirmed from trace)
        const fallbackUrl = 'https://moveontruckqa.bermanntms.cl/contrato/crear';
        logger.warn(`⚠️ Could not discover create URL, using fallback: ${fallbackUrl}`);
        await this.page.goto(fallbackUrl);
      }

      await this.page.waitForLoadState('networkidle');
      logger.info('✅ Navigation to create page complete');

      // Verify page title doesn't contain "Error"
      const pageTitle = await this.page.title();
      if (/error/i.test(pageTitle)) {
        logger.error(`❌ Page title contains 'Error': ${pageTitle}`);
        throw new Error(`Navigation failed: Page title is "${pageTitle}"`);
      }

      // Validate: Check if we landed on an error page
      const currentUrl = this.page.url();
      logger.info(`Current URL: ${currentUrl}`);
      if (currentUrl.includes('error') || currentUrl.includes('404')) {
        logger.error(`❌ Landed on error page: ${currentUrl}`);
        throw new Error('Navigation failed: Page returned an error (404 or error page)');
      }

      // Check for error heading
      const errorHeading = this.page.locator('h1:has-text("Error"), h1:has-text("404"), h1:has-text("no encontrada")');
      if (await errorHeading.isVisible().catch(() => false)) {
        const errorText = await errorHeading.textContent();
        logger.error(`❌ Error page detected: ${errorText}`);
        throw new Error(`Navigation failed: Error page with heading "${errorText}"`);
      }

      logger.info('✅ Page loaded successfully, no errors detected');

      // Wait for the basic form to be ready (check for heading or save button)
      logger.info('Waiting for basic form to initialize...');
      logger.info(`Current URL: ${this.page.url()}`);

      // Check for the "Nro Contrato" field to confirm basic form is loaded
      // This is more reliable than checking headings which may have different cases
      const nroContratoField = this.page.locator('#contrato-nro_contrato');
      const guardarButton = this.page.getByRole('button', { name: 'Guardar' });

      try {
        // Wait for either the Nro Contrato field or Guardar button
        await Promise.race([
          nroContratoField.waitFor({ state: 'visible', timeout: 15000 }),
          guardarButton.waitFor({ state: 'visible', timeout: 15000 })
        ]);
        logger.info('✅ Basic form ready (Nro Contrato field or Guardar button visible)');
      } catch (error) {
        logger.error('❌ Basic form elements not found!');
        logger.error('Selector used: #contrato-nro_contrato or button with name "Guardar"');
        await this.takeScreenshot('basic-form-not-found');
        throw new Error('Basic contract form not found. Check if page loaded correctly.');
      }

    } catch (error) {
      logger.error('Failed to navigate to create page', error);
      await this.takeScreenshot('navigate-to-create-error');
      throw error;
    }
  }

  /**
   * PHASE 1: Fill basic contract information on /contrato/crear
   * This creates the initial contract and redirects to /contrato/editar/{id}
   * 
   * @param nroContrato - Contract number (integers only, e.g., "00101")
   * @param transportistaNombre - Transportista name (e.g., "Camino Transportes SpA")
   */
  async fillBasicContractInfo(
    nroContrato: string,
    transportistaNombre: string
  ): Promise<string> {
    logger.info('📝 Filling basic contract information (Phase 1)');

    try {
      // 1. Fill Nro Contrato (integers only)
      logger.info(`Filling Nro Contrato: ${nroContrato}`);
      await this.page.fill('#contrato-nro_contrato', nroContrato);
      await this.page.waitForTimeout(300);
      logger.info('✅ Nro Contrato filled');

      // 2. Select Tipo Contrato = "Costo" (value="1")
      logger.info('Selecting Tipo Contrato: Costo');
      const tipoContratoSelect = this.page.locator('select#contrato-tipo_tarifa_contrato_id');
      await tipoContratoSelect.selectOption({ value: '1' }); // 1 = Costo
      await this.page.waitForTimeout(1000); // Wait for transportista dropdown to appear
      logger.info('✅ Selected Tipo Contrato: Costo');

      // 3. Wait for Transportista dropdown (#contrato-transportista_id)
      logger.info(`Waiting for Transportista dropdown and searching name: ${transportistaNombre}...`);
      const transportistaSelect = this.page.locator('select#contrato-transportista_id');
      await transportistaSelect.waitFor({ state: 'visible', timeout: 5000 });
      logger.info('✅ Transportista dropdown visible');

      // 4. Find and select transportista by name (direct select, bypass Bootstrap-select UI)
      logger.info(`Selecting transportista with name: ${transportistaNombre}`);

      // DEBUG: Log all available options to see what's actually in the dropdown
      const allOptions = await this.page.locator('select#contrato-transportista_id option').allTextContents();
      logger.info(`Available transportista options (${allOptions.length}): ${allOptions.slice(0, 10).join(', ')}${allOptions.length > 10 ? '...' : ''}`);

      // Find the option containing the transportista name and get its value
      // Note: transportistaNombre may be the base name (without timestamp), so we use partial matching
      const transportistaOptionLocator = this.page.locator(`select#contrato-transportista_id option`).filter({ hasText: transportistaNombre }).first();

      // Check if option exists before waiting
      const optionCount = await transportistaOptionLocator.count();
      if (optionCount === 0) {
        throw new Error(`Transportista "${transportistaNombre}" not found in dropdown. Available options: ${allOptions.slice(0, 5).join(', ')}`);
      }

      await transportistaOptionLocator.waitFor({ state: 'attached', timeout: 5000 });

      const transportistaValue = await transportistaOptionLocator.getAttribute('value');

      if (!transportistaValue) {
        throw new Error(`Transportista with name "${transportistaNombre}" not found in dropdown`);
      }

      // Use Bootstrap-select's native API (proven to work via live debugging)
      // selectOption() + refresh/render does NOT sync properly - form validation rejects it
      await this.page.evaluate((val: string) => {
        const $ = (window as any).$;
        if ($ && $('#contrato-transportista_id').selectpicker) {
          $('#contrato-transportista_id').selectpicker('val', val);
        }
      }, transportistaValue);
      await this.page.waitForTimeout(1000);

      // Verify the selection was applied
      const buttonText = await this.page.locator('button[data-id="contrato-transportista_id"] .filter-option-inner-inner').textContent().catch(() => '');
      if (buttonText && buttonText !== 'Transportista' && buttonText.trim().length > 0) {
        logger.info(`✅ Transportista selected via selectpicker API: ${buttonText}`);
      } else {
        logger.warn(`⚠️ Transportista selection may not have applied. Button text: ${buttonText}`);
      }

      logger.info('✅ Transportista selection process complete');

      // 5. Skip optional fields (Fecha vencimiento, Valor Hora, Modalidad=Por Ruta)
      logger.info('⏭️ Skipping optional fields (using defaults: Modalidad = Por Ruta)');

      // 5.5. Force close any phantom modals before saving
      logger.info('🔧 Forcing cleanup of any modal backdrops...');
      await this.forceCloseModal();
      await this.page.waitForTimeout(500);

      // 6. Save the contract (may redirect to /contrato/editar/{id} OR /contrato/index)
      logger.info('💾 Saving basic contract...');
      await this.page.click('button.btn-success:has-text("Guardar"), #btn_guardar');

      // Wait for navigation (give time for save to process)
      await this.page.waitForTimeout(3000);

      const currentUrl = this.page.url();
      logger.info(`Post-save URL: ${currentUrl}`);

      let contractId: string;

      // Try to extract from /contrato/editar/{id} URL
      const editMatch = currentUrl.match(/\/contrato\/editar\/(\d+)/);
      if (editMatch) {
        contractId = editMatch[1];
        logger.info(`✅ Contract created! ID: ${contractId} (redirected to edit page)`);
      } else if (currentUrl.includes('/contrato/index')) {
        // Redirected to index - need to search for the contract
        logger.info('⚠️ Redirected to index page - searching for created contract...');

        // Get nroContrato from the previously filled field
        const nroContrato = await this.page.locator('#contrato-nro_contrato').inputValue();

        // Search by contract number in the grid
        const searchBox = this.page.locator('input[type="search"]');
        await searchBox.fill(nroContrato);
        await this.page.waitForTimeout(1500);

        // Find the contract row and extract ID from view/edit link
        const contractRow = this.page.locator('table tbody tr').filter({ hasText: nroContrato }).first();
        await contractRow.waitFor({ state: 'visible', timeout: 5000 });

        const viewLink = contractRow.locator('a[href*="/contrato/view/"]').first();
        const viewHref = await viewLink.getAttribute('href');

        const viewMatch = viewHref?.match(/\/contrato\/view\/(\d+)/);
        if (viewMatch) {
          contractId = viewMatch[1];
          logger.info(`✅ Contract created! ID: ${contractId} (found in grid)`);

          // Navigate to edit page
          logger.info(`Navigating to edit page for contract ${contractId}...`);
          await this.page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
          await this.page.waitForTimeout(1500);
        } else {
          throw new Error(`Could not extract contract ID from grid. ViewHref: ${viewHref}`);
        }
      } else {
        throw new Error(`Unexpected URL after save: ${currentUrl}`);
      }

      logger.info(`📍 Now on edit page for contract ID: ${contractId}`);

      return contractId;

    } catch (error) {
      logger.error('Failed to fill basic contract info', error);
      await this.takeScreenshot('fill-basic-contract-error');
      throw error;
    }
  }

  /**
   * Fills the main contract form using RUT-based search for Transportista
   * @param clienteName - Name of the client to search
   * @param transportistaRut - RUT of transportista (e.g., "24618893-9")
   * @param fechaInicio - Start date (YYYY-MM-DD)
   * @param fechaFin - End date (YYYY-MM-DD)
   */
  async fillMainForm(
    clienteName: string,
    transportistaRut: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<void> {
    logger.info('📝 Filling main contract form');

    try {
      // 1. Select Client using SURGICAL Select2 strategy (Click → Wait → Type → Enter)
      logger.info(`Selecting client: ${clienteName}`);

      // Step 1: Wait for Select2 to initialize, then click the container to open dropdown
      const clientContainer = this.page.locator(this.selectors.clienteContainer);
      await clientContainer.waitFor({ state: 'visible', timeout: 10000 });
      logger.info('✅ Cliente Select2 container visible');

      await clientContainer.click();
      logger.info('✅ Clicked cliente container');

      // Step 2: Wait for search field to be visible
      const searchField = this.page.locator(this.selectors.select2SearchField);
      await searchField.waitFor({ state: 'visible', timeout: 5000 });
      logger.info('✅ Search field visible');

      // Step 3: Type client name with delay
      await this.page.keyboard.type(clienteName, { delay: 100 });
      await this.page.waitForTimeout(500);
      logger.info(`✅ Typed client name: ${clienteName}`);

      // Step 4: Press Enter to select
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);
      logger.info('✅ Client selected via Enter key');

      // 2. Select Transportista using RUT (Select2 with search)
      logger.info(`Searching transportista by RUT: ${transportistaRut}`);
      await this.page.click(this.selectors.transportistaContainer);
      await this.page.waitForTimeout(300);

      const transportistaSearchField = this.page.locator(this.selectors.select2SearchField);
      await transportistaSearchField.fill(transportistaRut);

      // Wait for the specific result to appear (highlighted)
      await this.page.waitForSelector(this.selectors.select2Highlighted, {
        state: 'visible',
        timeout: 10000
      });
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);

      logger.info('✅ Transportista selected via RUT');

      // 3. Fill Dates using JavaScript (to bypass datepicker)
      logger.info(`Setting dates: ${fechaInicio} to ${fechaFin}`);
      await this.setDateViaJS(this.selectors.fechaInicio, fechaInicio);
      await this.setDateViaJS(this.selectors.fechaFin, fechaFin);

      logger.info('✅ Main form filled successfully');
    } catch (error) {
      logger.error('Failed to fill main form', error);
      await this.takeScreenshot('fill-main-form-error');
      throw error;
    }
  }

  /**
   * Sets a date field value using JavaScript to bypass datepicker restrictions
   */
  private async setDateViaJS(selector: string, dateValue: string): Promise<void> {
    await this.page.evaluate(
      ({ sel, val }) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        if (element) {
          element.value = val;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      { sel: selector, val: dateValue }
    );
    await this.page.waitForTimeout(300);
  }
  /**
   * Opens modal, selects Route 715 & Cargo 715_19, fills tariffs, and force-closes modal
   * CORRECT ORDER: Add cargo -> Close modal -> Fill tariffs in GRID
   * @param tarifaConductor - Driver tariff (e.g., "20000")
   * @param tarifaViaje - Trip tariff (e.g., "50000")
   */
  async addSpecificRouteAndCargo(
    tarifaConductor: string,
    tarifaViaje: string
  ): Promise<void> {
    logger.info('🛣️ Adding specific Route 715 and Cargo 715_19');

    try {
      // Step A: Click "Añadir Ruta" button
      logger.info('Clicking "Añadir Ruta" button');
      await this.page.click(this.selectors.btnAddRuta);

      // Wait for JavaScript execution and modal to appear
      await this.page.waitForTimeout(1500);

      // Try to detect modal with multiple selectors
      logger.info('Waiting for route modal to appear...');
      try {
        await this.page.waitForSelector(this.selectors.modalRutas, {
          state: 'visible',
          timeout: 3000
        });
        logger.info('✅ Modal found with #modalRutas');
      } catch (e) {
        // Fallback: try generic modal selector
        logger.info('⚠️ #modalRutas not found, trying generic .modal');
        await this.page.waitForSelector('.modal.show, .modal.fade.show', {
          state: 'visible',
          timeout: 5000
        });
        logger.info('✅ Modal found with generic selector');
      }

      await this.page.waitForTimeout(1000); // Wait for modal animation

      // Step B: Click the green plus button for Route 715
      logger.info('Selecting Route 715 (05082025-1)');
      const btnRoute = this.page.locator(this.selectors.btnRoute715);
      await btnRoute.scrollIntoViewIfNeeded();
      await btnRoute.click();
      await this.page.waitForTimeout(1000);

      // Step B.5: Close the routes modal
      logger.info('Closing routes modal');
      const btnCerrarModal = this.page.locator('button.btn.btn-secondary.waves-effect.waves-light:visible').first();
      await btnCerrarModal.click();
      await this.page.waitForTimeout(1000); // Wait for modal to close

      // Step C: Click "Añadir Carga" button (opens sub-modal)
      logger.info('Clicking "Añadir Carga" for Route 715');
      const btnAddCarga = this.page.locator('#btn_click_715');
      await btnAddCarga.waitFor({ state: 'visible', timeout: 5000 });
      await btnAddCarga.click();
      await this.page.waitForTimeout(1000);

      // Step D: Select Specific Cargo: Cargo ID 19 (715_19)
      logger.info('Selecting Cargo 715_19');
      const btnCargo = this.page.locator(this.selectors.btnCargo715_19);
      await btnCargo.waitFor({ state: 'visible', timeout: 5000 });
      await btnCargo.scrollIntoViewIfNeeded();
      await btnCargo.click();
      await this.page.waitForTimeout(1000);

      // Step E: CLOSE MODAL BEFORE FILLING TARIFFS (CRITICAL!)
      logger.info('🔧 Closing cargo modal via JS injection');
      await this.forceCloseModal();
      await this.page.waitForTimeout(1500); // Wait for modal to fully close and grid to update

      // Step F: Fill Tariffs in the GRID (after modal is closed)
      logger.info(`Filling tariffs in grid: Conductor=${tarifaConductor}, Viaje=${tarifaViaje}`);

      // Fill Conductor Tariff SLOWLY (trigger JS listeners)
      logger.info('Filling Tarifa Conductor with slow typing...');
      const conductorInput = this.page.locator(this.selectors.inputTarifaConductor715);
      await conductorInput.click();
      await conductorInput.clear();
      await this.page.keyboard.type(tarifaConductor, { delay: 200 });
      await this.page.keyboard.press('Tab'); // Trigger blur
      logger.info(`✅ Tarifa Conductor filled: ${tarifaConductor}`);
      await this.page.waitForTimeout(500);

      // Fill Viaje Tariff SLOWLY (trigger JS listeners)
      logger.info('Filling Tarifa Viaje with slow typing...');
      const viajeInput = this.page.locator(this.selectors.inputTarifaViaje715);
      await viajeInput.click();
      await viajeInput.clear();
      await this.page.keyboard.type(tarifaViaje, { delay: 200 });
      await this.page.keyboard.press('Tab'); // Trigger blur
      logger.info(`✅ Tarifa Viaje filled: ${tarifaViaje}`);
      await this.page.waitForTimeout(500);

      // Manually trigger change/blur events to ensure calculations run
      logger.info('Triggering manual change events for tariff calculation...');
      await this.page.evaluate(() => {
        document.querySelectorAll('input[id^="txt_tarifa_"]').forEach(el => {
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await this.page.waitForTimeout(1000); // Wait for calculation

      // Verify total was calculated (should not be 0)
      const totalTarifa = (parseInt(tarifaConductor) + parseInt(tarifaViaje)).toString();
      logger.info(`Expected total tariff: ${totalTarifa}`);

      try {
        const totalInput = this.page.locator(`//tr[td[3][contains(., '05082025-1')]]//td[10]//input[@type='text']`);
        await totalInput.waitFor({ state: 'visible', timeout: 3000 });
        const actualTotal = await totalInput.inputValue();
        logger.info(`Actual total tariff from grid: ${actualTotal}`);

        if (actualTotal === '0' || actualTotal === '') {
          logger.warn(`⚠️ Total not calculated automatically, filling manually: ${totalTarifa}`);
          await totalInput.click();
          await totalInput.clear();
          await this.page.keyboard.type(totalTarifa, { delay: 200 });
          await this.page.keyboard.press('Tab');
        } else {
          logger.info(`✅ Total tariff automatically calculated: ${actualTotal}`);
        }
      } catch (e) {
        logger.warn('⚠️ Could not verify total tariff field');
      }

      await this.page.waitForTimeout(1000);

      logger.info('✅ Route 715 and Cargo 715_19 added successfully with tariffs');
    } catch (error) {
      logger.error('Failed to add route and cargo', error);
      await this.takeScreenshot('add-route-cargo-error');
      throw error;
    }
  }

  /**
   * JS Injection Master Key: Forces Bootstrap modal to close and cleanup
   */
  public async forceCloseModal(): Promise<void> {
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

    await this.page.waitForTimeout(500); // Allow UI to settle
  }

  /**
   * Saves the contract and extracts the ID from the redirect URL
   * @returns Contract ID
   */
  async saveAndExtractId(): Promise<string> {
    logger.info('💾 Saving contract and extracting ID');

    try {
      // Try both possible save button selectors
      const saveBtn = this.page.locator(this.selectors.btnGuardarContrato)
        .or(this.page.locator(this.selectors.btnGuardar))
        .first();

      await saveBtn.click();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      await this.page.waitForTimeout(2000);

      const url = this.page.url();
      logger.info(`Current URL after save: ${url}`);

      // Extract ID from URL patterns: /contrato/ver/123 or /contrato/editar/123
      const match = url.match(/\/contrato\/(?:ver|editar)\/(\d+)/);

      if (match && match[1]) {
        const contractId = match[1];
        logger.info(`✅ Contract ID extracted: ${contractId}`);
        return contractId;
      } else {
        logger.error(`Failed to extract contract ID from URL: ${url}`);
        throw new Error('Could not extract contract ID from URL');
      }
    } catch (error) {
      logger.error('Failed to save and extract ID', error);
      await this.takeScreenshot('save-extract-id-error');
      throw error;
    }
  }

  // Additional utility methods from original ContratosFormPage

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
      await this.page.click('.filter-option-inner-inner');
      await this.page.waitForTimeout(500);

      await this.page.waitForSelector('.dropdown-item[role="option"]', {
        state: 'visible',
        timeout: 5000
      });

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

  async hasValidationErrors(): Promise<boolean> {
    try {
      const invalidFields = await this.page.$$(this.selectors.invalidField);
      return invalidFields.length > 0;
    } catch (error) {
      logger.error('Failed to check validation errors', error);
      return false;
    }
  }
}