import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

const logger = createLogger('PlanificarViajesPage');

export class PlanificarPage extends BasePage {
  private readonly selectors = {
    // Inputs Simples
    nroViaje: '#viajes-nro_viaje',
    numeroPlanilla: '#viajes-numero_planilla',
    valorFlete: '#viajes-valor_flete',

    // Botones de Dropdowns (Bootstrap Select) - Usamos data-id
    // NOTA: Ambos ambientes (QA y Demo) usan los mismos selectores tipo_operacion_form y viajes-carga_id
    btnTipoOperacion: 'button[data-id="tipo_operacion_form"]',
    btnTipoServicio: 'button[data-id="viajes-tipo_servicio_id"]',
    btnTipoViaje: 'button[data-id="viajes-tipo_viaje_id"]',
    btnUnidadNegocio: 'button[data-id="viajes-unidad_negocio_id"]',
    btnCodigoCarga: 'button[data-id="viajes-carga_id"]',
    btnCliente: 'button[data-id="viajes-cliente_id"]',

    // Ruta
    btnAgregarRuta: 'button:has-text("Agregar Ruta")',
    modalRutas: '#modalRutasSugeridas',
    tablaRutas: '#tabla-rutas tbody tr',

    // Origen/Destino
    btnOrigen: 'button[data-id="_origendestinoform-origen"]',
    btnDestino: 'button[data-id="_origendestinoform-destino"]',

    // Acciones
    btnGuardar: '#btn_guardar_form',
    spinner: '#modalCargando',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navegando a la página de Planificar Viajes');
    await this.page.goto('/viajes/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500); // Allow BS to initialize
  }

  async planificarViaje(nroViaje: string, operation: string, service: string, cliente: string): Promise<void> {
    logger.info(`Iniciando Paso 6.4: Planificar Viaje (Flujo Robusto)`);
    logger.info('='.repeat(80));

    await this.navigate();
    await this.fillNroViaje(nroViaje);

    // Paso 2: Select Operation
    await this.selectTipoOperacion(operation);
    await this.waitForLoading(20000);
    await this.page.waitForTimeout(1500);

    // Paso 3: Select Service
    await this.selectTipoServicio(service);
    await this.waitForLoading(20000);
    await this.page.waitForTimeout(1500);

    // Paso 4: Select Cliente
    await this.selectCliente(cliente);
    await this.waitForLoading(20000);

    await this.click(this.selectors.btnGuardar);
  }

  async fillNroViaje(nro?: string): Promise<void> {
    const nroViaje = nro || String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`Completando Nro Viaje: ${nroViaje}`);
    await this.fill(this.selectors.nroViaje, nroViaje);
  }

  private async waitForLoading(timeout: number = 20000): Promise<void> {
    const spinner = this.page.locator(this.selectors.spinner);
    try {
      // Small buffer to let spinner appear
      await this.page.waitForTimeout(500);
      if (await spinner.isVisible()) {
        logger.debug('Esperando a que el modal de carga desaparezca...');
        await spinner.waitFor({ state: 'hidden', timeout });
        logger.debug('El modal de carga desapareció');
        await this.page.waitForTimeout(500); // Settle time
      }
    } catch (e) {
      logger.warn('Tiempo de espera agotado esperando el modal de carga - continuando de todas formas');
    }
  }

