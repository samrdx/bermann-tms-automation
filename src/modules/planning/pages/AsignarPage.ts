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

  async findViajeRow(nroViaje: string): Promise<Locator | null> {
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
    const editIcon = row.locator('i.fa-pencil, i.fa-edit, a[title="Editar"]').first();

    if (await editIcon.isVisible()) {
      await Promise.all([
        this.page.waitForURL(/\/editar\//, { timeout: 30000 }), 
        editIcon.click()
      ]);
    } else {
      await row.click();
    }

    await this.page.waitForLoadState('domcontentloaded');
    // Esperamos a que aparezca cualquier select de bootstrap
    try {
        await this.page.waitForSelector('.bootstrap-select', { timeout: 30000 });
    } catch {
        logger.warn('Bootstrap select not detected immediately.');
    }
    logger.info('✅ Assignment Form Loaded');
    return true;
  }

  // --- ARMA SECRETA: SELECCIÓN POR TEXTO SIN UI ---
  // Busca cualquier <select> en la página que contenga la opción deseada y la selecciona.
  private async forceSelectByText(optionText: string, labelForLog: string): Promise<void> {
    logger.info(`💉 Injecting value for "${labelForLog}": ${optionText}`);
    
    const found = await this.page.evaluate((text) => {
        // Buscar todos los selects visibles
        const selects = Array.from(document.querySelectorAll('select'));
        
        for (const select of selects) {
            // Buscar la opción por texto
            const option = Array.from(select.options).find(opt => opt.text.trim().includes(text));
            
            if (option) {
                // Si encontramos la opción, la seleccionamos directo en el DOM
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Actualizar Bootstrap Select si existe
                // @ts-ignore
                if (window.$ && window.$(select).selectpicker) {
                    // @ts-ignore
                    window.$(select).selectpicker('refresh');
                }
                return true; // Éxito
            }
        }
        return false; // No encontrado
    }, optionText);

    if (!found) {
        throw new Error(`Could not find any dropdown containing option "${optionText}"`);
    }
    await this.page.waitForTimeout(500);
  }

  async clickGuardar(): Promise<void> {
    await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel) as HTMLElement;
        if(btn) btn.click();
    }, this.selectors.assignment.btnGuardar);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async assignViaje(nroViaje: string, data: AsignacionData): Promise<boolean> {
    logger.info(`=== Starting Assignment for ${nroViaje} (Injection Mode) ===`);
    await this.selectViajeRow(nroViaje);

    // 1. Transportista (Inyección)
    await this.forceSelectByText(data.transportista, 'Transportista');
    
    logger.info('Waiting for cascade (loading vehicles)...');
    await this.page.waitForTimeout(6000); // Espera generosa para AJAX

    // 2. Vehículo (Inyección)
    // Intentamos inyectar. Si falla, es porque la lista sigue vacía (AJAX falló o lento)
    try {
        await this.forceSelectByText(data.vehiculoPrincipal, 'Vehículo');
    } catch (e) {
        logger.warn('Vehicle not found initially. Retrying transportista selection...');
        // Retry logic: seleccionar transportista de nuevo
        await this.forceSelectByText(data.transportista, 'Transportista (Retry)');
        await this.page.waitForTimeout(5000);
        await this.forceSelectByText(data.vehiculoPrincipal, 'Vehículo (Retry)');
    }
    
    // 3. Conductor (Inyección)
    await this.forceSelectByText(data.conductor, 'Conductor');
    
    // 4. Guardar
    await this.clickGuardar();
    logger.info('✅ Assignment flow complete');
    return true;
  }
  
  // Métodos auxiliares requeridos por el test
  async waitForTableLoad(): Promise<void> {
    await this.page.waitForSelector('#tabla_asignar', { state: 'visible', timeout: 15000 });
  }
  
  async getViajeStatus(nroViaje: string): Promise<string> {
      const row = await this.findViajeRow(nroViaje);
      if (!row) throw new Error(`Viaje ${nroViaje} not found`);
      const cells = await row.locator('td').allTextContents();
      return cells[13]?.trim() || ''; // Ajusta índice según tu tabla
  }

  async verifyViajeAsignado(nroViaje: string): Promise<boolean> {
    await this.navigate();
    const row = await this.findViajeRow(nroViaje);
    if (!row) return false;
    const cells = await row.locator('td').allTextContents();
    // Indices basados en tu código anterior (11, 12, 3)
    return !!(cells[11]?.trim() && cells[12]?.trim() && cells[3]?.trim());
  }
}