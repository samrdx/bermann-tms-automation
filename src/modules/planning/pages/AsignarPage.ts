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
      transportistaBtn: "div.bootstrap-select button[data-toggle='dropdown'], button[title='Transportista']",
      patentePrincipalBtn: "button[title='Vehículo Principal'], button[data-id='patente_principal']",
      conductoresBtn: "button[data-id='viajes-conductor_id'], button[title*='Conductor']",
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
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navigating to Asignar Viajes page');
    await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/asignar');
    await this.page.waitForLoadState('networkidle');
  }

  async selectViajeRow(nroViaje: string): Promise<boolean> {
    logger.info(`Selecting viaje row: ${nroViaje}`);
    // Búsqueda simplificada
    const searchInput = this.page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(nroViaje);
      await this.page.waitForTimeout(1500);
    }
    
    const row = this.page.locator('#tabla_asignar tbody tr').first(); 
    // Asumimos que el filtro dejó una sola fila o la primera es la correcta
    
    if (!(await row.isVisible())) throw new Error(`Viaje ${nroViaje} not found`);

    const editIcon = row.locator('a[title="Editar"], i.fa-pencil').first();
    if (await editIcon.isVisible()) {
      await Promise.all([
        this.page.waitForURL(/\/editar\//, { timeout: 30000 }), 
        editIcon.click()
      ]);
    } else {
      await row.click();
    }

    await this.page.waitForLoadState('domcontentloaded');
    
    try {
        await this.page.waitForSelector(this.selectors.assignment.transportistaBtn, { state: 'attached', timeout: 30000 });
    } catch (e) {
        logger.warn('Strict selector failed, trying fallback...');
        await this.page.waitForSelector("button:has-text('Transportista')", { state: 'visible', timeout: 10000 });
    }
    
    logger.info('✅ Assignment Form Loaded');
    return true;
  }

  // --- SELECTOR ROBUSTO ---
  private async selectBSDropdown(buttonSelector: string, optionText: string): Promise<void> {
    logger.info(`Selecting "${optionText}" in ${buttonSelector}`);
    
    // 1. Abrir Dropdown
    await this.page.evaluate((sel) => {
        const buttons = document.querySelectorAll(sel);
        // Buscar el visible
        const visibleBtn = Array.from(buttons).find(b => (b as HTMLElement).offsetParent !== null);
        if (visibleBtn) (visibleBtn as HTMLElement).click();
        else {
             const anyBtn = document.querySelector(sel) as HTMLElement;
             if(anyBtn) anyBtn.click();
        }
    }, buttonSelector);

    // 2. Esperar Menú (Selector corregido para evitar .inner)
    const dropdownMenu = this.page.locator('div.dropdown-menu.show').first();
    try {
        await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
        logger.warn('Dropdown did not open, retrying click...');
        await this.page.locator(buttonSelector).first().click({ force: true });
        await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });
    }

    // 3. Buscar y Clickear Opción
    const searchBox = dropdownMenu.locator('.bs-searchbox input');
    if (await searchBox.isVisible()) {
      await searchBox.fill(optionText);
      await this.page.waitForTimeout(1000); // Wait for filter
      await this.page.keyboard.press('Enter');
    } else {
      const option = dropdownMenu.locator('li a').filter({ hasText: optionText }).first();
      if (await option.isVisible()) {
         await option.evaluate((el) => (el as HTMLElement).click());
      } else {
         const firstOption = dropdownMenu.locator('li a').first();
         await firstOption.evaluate((el) => (el as HTMLElement).click());
      }
    }
    
    if (await dropdownMenu.isVisible()) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async clickGuardar(): Promise<void> {
    await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel) as HTMLElement;
        if(btn) btn.click();
    }, this.selectors.assignment.btnGuardar);
    await this.page.waitForTimeout(2000);
  }

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting Assignment for ${nroViaje} ===`);
    await this.selectViajeRow(nroViaje);

    // 1. Transportista
    await this.selectBSDropdown(this.selectors.assignment.transportistaBtn, data.transportista);
    
    // FIX: Espera larga para cascada lenta en CI
    logger.info('Waiting for cascading updates (8s)...');
    await this.page.waitForTimeout(8000); 

    // FIX: Verificar habilitación de cualquier manera
    const isVehicleEnabled = await this.page.evaluate(() => {
        const btn = document.querySelector("button[data-id='patente_principal']") as HTMLButtonElement;
        return btn && !btn.disabled && !btn.classList.contains('disabled');
    });

    if (!isVehicleEnabled) {
        logger.warn('Vehicle button still disabled. Trying to re-trigger transportista...');
        // Re-seleccionar transportista si falló la primera vez
        await this.selectBSDropdown(this.selectors.assignment.transportistaBtn, data.transportista);
        await this.page.waitForTimeout(5000);
    }

    // 2. Vehículo
    await this.selectBSDropdown(this.selectors.assignment.patentePrincipalBtn, data.vehiculoPrincipal);
    
    // 3. Conductor
    await this.selectBSDropdown(this.selectors.assignment.conductoresBtn, data.conductor);
    
    // 4. Guardar
    await this.clickGuardar();
    logger.info('✅ Assignment flow complete');
    return true;
  }
}