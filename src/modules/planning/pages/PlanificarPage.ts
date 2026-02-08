import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test'; // CRÍTICO: Importar expect
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PlanificarViajesPage');

export class PlanificarPage extends BasePage {
  private readonly selectors = {
    // Campos básicos
    nroViaje: '#viajes-nro_viaje',
    numeroPlanilla: '#viajes-numero_planilla',
    valorFlete: '#viajes-valor_flete',

    // Selects
    tipoOperacion: '#tipo_operacion_form',
    cliente: '#viajes-cliente_id',
    tipoServicio: '#viajes-tipo_servicio_id',
    tipoViaje: '#viajes-tipo_viaje_id',
    unidadNegocio: '#viajes-unidad_negocio_id',
    codigoCarga: '#viajes-carga_id',

    // Ruta
    btnAgregarRuta: 'button:has-text("Agregar Ruta")',
    modalRutas: '#modalRutasSugeridas',
    tablaRutas: '#tabla-rutas tbody tr',

    // Botones
    btnGuardar: '#btn_guardar_form',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillNroViaje(nro?: string): Promise<void> {
    const nroViaje = nro || String(Math.floor(10000 + Math.random() * 90000));
    await this.fill(this.selectors.nroViaje, nroViaje);
  }

  // --- REFACTOR: SELECCIÓN DE CLIENTE (Teclado + API Wait) ---
  async selectCliente(cliente: string): Promise<void> {
    logger.info(`Selecting Cliente: ${cliente}`);
    try {
      // 1. Abrir dropdown
      const pickerBtn = this.page.locator('button[data-id="viajes-cliente_id"]');
      await pickerBtn.waitFor({ state: 'visible' });
      await pickerBtn.click();

      // 2. Esperar input de búsqueda
      const searchInput = this.page.locator('.dropdown-menu.show .bs-searchbox input').first();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });

      // 3. Listener para la API de búsqueda (evita timeouts por lentitud)
      const responsePromise = this.page.waitForResponse(
        resp => resp.url().includes('get_clientes') || resp.url().includes('api'),
        { timeout: 8000 }
      ).catch(() => null);

      // 4. Escribir nombre exacto
      await searchInput.fill(cliente);

      // 5. Esperar respuesta de red
      await responsePromise;
      await this.page.waitForTimeout(500);

      // 6. NAVEGACIÓN POR TECLADO (Bypass de selectores CSS complejos)
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(200);
      await this.page.keyboard.press('Enter');

      logger.info('✅ Cliente selected via keyboard');

    } catch (error) {
      logger.error(`Failed to select cliente: ${cliente}`, error);
      throw error;
    }

    // 7. Esperar a que la cascada habilite el siguiente campo
    logger.info('Waiting for Codigo Carga to unlock...');
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && !el.disabled;
      },
      this.selectors.codigoCarga,
      { timeout: 15000 }
    );
  }

  // --- REFACTOR: CÓDIGO CARGA (Disparar evento change) ---
  async selectCodigoCarga(carga?: string): Promise<void> {
    logger.info('Selecting Codigo Carga...');

    // Usamos robustSelect (o lógica simple) para poner el valor
    await this.robustSelect(this.selectors.codigoCarga, carga || '', !carga);

    // FIX CRÍTICO: Disparar evento change MANUALMENTE
    // Esto es lo que despierta al backend para calcular rutas
    logger.info('🔥 Forcing change event on Codigo Carga');
    const selector = this.selectors.codigoCarga;

    await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector);

    // Esperar a que el backend procese (Cálculo de rutas)
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // --- REFACTOR: AGREGAR RUTA (Esperar botón enabled) ---
  async agregarRuta(numeroRuta: string): Promise<void> {
    logger.info(`Adding ruta: ${numeroRuta}`);
    const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

    // ESPERA INTELIGENTE: Esperar a que el botón deje de estar 'disabled'
    try {
      await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
    } catch (e) {
      throw new Error('Timeout: "Agregar Ruta" button never became enabled. Check if contract has valid routes.');
    }

    await btnAgregar.click();
    await this.page.waitForTimeout(1000);

    // Buscar en la tabla (Lógica estándar)
    const rows = this.page.locator(this.selectors.tablaRutas);
    const rowCount = await rows.count();
    let found = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const text = await row.innerText();
      if (text.includes(numeroRuta)) {
        await row.locator('.btn-success').click();
        found = true;
        break;
      }
    }

    if (!found) throw new Error(`Ruta ${numeroRuta} not found in table`);
    await this.page.waitForTimeout(1000);
  }

  // --- MÉTODOS DE APOYO (Robust Select Simplificado) ---
  private async robustSelect(selector: string, textOrValue: string, searchByText = true): Promise<void> {
    const selectLoc = this.page.locator(selector);
    await selectLoc.waitFor({ state: 'attached' });

    await this.page.evaluate((args) => {
      const $ = (window as any).$;
      const el = document.querySelector(args.sel) as HTMLSelectElement;

      // Estrategia 1: Bootstrap Select
      if ($ && $(el).selectpicker) {
        // Si es búsqueda por texto, encontrar el valor primero
        let val = args.val;
        if (args.search) {
          const opt = Array.from(el.options).find(o => o.text.includes(args.val));
          if (opt) val = opt.value;
        }
        $(el).selectpicker('val', val);
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Estrategia 2: Select Nativo
      else {
        el.value = args.val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { sel: selector, val: textOrValue, search: searchByText });

    await this.page.waitForTimeout(500);
  }

  // Métodos wrapper simples
  async selectTipoOperacion(val: string) { await this.robustSelect(this.selectors.tipoOperacion, val, true); }
  async selectTipoServicio(val: string) { await this.robustSelect(this.selectors.tipoServicio, val, true); }
  async selectTipoViaje(val: string) { await this.robustSelect(this.selectors.tipoViaje, val, false); }
  async selectUnidadNegocio(val: string) {
    await this.robustSelect(this.selectors.unidadNegocio, val, false);
    await this.page.waitForLoadState('networkidle'); // Cascada
  }

  async clickGuardar() {
    await this.page.click(this.selectors.btnGuardar);
    await this.page.waitForLoadState('networkidle');
  }

  async isFormSaved() {
    return !(this.page.url().includes('/crear'));
  }
}