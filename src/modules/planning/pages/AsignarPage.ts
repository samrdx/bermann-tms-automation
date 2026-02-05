import { BasePage } from '../../../core/BasePage.js';
import type { Page, Locator } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('AsignarViajesPage');

export interface AsignacionData {
  nroViaje?: string;
  transportista: string;
  vehiculoPrincipal: string;
  vehiculoSecundario?: string;
  conductor: string;
  perfilTemperatura?: string;
}

export class AsignarPage extends BasePage {
  private readonly selectors = {
    // ASSIGNMENT PANEL (left side - not a modal)
    assignment: {
      perfilTemperatura: '#perfil_temperatura',
      perfilTemperaturaBtn: 'button[data-id="perfil_temperatura"]',
      transportista: '#transportista',
      transportistaBtn: 'button[data-id="transportista"]',
      patentePrincipal: '#patente_principal',
      patentePrincipalBtn: 'button[data-id="patente_principal"]',
      patenteSecundaria: '#patente_secundaria',
      patenteSecundariaBtn: 'button[data-id="patente_secundaria"]',
      conductores: '#conductores',
      conductoresBtn: 'button[data-id="conductores"]',
      recalcular: '#recalcular',
      btnGuardar: '#guardar',
      btnCerrar: 'a.btn.btn-secondary',
    },

    // TABLE
    table: {
      container: '#tabla_asignar',
      tbody: '#tabla_asignar tbody',
      rows: '#tabla_asignar tbody tr',
      // Column indexes (0-based)
      checkboxColumn: 0,
      idColumn: 1,
      nroViajeColumn: 2,
      vehiculoUnoColumn: 3,
      fechaPresentacionColumn: 4,
      fechaColumn: 5,
      vehiculoDosColumn: 6,
      fechaSalidaColumn: 7,
      clienteColumn: 8,
      origenColumn: 9,
      destinoColumn: 10,
      transportistaColumn: 11,
      conductorColumn: 12,
      estadoViajeColumn: 13,
      guiaDespachoColumn: 14,
      nroContenedorColumn: 15,
    },

    // PAGINATION
    pagination: {
      previous: '.page-link.previous',
      next: '.page-link.next',
      pageLinks: '.page-link',
    },

    // DROPDOWN MENU (Bootstrap Select)
    dropdownMenu: '.dropdown-menu.show',
    dropdownSearch: '.bs-searchbox input',
    dropdownItem: '.dropdown-item',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navigating to Asignar Viajes page');
    await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/asignar');
    await this.page.waitForLoadState('networkidle');
  }

  // ========== TABLE METHODS ==========

  async waitForTableLoad(): Promise<void> {
    logger.info('Waiting for table to load');
    try {
      await this.page.waitForSelector(this.selectors.table.container, {
        state: 'visible',
        timeout: 10000,
      });
      await this.page.waitForTimeout(1000); // Wait for data to populate
      logger.info('Table loaded');
    } catch (error) {
      logger.error('Failed to wait for table load', error);
      throw error;
    }
  }

  async getTableRowCount(): Promise<number> {
    const rows = this.page.locator(this.selectors.table.rows);
    return await rows.count();
  }

  async findViajeRow(nroViaje: string): Promise<Locator | null> {
    logger.info(`Searching for viaje: ${nroViaje}`);

    const rows = this.page.locator(this.selectors.table.rows);
    const rowCount = await rows.count();

    logger.info(`Checking ${rowCount} rows...`);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const cells = await row.locator('td').allTextContents();

      // Column 2 is Nro de Viaje (0-indexed)
      const nroViajeCell = cells[this.selectors.table.nroViajeColumn]?.trim();

      if (nroViajeCell === nroViaje) {
        logger.info(`Found viaje ${nroViaje} in row ${i}`);
        return row;
      }
    }