  /**
   * Private helper to handle persistent modal backdrops that prevent interaction.
   */
  private async handleModalBackdrop(): Promise<void> {
    const backdrop = this.page.locator('.modal-backdrop');
    if (await backdrop.isVisible().catch(() => false)) {
      logger.info('🛡️ Fondo de modal detectado, eliminándolo forzosamente para desbloquear la UI...');
      await this.page.evaluate(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body?.classList.remove('modal-open');
        if (document.body) document.body.style.paddingRight = '';
      });
      await this.page.waitForTimeout(500); // Settle time
    }
  }

  /**
   * Private helper for Bootstrap Select dropdowns (Hybrid Pattern)
   */
  private async selectBootstrapDropdown(btnSelector: string, optionText: string, fieldName: string = 'Dropdown'): Promise<void> {
    logger.info(`Seleccionando ${fieldName}: [${optionText}]`);

    try {
      await this.waitForLoading();

      const button = this.page.locator(btnSelector);
      await button.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
      await button.waitFor({ state: 'visible', timeout: 2000 }).catch(() => { });

      // Ensure no backdrop is blocking the dropdown click
      await this.handleModalBackdrop();

      // 1. Open dropdown via evaluate to be extremely robust
      await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel) as HTMLElement;
        if (btn) btn.click();
      }, btnSelector);

      // 2. Locate the container and ITS menu
      const container = this.page.locator('div.bootstrap-select').filter({ has: button });
      const menu = container.locator('div.dropdown-menu');
      const searchInput = menu.locator('div.bs-searchbox input');

      // 3. Search and select
      if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        logger.debug(`Buscando "${optionText}" en ${fieldName}`);
        await searchInput.clear();
        await searchInput.fill(optionText);
        await this.page.waitForTimeout(1000); // Wait for filter
      }

      const option = menu.locator('ul.dropdown-menu li a').filter({ hasText: optionText }).first();

      await option.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
      await option.evaluate((node: HTMLElement) => node.click());

      // 4. Verification & Force Sync
      await this.page.waitForTimeout(800);
      const selectedText = await button.innerText();
      if (!selectedText.toLowerCase().includes(optionText.toLowerCase())) {
        logger.warn(`⚠️ La UI del dropdown [${fieldName}] no se actualizó a [${optionText}]. Actual: [${selectedText}]. Forzando valor vía JS...`);
      }

      // ALWAYS force sync the underlying <select> to prevent validation errors 
      await this.page.evaluate(({ btnSel, text }) => {
        const btn = document.querySelector(btnSel) as HTMLElement;
        const container = btn.closest('.bootstrap-select');
        const select = container?.querySelector('select') as HTMLSelectElement;
        const options = Array.from(select?.options || []);

        // Try strict match first, then includes
        let target = options.find(o => o.text.trim() === text);
        if (!target) {
          target = options.find(o => o.text.trim().toLowerCase().includes(text.toLowerCase()));
        }

        if (select && target) {
          select.value = target.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          // Try to trigger bootstrap-select refresh if possible
          try { (window as any).$(select).selectpicker('val', target.value); } catch (e) { }
          try { (window as any).$(select).selectpicker('refresh'); } catch (e) { }
        }
      }, { btnSel: btnSelector, text: optionText });

      await this.page.waitForTimeout(1000); // Stabilization
    } catch (error) {
      logger.error(`Fallo en el dropdown [${fieldName}]:`, error);
      await this.takeScreenshot(`fail-${fieldName}`);
      throw error;
    }
  }

  async selectTipoOperacion(tipo: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoOperacion, tipo, 'Tipo Operacion');
  }

  async selectTipoServicio(tipo: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoServicio, tipo, 'Tipo Servicio');
  }

  async selectTipoViaje(tipo: string = 'Normal'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoViaje, tipo, 'Tipo Viaje');
  }

  async selectUnidadNegocio(unidad: string = 'Defecto'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnUnidadNegocio, unidad, 'Unidad Negocio');
  }

  async selectCliente(cliente: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnCliente, cliente, 'Cliente');
  }

  async selectCodigoCarga(carga: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnCodigoCarga, carga, 'Codigo Carga');
    await this.page.keyboard.press('Tab');
  }

  async agregarRuta(numeroRuta: string): Promise<boolean> {
    logger.info(`Añadiendo ruta: ${numeroRuta}`);
    await this.handleModalBackdrop();
    const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

    try {
      await btnAgregar.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => { });
      await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
      await btnAgregar.evaluate(el => (el as HTMLElement).click());
      await this.page.waitForTimeout(2000); // Demo might be slow

      // We look for the route in the table
      const rows = this.page.locator(this.selectors.tablaRutas);

      // If we have a search box in the modal, we use it
      const searchBox = this.page.locator('#modalRutasSugeridas .dataTables_filter input');
      if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBox.fill(numeroRuta);
        await this.page.waitForTimeout(1200);
      }

      const rowCount = await rows.count();
      let found = false;

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const text = await row.innerText();
        // Exact match for the ID column or includes
        if (text.includes(numeroRuta)) {
          logger.info(`Ruta [${numeroRuta}] encontrada en la fila ${i + 1}`);
          const selectBtn = row.locator('.btn-success, .btn-primary').first();
          await selectBtn.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => { });
          await selectBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { });
          await selectBtn.evaluate(el => (el as HTMLElement).click());
          found = true;
          break;
        }
      }

      if (!found) {
        logger.warn(`Ruta ${numeroRuta} no encontrada en la lista`);
        await this.page.keyboard.press('Escape').catch(() => { });
        return false;
      }

      // CRITICAL: Wait for Origen/Destino to populate after modal selection
      logger.info('Esperando a que Origen/Destino se completen...');
      await this.page.waitForFunction(() => {
        const o = document.querySelector('button[data-id="_origendestinoform-origen"]') as HTMLElement;
        const d = document.querySelector('button[data-id="_origendestinoform-destino"]') as HTMLElement;
        return o && o.innerText.trim() !== 'Seleccione' && d && d.innerText.trim() !== 'Seleccione';
      }, { timeout: 10000 }).catch(() => {
        logger.warn('⚠️ Origen/Destino no se completaron después de 10s');
      });

      return true;
    } catch (e) {
      logger.error('Fallo en agregarRuta', e);
      await this.page.keyboard.press('Escape').catch(() => { });
      return false;
    }
  }

  async selectOrigen(origen: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnOrigen, origen, 'Origen');
  }

  async selectDestino(destino: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnDestino, destino, 'Destino');
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en Guardar...');
    await this.handleModalBackdrop();
    await this.click(this.selectors.btnGuardar);
    await this.page.waitForLoadState('networkidle');
  }

  async isFormSaved(): Promise<boolean> {
    const url = this.page.url();
    return !url.includes('/viajes/crear') || url.includes('id=');
  }
}
