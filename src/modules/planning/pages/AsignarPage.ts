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
    // ASSIGNMENT PANEL (Selectores extraídos del contexto real)
    assignment: {
      // Transportista: Usamos el título que es único y estable
      transportistaBtn: "button[title='Transportista']",

      // Vehículo: Usamos el título exacto
      patentePrincipalBtn: "button[title='Vehículo Principal']",

      // Conductor: Usamos el data-id específico que encontraste
      conductoresBtn: "button[data-id='viajes-conductor_id']",

      // Guardar: ID directo
      btnGuardar: "#btn_guardar_form",

      // Otros (mantenemos por compatibilidad si se usan)
      perfilTemperaturaBtn: 'button[data-id="perfil_temperatura"]',
      patenteSecundariaBtn: 'button[data-id="patente_secundaria"]',
      recalcular: '#recalcular',
      btnCerrar: 'a.btn.btn-secondary',
    },

    // TABLE
    table: {
      container: '#tabla_asignar',
      rows: '#tabla_asignar tbody tr',
      // Column indexes (0-based)
      nroViajeColumn: 2,
      vehiculoUnoColumn: 3,
      transportistaColumn: 11,
      conductorColumn: 12,
      estadoViajeColumn: 13,
    },

    // PAGINATION
    pagination: {
      next: '.page-link.next',
    },
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
    await this.page.waitForSelector(this.selectors.table.container, { state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async findViajeRow(nroViaje: string): Promise<Locator | null> {
    logger.info(`Searching for viaje: ${nroViaje}`);

    const searchInput = this.page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(nroViaje);
      await this.page.waitForTimeout(1500);
    }

    const rows = this.page.locator(this.selectors.table.rows);
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const text = await row.innerText();
      if (text.includes(nroViaje)) {
        return row;
      }
    }
    return null;
  }

  async selectViajeRow(nroViaje: string): Promise<boolean> {
    logger.info(`Selecting viaje row: ${nroViaje}`);
    const row = await this.findViajeRow(nroViaje);

    if (!row) {
      // Fallback: search pagination logic here if needed (omitted for brevity)
      throw new Error(`Viaje ${nroViaje} not found in table`);
    }

    await row.scrollIntoViewIfNeeded();

    // Prioritize Edit/Pencil icon
    const editIcon = row.locator('i.fa-pencil, i.fa-edit, .glyphicon-pencil, a[title="Editar"], a[title="Asignar"]').first();

    if (await editIcon.isVisible()) {
      await editIcon.click();
    } else {
      await row.click();
    }

    // CRITICAL: Wait for the specific Transportista button to appear
    logger.info('Waiting for Transportista dropdown...');
    await this.page.waitForSelector(this.selectors.assignment.transportistaBtn, { state: 'visible', timeout: 30000 });
    logger.info('✅ Assignment Form Loaded');

    return true;
  }

  async getViajeStatus(nroViaje: string): Promise<string> {
    const row = await this.findViajeRow(nroViaje);
    if (!row) throw new Error(`Viaje ${nroViaje} not found`);

    const cells = await row.locator('td').allTextContents();
    const status = cells[this.selectors.table.estadoViajeColumn]?.trim() || '';
    return status;
  }

  async verifyViajeAsignado(nroViaje: string): Promise<boolean> {
    logger.info(`Verifying assignment for ${nroViaje}`);

    await this.navigate();
    const row = await this.findViajeRow(nroViaje);
    if (!row) return false;

    const cells = await row.locator('td').allTextContents();
    const transportista = cells[this.selectors.table.transportistaColumn]?.trim();
    const conductor = cells[this.selectors.table.conductorColumn]?.trim();
    const vehiculo = cells[this.selectors.table.vehiculoUnoColumn]?.trim();

    return !!(transportista && conductor && vehiculo);
  }

  // ========== DROPDOWN HELPER (ROBUST & SCOPED) ==========

  private async selectBSDropdown(buttonSelector: string, optionText: string): Promise<void> {
    logger.info(`Selecting "${optionText}" in ${buttonSelector}`);
    const btn = this.page.locator(buttonSelector).first();

    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // Scope menu to button's parent to avoid Strict Mode errors
    const parent = btn.locator('xpath=..');
    const dropdownMenu = parent.locator('.dropdown-menu.show').first();
    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    const searchBox = dropdownMenu.locator('.bs-searchbox input');
    if (await searchBox.isVisible()) {
      await searchBox.fill(optionText);
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
    } else {
      const option = dropdownMenu.locator('li a').filter({ hasText: optionText }).first();
      if (await option.isVisible()) {
        await option.click();
      } else {
        logger.warn(`Exact match "${optionText}" not found. Clicking first option.`);
        await dropdownMenu.locator('li a').first().click();
      }
    }

    if (await dropdownMenu.isVisible()) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar...');
    const btnGuardar = this.page.locator(this.selectors.assignment.btnGuardar).first();

    await btnGuardar.scrollIntoViewIfNeeded();
    await btnGuardar.waitFor({ state: 'visible', timeout: 5000 });
    await btnGuardar.click();

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // ========== MAIN FLOW ==========

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting Assignment for ${nroViaje} ===`);

    // 1. Enter Form
    await this.selectViajeRow(nroViaje);

    // 2. Transportista
    // Usamos tu selector exacto: button[title='Transportista']
    await this.selectBSDropdown(this.selectors.assignment.transportistaBtn, data.transportista);
    logger.info('Transportista selected. Waiting for cascade...');
    await this.page.waitForTimeout(2000);

    // 3. Vehículo Principal
    // Usamos tu selector exacto: button[title='Vehículo Principal']
    // Esperamos a que se habilite
    await this.page.waitForFunction(
      (selector) => {
        const btn = document.querySelector(selector);
        return btn && !btn.hasAttribute('disabled') && !btn.classList.contains('disabled');
      },
      this.selectors.assignment.patentePrincipalBtn,
      { timeout: 15000 }
    );
    await this.selectBSDropdown(this.selectors.assignment.patentePrincipalBtn, data.vehiculoPrincipal);

    // 4. Conductor Principal
    // Usamos tu selector exacto: button[data-id='viajes-conductor_id']
    await this.selectBSDropdown(this.selectors.assignment.conductoresBtn, data.conductor);

    // 5. Guardar
    // Usamos tu selector exacto: #btn_guardar_form
    await this.clickGuardar();

    logger.info('✅ Assignment flow complete');
    return true;
  }
}