import { BasePage } from '../core/BasePage.js';
import type { Page, Locator } from 'playwright';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AsignarViajesPage');

export interface AsignacionData {
  nroViaje?: string;
  transportista: string;
  vehiculoPrincipal: string;
  vehiculoSecundario?: string;
  conductor: string;
  perfilTemperatura?: string;
}

export class AsignarViajesPage extends BasePage {
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
        // Try pagination
        const found = await this.searchWithPagination(nroViaje);
        if (!found) {
          throw new Error(`Viaje ${nroViaje} not found in any page`);
        }
        return true;
      }

      // Click on the row to select it
      await row.click();
      await this.page.waitForTimeout(500);

      logger.info(`Selected viaje ${nroViaje}`);
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
  private async selectBootstrapDropdown(
    buttonSelector: string,
    optionText: string,
    useSearch: boolean = true
  ): Promise<void> {
    try {
      // Find the dropdown container
      const dropdownContainer = this.page
        .locator('div.dropdown, div.bootstrap-select')
        .filter({ has: this.page.locator(buttonSelector) });

      // Click button to open dropdown
      await this.page.click(buttonSelector);
      await this.page.waitForTimeout(500);

      // Wait for dropdown menu to open
      const dropdownMenu = dropdownContainer
        .locator('.dropdown-menu.show, .dropdown-menu.inner.show')
        .first();
      await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

      // Try using search box if available
      if (useSearch) {
        const searchInput = dropdownMenu.locator('.bs-searchbox input');
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
          logger.info(`Using search box for: ${optionText}`);
          await searchInput.fill(optionText);
          await this.page.waitForTimeout(500);
        }
      }

      // Find and click the option
      const option = dropdownMenu
        .locator('.dropdown-item')
        .filter({ hasText: optionText })
        .first();

      if ((await option.count()) === 0) {
        throw new Error(`Option "${optionText}" not found in dropdown`);
      }

      await option.scrollIntoViewIfNeeded();
      await option.click();
      await this.page.waitForTimeout(300);
    } catch (error) {
      logger.error(`Failed to select "${optionText}" from dropdown`, error);
      throw error;
    }
  }

  async selectTransportista(nombre: string): Promise<void> {
    logger.info(`Selecting Transportista: ${nombre}`);

    try {
      await this.selectBootstrapDropdown(
        this.selectors.assignment.transportistaBtn,
        nombre,
        true
      );
      logger.info(`Transportista "${nombre}" selected`);

      // CRITICAL: Wait for cascade to vehículo and conductor dropdowns
      logger.info('Waiting 1.5s for cascade to vehículo/conductor...');
      await this.page.waitForTimeout(1500);
    } catch (error) {
      logger.error(`Failed to select transportista: ${nombre}`, error);
      await this.takeScreenshot('select-transportista-error');
      throw error;
    }
  }

  async selectVehiculoPrincipal(patente: string): Promise<void> {
    logger.info(`Selecting Vehículo Principal: ${patente}`);

    try {
      // Verify dropdown is enabled (after transportista selection)
      const btn = this.page.locator(this.selectors.assignment.patentePrincipalBtn);
      const isDisabled = await btn.evaluate((el) => el.hasAttribute('disabled'));

      if (isDisabled) {
        throw new Error(
          'Vehículo Principal dropdown is disabled. Select Transportista first.'
        );
      }

      await this.selectBootstrapDropdown(
        this.selectors.assignment.patentePrincipalBtn,
        patente,
        true
      );
      logger.info(`Vehículo Principal "${patente}" selected`);
    } catch (error) {
      logger.error(`Failed to select vehículo principal: ${patente}`, error);
      await this.takeScreenshot('select-vehiculo-principal-error');
      throw error;
    }
  }

  async selectVehiculoSecundario(patente: string): Promise<void> {
    logger.info(`Selecting Vehículo Secundario: ${patente}`);

    try {
      await this.selectBootstrapDropdown(
        this.selectors.assignment.patenteSecundariaBtn,
        patente,
        true
      );
      logger.info(`Vehículo Secundario "${patente}" selected`);
    } catch (error) {
      logger.error(`Failed to select vehículo secundario: ${patente}`, error);
      await this.takeScreenshot('select-vehiculo-secundario-error');
      throw error;
    }
  }

  async selectConductor(nombre: string): Promise<void> {
    logger.info(`Selecting Conductor: ${nombre}`);

    try {
      // Verify dropdown is enabled (after transportista selection)
      const btn = this.page.locator(this.selectors.assignment.conductoresBtn);
      const isDisabled = await btn.evaluate((el) => el.hasAttribute('disabled'));

      if (isDisabled) {
        throw new Error(
          'Conductor dropdown is disabled. Select Transportista first.'
        );
      }

      await this.selectBootstrapDropdown(
        this.selectors.assignment.conductoresBtn,
        nombre,
        true
      );
      logger.info(`Conductor "${nombre}" selected`);
    } catch (error) {
      logger.error(`Failed to select conductor: ${nombre}`, error);
      await this.takeScreenshot('select-conductor-error');
      throw error;
    }
  }

  async selectPerfilTemperatura(perfil: string): Promise<void> {
    logger.info(`Selecting Perfil Temperatura: ${perfil}`);

    try {
      await this.selectBootstrapDropdown(
        this.selectors.assignment.perfilTemperaturaBtn,
        perfil,
        false
      );
      logger.info(`Perfil Temperatura "${perfil}" selected`);
    } catch (error) {
      logger.error(`Failed to select perfil temperatura: ${perfil}`, error);
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar button');

    try {
      const btnGuardar = this.page.locator(this.selectors.assignment.btnGuardar);

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
    logger.info('Clicking Cerrar button');

    try {
      await this.click(this.selectors.assignment.btnCerrar);
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.error('Failed to click Cerrar', error);
      throw error;
    }
  }

  // ========== VERIFICATION METHODS ==========

  async isAsignacionComplete(): Promise<boolean> {
    logger.info('Checking if assignment is complete');

    try {
      await this.page.waitForTimeout(2000);

      // Check for success alert/toast
      const successAlert = await this.page
        .locator(
          '.alert-success, .toast-success, [role="alert"].bg-success, .swal2-success'
        )
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (successAlert) {
        const alertText = await this.page
          .locator('.alert-success, .toast-success, .swal2-content')
          .first()
          .textContent()
          .catch(() => '');
        logger.info(`Success alert: ${alertText}`);
        return true;
      }

      // Check if dropdowns reset to default (sign of successful save)
      const transportistaBtn = this.page.locator(
        this.selectors.assignment.transportistaBtn
      );
      const btnText = await transportistaBtn.textContent();

      if (btnText?.includes('Seleccionar')) {
        logger.info('Dropdowns reset, assignment likely successful');
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // ========== COMBINED ASSIGNMENT METHOD ==========

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting assignment for viaje ${nroViaje} ===`);

    try {
      // Step 1: Select the viaje row
      logger.info('STEP 1: Selecting viaje row');
      await this.selectViajeRow(nroViaje);
      await this.page.screenshot({
        path: './reports/screenshots/asignar-step1-row-selected.png',
      });

      // Step 2: Select Transportista
      logger.info('STEP 2: Selecting Transportista');
      await this.selectTransportista(data.transportista);
      await this.page.screenshot({
        path: './reports/screenshots/asignar-step2-transportista.png',
      });

      // Step 3: Select Vehículo Principal
      logger.info('STEP 3: Selecting Vehículo Principal');
      await this.selectVehiculoPrincipal(data.vehiculoPrincipal);
      await this.page.screenshot({
        path: './reports/screenshots/asignar-step3-vehiculo.png',
      });

      // Step 4: Select Vehículo Secundario (optional)
      if (data.vehiculoSecundario) {
        logger.info('STEP 4: Selecting Vehículo Secundario');
        await this.selectVehiculoSecundario(data.vehiculoSecundario);
      }

      // Step 5: Select Conductor
      logger.info('STEP 5: Selecting Conductor');
      await this.selectConductor(data.conductor);
      await this.page.screenshot({
        path: './reports/screenshots/asignar-step5-conductor.png',
      });

      // Step 6: Click Guardar
      logger.info('STEP 6: Clicking Guardar');
      await this.clickGuardar();
      await this.page.screenshot({
        path: './reports/screenshots/asignar-step6-saved.png',
      });

      logger.info(`=== Assignment complete for viaje ${nroViaje} ===`);
      return true;
    } catch (error) {
      logger.error(`Failed to assign viaje ${nroViaje}`, error);
      await this.takeScreenshot(`assign-viaje-${nroViaje}-error`);
      throw error;
    }
  }
}
