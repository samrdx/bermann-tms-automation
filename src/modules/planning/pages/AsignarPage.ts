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
      // Usamos selectores específicos pero robustos
      // NOTA: Para JS Click, necesitamos un selector que sea único en el DOM o usar .first()
      transportistaBtn: "button[title='Transportista']",
      patentePrincipalBtn: "button[title='Vehículo Principal']",
      conductoresBtn: "button[data-id='viajes-conductor_id']",
      btnGuardar: "#btn_guardar_form",
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
    
    // Esperamos que aparezca el formulario (cualquier botón de dropdown es buena señal)
    logger.info('Waiting for Assignment Form...');
    try {
        await this.page.waitForSelector("div.bootstrap-select", { state: 'attached', timeout: 30000 });
    } catch (e) {
        logger.warn('Bootstrap select not found attached immediately, waiting longer...');
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

  // --- OPCIÓN 1: JS CLICK PARA DROPDOWNS ---
  private async selectBSDropdown(buttonSelector: string, optionText: string): Promise<void> {
    logger.info(`Selecting "${optionText}" in ${buttonSelector} using JS Injection`);
    
    // 1. Obtener localizador para Playwright (solo para esperar visibilidad)
    const btnLocator = this.page.locator(buttonSelector).first();
    
    // Intentar esperar a que el botón exista (fallback a genérico si falla)
    try {
        await btnLocator.waitFor({ state: 'attached', timeout: 10000 });
    } catch {
        logger.warn(`Button ${buttonSelector} not found. Trying fallback click strategy.`);
    }

    // 2. JS CLICK: Abrir el menú inyectando click
    await this.page.evaluate((sel) => {
        // Buscamos todos los botones que coincidan
        const buttons = document.querySelectorAll(sel);
        // Filtramos los visibles (heuristic simple: offsetParent no nulo)
        const visibleBtn = Array.from(buttons).find(b => (b as HTMLElement).offsetParent !== null);
        
        if (visibleBtn) {
            (visibleBtn as HTMLElement).click();
        } else {
            // Si no encuentra visible, clica el primero
            const first = document.querySelector(sel) as HTMLElement;
            if(first) first.click();
        }
    }, buttonSelector);

    // 3. Manejo del menú desplegable (Playwright standard)
    // Usamos localizadores relativos al botón abierto
    // Nota: Al hacer click JS, el atributo aria-expanded cambia.
    
    const dropdownMenu = this.page.locator('.dropdown-menu.show').first();
    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    const searchBox = dropdownMenu.locator('.bs-searchbox input');
    if (await searchBox.isVisible()) {
      await searchBox.fill(optionText);
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
    } else {
      const option = dropdownMenu.locator('li a').filter({ hasText: optionText }).first();
      if (await option.isVisible()) {
        await option.click(); // Aquí usamos click normal, dentro del menú suele ser seguro
      } else {
        logger.warn(`Exact match "${optionText}" not found. Clicking first option.`);
        await dropdownMenu.locator('li a').first().click();
      }
    }
    
    // Cerrar si quedó abierto
    if (await dropdownMenu.isVisible()) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar using JS...');
    // JS CLICK para Guardar
    await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel) as HTMLElement;
        if(btn) btn.click();
    }, this.selectors.assignment.btnGuardar);
    
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting Assignment for ${nroViaje} ===`);
    await this.selectViajeRow(nroViaje);

    await this.selectBSDropdown(this.selectors.assignment.transportistaBtn, data.transportista);
    logger.info('Transportista selected. Waiting for cascade...');
    
    // Cascada generosa
    await this.page.waitForTimeout(4000); 

    // Espera del botón vehículo
    await this.page.waitForFunction(
      (selector) => {
        const btn = document.querySelector(selector);
        return btn && !btn.hasAttribute('disabled') && !btn.classList.contains('disabled');
      },
      "button[title='Vehículo Principal']", 
      { timeout: 30000 }
    );
    
    await this.selectBSDropdown(this.selectors.assignment.patentePrincipalBtn, data.vehiculoPrincipal);
    await this.selectBSDropdown(this.selectors.assignment.conductoresBtn, data.conductor);
    await this.clickGuardar();
    logger.info('✅ Assignment flow complete');
    return true;
  }
}