    logger.warn(`Viaje ${nroViaje} not found in table`);
    return null;
  }

  async selectViajeRow(nroViaje: string): Promise<boolean> {
    logger.info(`Selecting viaje row: ${nroViaje}`);

    try {
      const row = await this.findViajeRow(nroViaje);

      if (!row) {
        // Try pagination if not on first page
        const found = await this.searchWithPagination(nroViaje);
        if (!found) {
          throw new Error(`Viaje ${nroViaje} not found in any page`);
        }
        return true;
      }

      // 1. Scroll row into view
      await row.scrollIntoViewIfNeeded();

      // 2. Click "Editar" icon (User Instruction: "Click the Action/Edit button")
      // We prioritize the pencil icon as that is the standard "Edit" action in this system.
      const editIcon = row.locator('i.fa-pencil, i.fa-edit, i.mdi-pencil, [class*="pencil"], [class*="edit"]').first();
      
      if (await editIcon.count() > 0 && await editIcon.isVisible()) {
          logger.info('Clicking "Editar" icon to open assignment form');
          await editIcon.locator('..').click();
      } else {
          // Fallback only if icon is missing (unlikely based on logs)
          logger.warn('Edit icon not found, clicking row as fallback');
          await row.click();
      }

      // 3. Wait for the Assignment Form
      // User emphasized focusing on Transportista dropdown as the key signal
      logger.info('Waiting for Transportista dropdown...');
      try {
        await this.page.waitForSelector("button[title='Transportista'], button[data-id='transportista']", { state: 'visible', timeout: 15000 });
        logger.info('Assignment Form is ready');
      } catch (e) {
          // Sometimes it takes a moment if navigation occurs
          logger.error('Transportista dropdown did not appear. Check if "Editar" triggered navigation or modal.');
          throw e;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to select viaje row: ${nroViaje}`, error);
      await this.takeScreenshot('select-viaje-row-error');
      throw error;
    }
  }

  async searchWithPagination(nroViaje: string): Promise<boolean> {
    logger.info(`Searching with pagination for: ${nroViaje}`);

    let pageNum = 1;
    const maxPages = 10;

    while (pageNum <= maxPages) {
      const row = await this.findViajeRow(nroViaje);
      if (row) {
        await row.click();
        await this.page.waitForTimeout(500);
        logger.info(`Found and selected viaje ${nroViaje} on page ${pageNum}`);
        return true;
      }

      // Try next page
      const nextBtn = this.page.locator(this.selectors.pagination.next);
      const isDisabled = await nextBtn.evaluate(
        (el) => el.closest('li')?.classList.contains('disabled') || false
      );

      if (isDisabled) {
        logger.info('Reached last page');
        break;
      }

      await nextBtn.click();
      await this.page.waitForTimeout(1000);
      pageNum++;
    }

    return false;
  }

  async getViajeStatus(nroViaje: string): Promise<string> {
    logger.info(`Getting status for viaje: ${nroViaje}`);

    const row = await this.findViajeRow(nroViaje);
    if (!row) {
      throw new Error(`Viaje ${nroViaje} not found`);
    }

    const cells = await row.locator('td').allTextContents();
    const status = cells[this.selectors.table.estadoViajeColumn]?.trim() || '';

    logger.info(`Viaje ${nroViaje} status: ${status}`);
    return status;
  }

  async verifyViajeAsignado(nroViaje: string): Promise<boolean> {
    logger.info(`Verifying viaje ${nroViaje} is assigned`);

    try {
      const row = await this.findViajeRow(nroViaje);
      if (!row) {
        // Try pagination
        await this.searchWithPagination(nroViaje);
        return false;
      }

      const cells = await row.locator('td').allTextContents();

      // Check if transportista and conductor are filled
      const transportista = cells[this.selectors.table.transportistaColumn]?.trim();
      const conductor = cells[this.selectors.table.conductorColumn]?.trim();
      const vehiculo = cells[this.selectors.table.vehiculoUnoColumn]?.trim();

      const isAssigned = !!(transportista && conductor && vehiculo);

      logger.info(`Viaje ${nroViaje} assigned: ${isAssigned}`);
      logger.info(`  Transportista: ${transportista || 'N/A'}`);
      logger.info(`  Conductor: ${conductor || 'N/A'}`);
      logger.info(`  Vehículo: ${vehiculo || 'N/A'}`);

      return isAssigned;
    } catch (error) {
      logger.error('Failed to verify assignment', error);
      return false;
    }
  }

  // ========== ASSIGNMENT PANEL METHODS ==========

  /**
   * Selects an option from a Bootstrap Select dropdown
   * Handles search box if present for long lists
   */
  private async selectBSDropdown(
    buttonSelector: string,
    optionText: string,
    useSearch: boolean = true
  ): Promise<void> {
    try {
      // Find the dropdown container
      const dropdownContainer = this.page
        .locator('div.dropdown, div.bootstrap-select')
        .filter({ has: this.page.locator(buttonSelector) });

      // Click button to open dropdown with retry
      const btn = this.page.locator(buttonSelector);
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      
      const dropdownMenu = dropdownContainer
        .locator('.dropdown-menu.show, .dropdown-menu.inner.show') // Look for the visible menu container
        .first();

      let menuVisible = false;
      for (let attempt = 0; attempt < 3; attempt++) {
          logger.info(`Opening dropdown attempt ${attempt + 1}`);
          
          // Only click if not already open
          if (!await dropdownMenu.isVisible()) {
             await btn.click({ force: true });
             await this.page.waitForTimeout(500);
          }

          try {
              await dropdownMenu.waitFor({ state: 'visible', timeout: 2000 });
              menuVisible = true;
              break;
          } catch (e) {
              logger.warn('Dropdown menu did not open, retrying click...');
              await this.page.waitForTimeout(500);
          }
      }

      if (!menuVisible) {
          throw new Error(`Dropdown menu for ${buttonSelector} failed to open after 3 attempts`);
      }

      // Try using search box if available
      if (useSearch) {
        const searchInput = dropdownMenu.locator('.bs-searchbox input');
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
          logger.info(`Using search box for: ${optionText}`);
          await searchInput.fill(optionText);
          await this.page.waitForTimeout(500);
          
          // Click the specific result after search
          const option = dropdownMenu.locator('a, span.text').filter({ hasText: optionText }).first();
          await option.scrollIntoViewIfNeeded();
          await option.click();
          await dropdownMenu.waitFor({ state: 'hidden', timeout: 3000 });
          return;
        }
      }

      // Find and click the option - try multiple selectors
      // Pattern 1: Standard Bootstrap dropdown-item
      let option = dropdownMenu
        .locator('.dropdown-item')
        .filter({ hasText: optionText })
        .first();

      // Pattern 2: Bootstrap Select with a[role='option'] (used after cascade)
      if ((await option.count()) === 0) {
        logger.info('Trying a[role="option"] selector (cascaded dropdown pattern)');
        option = this.page
          .locator("div[aria-expanded='true'] a[role='option']")
          .filter({ hasText: optionText })
          .first();
      }

      if ((await option.count()) === 0) {
        throw new Error(`Option "${optionText}" not found in dropdown`);
      }

      await option.scrollIntoViewIfNeeded();
      await option.click();
      await this.page.waitForTimeout(300);

      // Wait for dropdown to close (try both patterns)
      try {
        await dropdownMenu.waitFor({ state: 'hidden', timeout: 3000 });
      } catch {
        // Dropdown might already be hidden or using different structure
        logger.debug('Dropdown close wait skipped');
      }
      
    } catch (error) {
      logger.error(`Failed to select "${optionText}" from dropdown`, error);
      throw error;
    }
  }

  /**
   * Selects an option from a Bootstrap Select dropdown using a container locator
   * This is useful when the button doesn't have a stable data-id but the container has identifiable text
   */
  private async selectBSDropdownByContainer(
    containerLocator: Locator,
    optionText: string,
    useSearch: boolean = true
  ): Promise<void> {
    try {
      // Find the button within the container
      const btn = containerLocator.locator('button').first();
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      
      const dropdownMenu = containerLocator
        .locator('.dropdown-menu.show, .dropdown-menu.inner.show')
        .first();

      let menuVisible = false;
      for (let attempt = 0; attempt < 3; attempt++) {
          logger.info(`Opening dropdown attempt ${attempt + 1}`);
          
          if (!await dropdownMenu.isVisible()) {
             await btn.click({ force: true });
             await this.page.waitForTimeout(500);
          }

          try {
              await dropdownMenu.waitFor({ state: 'visible', timeout: 2000 });
              menuVisible = true;
              break;
          } catch (e) {
              logger.warn('Dropdown menu did not open, retrying click...');
              await this.page.waitForTimeout(500);
          }
      }

      if (!menuVisible) {
          throw new Error(`Dropdown menu failed to open after 3 attempts`);
      }

      // Try using search box if available
      if (useSearch) {
        const searchInput = dropdownMenu.locator('.bs-searchbox input');
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
          logger.info(`Using search box for: ${optionText}`);
          await searchInput.fill(optionText);
          await this.page.waitForTimeout(500);
          
          const option = dropdownMenu.locator('a, span.text').filter({ hasText: optionText }).first();
          await option.scrollIntoViewIfNeeded();
          await option.click();
          await dropdownMenu.waitFor({ state: 'hidden', timeout: 3000 });
          return;
        }
      }

      // Find and click the option - try multiple selectors
      // Pattern 1: Standard Bootstrap dropdown-item
      let option = dropdownMenu
        .locator('.dropdown-item')
        .filter({ hasText: optionText })
        .first();

      // Pattern 2: Bootstrap Select with a[role='option'] (used after cascade)
      if ((await option.count()) === 0) {
        logger.info('Trying a[role="option"] selector (cascaded dropdown pattern)');
        option = this.page
          .locator("div[aria-expanded='true'] a[role='option']")
          .filter({ hasText: optionText })
          .first();
      }

      if ((await option.count()) === 0) {
        throw new Error(`Option "${optionText}" not found in dropdown`);
      }

      await option.scrollIntoViewIfNeeded();
      await option.click();
      await this.page.waitForTimeout(300);

      // Wait for dropdown to close (try both patterns)
      try {
        await dropdownMenu.waitFor({ state: 'hidden', timeout: 3000 });
      } catch {
        // Dropdown might already be hidden or using different structure
        logger.debug('Dropdown close wait skipped');
      }
      
    } catch (error) {
      logger.error(`Failed to select "${optionText}" from dropdown`, error);
      throw error;
    }
  }

  // Wrappers to maintain interface but use new logic if needed
  async selectTransportista(nombre: string): Promise<void> {
      // Replaced by direct call in assignViaje but kept for compatibility
      logger.info(`Selecting Transportista (Legacy Wrapper): ${nombre}`);
      await this.selectBSDropdown("button[title='Transportista'], button[data-id='transportista']", nombre);
  }
  async selectVehiculoPrincipal(patente: string): Promise<void> { 
      await this.selectBSDropdown("button[title='Vehículo'], button[data-id='viajes-patente_principal_id']", patente);
  }
  async selectConductor(nombre: string): Promise<void> {
      await this.selectBSDropdown("button[data-id='viajes-conductor_id']", nombre);
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar button');

    try {
      const btnGuardar = this.page.locator('#btn_guardar_form, #guardar');

      // Wait for button to be visible
      await btnGuardar.waitFor({ state: 'visible', timeout: 5000 });

      // Click with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await btnGuardar.click({ timeout: 5000 });
          logger.info('Guardar button clicked');
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await this.page.waitForTimeout(500);
        }
      }

      // Wait for response
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
    } catch (error) {
      logger.error('Failed to click Guardar', error);
      await this.takeScreenshot('click-guardar-error');
      throw error;
    }
  }
  
  async clickCerrar(): Promise<void> {
    await this.page.locator(this.selectors.assignment.btnCerrar).click();
  }

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting assignment for viaje ${nroViaje} ===`);

    try {
      // Step 1: Find and Enter Assignment Form
      logger.info('STEP 1: Find and Enter Assignment Form');
      await this.selectViajeRow(nroViaje);
      
      // Step 2: Transportista Selection (THE TRIGGER)
      logger.info(`STEP 2: Select Transportista (${data.transportista})`);
      // Using robust selector for the button
      const transportistaSelector = "button[title='Transportista'], button[data-id='transportista']"; 
      
      // Select using the helper
      await this.selectBSDropdown(transportistaSelector, data.transportista);
      logger.info('Transportista selected. Triggering cascade...');

      // Step 3: WAIT FOR CASCADE (MANDATORY)
      logger.info('STEP 3: Waiting for resource cascade to populate Vehicle dropdown...');
      await this.page.waitForTimeout(2000); // Initial wait for cascade

      // Wait for Vehicle button to become enabled
      const vehiculoSelector = ".bootstrap-select:has(button[title*='Vehículo']) button, button[data-id='patente_principal']";

      logger.info('Waiting for Vehicle dropdown to become ready...');
      await this.page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const vehButton = buttons.find(b =>
            b.getAttribute('title')?.includes('Vehículo') ||
            b.getAttribute('data-id') === 'patente_principal'
          );

          if (!vehButton) return false;

          const isDisabled = vehButton.hasAttribute('disabled') ||
                            vehButton.classList.contains('disabled');
          return !isDisabled;
        },
        { timeout: 15000 }
      );
      logger.info('Vehicle dropdown is ready');

      // Step 4: Click Vehicle dropdown and select option
      logger.info(`STEP 4: Select Vehículo (${data.vehiculoPrincipal})`);

      // Click the Vehicle button to open dropdown
      const vehButton = this.page.locator('button').filter({ hasText: /vehículo/i }).or(
        this.page.locator("button[data-id='patente_principal']")
      ).first();

      await vehButton.click();
      await this.page.waitForTimeout(500);

      // Now select the option using the expanded dropdown selector
      logger.info(`Looking for vehicle option: ${data.vehiculoPrincipal}`);
      const vehOption = this.page.locator("div[aria-expanded='true'] a[role='option']")
        .filter({ hasText: data.vehiculoPrincipal })
        .first();

      await vehOption.waitFor({ state: 'visible', timeout: 5000 });
      await vehOption.click();
      logger.info('Vehículo selected');

      // Step 5: Select Conductor (also populated by cascade)
      logger.info(`STEP 5: Select Conductor (${data.conductor})`);

      // Click the Conductor button to open dropdown
      const condButton = this.page.locator('button').filter({ hasText: /conductor/i }).or(
        this.page.locator("button[data-id='conductores']")
      ).first();

      await condButton.waitFor({ state: 'visible', timeout: 5000 });
      await condButton.click();
      await this.page.waitForTimeout(500);

      // Select the option using the expanded dropdown selector
      logger.info(`Looking for conductor option: ${data.conductor}`);
      const condOption = this.page.locator("div[aria-expanded='true'] a[role='option']")
        .filter({ hasText: data.conductor })
        .first();

      await condOption.waitFor({ state: 'visible', timeout: 5000 });
      await condOption.click();
      logger.info('Conductor selected');

      // Step 6: Guardar
      logger.info('STEP 6: Clicking Guardar');
      await this.clickGuardar();
      
      // Post-save wait
      await this.page.waitForLoadState('networkidle');
      
      logger.info(`=== Assignment flow complete for viaje ${nroViaje} ===`);
      return true;
    } catch (error) {
      logger.error(`Failed to assign viaje ${nroViaje}`, error);
      await this.takeScreenshot(`assign-viaje-${nroViaje}-error`);
      throw error;
    }
  }
}
