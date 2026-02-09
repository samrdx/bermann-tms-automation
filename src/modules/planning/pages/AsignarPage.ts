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
    assignment: {
      // FIX CRÍTICO: Apuntar al botón interactivo VISIBLE del dropdown de Bootstrap
      transportistaBtn: "div.bootstrap-select button[data-toggle='dropdown']:visible, button[title='Transportista']:visible",
      patentePrincipalBtn: "button[title='Vehículo Principal']:visible, button[data-id='patente_principal']:visible",
      conductoresBtn: "button[data-id='viajes-conductor_id']:visible, button[title*='Conductor']:visible",
      btnGuardar: "#btn_guardar_form",
      btnCerrar: 'a.btn.btn-secondary',
    },
    table: {
      container: '#tabla_asignar',
      rows: '#tabla_asignar tbody tr',
      nroViajeColumn: 2,
      vehiculoUnoColumn: 3,
      transportistaColumn: 11,
      conductorColumn: 12,
      estadoViajeColumn: 13,
    },
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
      if (text.includes(nroViaje)) return row;
    }
    return null;
  }

  async selectViajeRow(nroViaje: string): Promise<boolean> {
    logger.info(`Selecting viaje row: ${nroViaje}`);
    const row = await this.findViajeRow(nroViaje);
    if (!row) throw new Error(`Viaje ${nroViaje} not found in table`);

    await row.scrollIntoViewIfNeeded();

    const editIcon = row.locator('i.fa-pencil, i.fa-edit, .glyphicon-pencil, a[title="Editar"], a[title="Asignar"]').first();

    if (await editIcon.isVisible()) {
      logger.info('Clicking Edit icon and waiting for navigation...');
      await Promise.all([
        this.page.waitForURL(/\/editar\//, { timeout: 30000 }), 
        editIcon.click()
      ]);
    } else {
      await row.click();
    }

    await this.page.waitForLoadState('domcontentloaded');
    
    logger.info('Waiting for Transportista dropdown...');
    
    // Espera explícita del botón visible
    try {
        await this.page.waitForSelector(this.selectors.assignment.transportistaBtn, { state: 'visible', timeout: 30000 });
    } catch (e) {
        // Fallback: Si el selector estricto falla, intentar buscar cualquier botón con el texto aproximado
        logger.warn('Strict selector failed, trying fallback...');
        await this.page.waitForSelector("button:has-text('Transportista')", { state: 'visible', timeout: 10000 });
    }
    
    logger.info('✅ Assignment Form Loaded');
    return true;
  }

  async getViajeStatus(nroViaje: string): Promise<string> {
    const row = await this.findViajeRow(nroViaje);
    if (!row) throw new Error(`Viaje ${nroViaje} not found`);
    const cells = await row.locator('td').allTextContents();
    return cells[this.selectors.table.estadoViajeColumn]?.trim() || '';
  }

  async verifyViajeAsignado(nroViaje: string): Promise<boolean> {
    logger.info(`Verifying assignment for ${nroViaje}`);
    await this.navigate();
    const row = await this.findViajeRow(nroViaje);
    if (!row) return false;
    const cells = await row.locator('td').allTextContents();
    return !!(
      cells[this.selectors.table.transportistaColumn]?.trim() &&
      cells[this.selectors.table.conductorColumn]?.trim() &&
      cells[this.selectors.table.vehiculoUnoColumn]?.trim()
    );
  }

  private async selectBSDropdown(buttonSelector: string, optionText: string): Promise<void> {
    logger.info(`Selecting "${optionText}" in ${buttonSelector}`);
    
    // Usar .first() es vital si hay duplicados ocultos
    const btn = this.page.locator(buttonSelector).first();

    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });

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
    await btnGuardar.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting Assignment for ${nroViaje} ===`);
    await this.selectViajeRow(nroViaje);

    // Usar el selector corregido
    await this.selectBSDropdown(this.selectors.assignment.transportistaBtn, data.transportista);
    logger.info('Transportista selected. Waiting for cascade...');
    await this.page.waitForTimeout(3000); 

    await this.page.waitForFunction(
      (selector) => {
        const btn = document.querySelector(selector);
        return btn && !btn.hasAttribute('disabled') && !btn.classList.contains('disabled');
      },
      "button[title='Vehículo Principal']", 
      { timeout: 15000 }
    );
    await this.selectBSDropdown(this.selectors.assignment.patentePrincipalBtn, data.vehiculoPrincipal);
    await this.selectBSDropdown(this.selectors.assignment.conductoresBtn, data.conductor);
    await this.clickGuardar();
    logger.info('✅ Assignment flow complete');
    return true;
  }
}