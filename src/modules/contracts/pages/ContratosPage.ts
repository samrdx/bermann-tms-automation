import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test'; // Importante para aserciones
import { createLogger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nroContrato: '#contrato-nro_contrato',
    tipoContratoDropdown: '.filter-option-inner-inner',

    // Cliente (Select2)
    clienteContainer: '#select2-cliente_id-container',
    select2SearchField: '.select2-search__field',
    select2Result: '.select2-results__option',
    select2Highlighted: '.select2-results__option--highlighted',

    // Transportista (Select2 / Bootstrap Select)
    transportistaContainer: '#select2-transportista_id-container',

    // Dates
    fechaInicio: '#fecha_inicio',
    fechaFin: '#fecha_fin',

    // Route Modal
    btnAddRuta: 'button:has-text("Añadir Ruta")',
    modalRutas: '#modalRutas',
    btnRoute715: 'a#btn_plus_715',
    btnCargo715_19: 'a#btn_plus_ruta_715_19',
    inputTarifaViaje715: '#txt_tarifa_extra_715',
    inputTarifaConductor715: '#txt_tarifa_conductor_715',

    // Actions
    btnGuardar: '#btn_guardar',
    btnGuardarContrato: '#btn_guardar_contrato',

    // Validations
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto(`${config.get().baseUrl}/contratos/crear`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToCreate(): Promise<void> {
    logger.info('🧭 Navigating to contract creation page');
    const indexUrl = `${config.get().baseUrl}/contrato/index`;
    await this.page.goto(indexUrl);
    await this.page.waitForLoadState('networkidle');

    // Intentar encontrar el botón de crear dinámicamente
    const createBtn = this.page.locator('a:has-text("Crear"), a:has-text("Nuevo"), a[href*="/crear"]').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
    } else {
      await this.page.goto(`${config.get().baseUrl}/contrato/crear`);
    }

    await this.page.waitForLoadState('domcontentloaded');

    // Validar que no estamos en una página de error
    const title = await this.page.title();
    if (/error|404|not found/i.test(title)) {
      throw new Error(`Navigation failed: Page title indicates error: "${title}"`);
    }
    logger.info('✅ Navigation to create page complete');
  }

  /**
   * REFACTORIZADO: Llena la info básica manejando duplicados y eventos de JS
   */
  async fillBasicContractInfo(
    nroContrato: string,
    transportistaNombre: string
  ): Promise<string> {
    logger.info('📝 Filling basic contract information (Safe Refactor)');

    try {
      // 1. Llenar Nro Contrato
      await this.page.fill(this.selectors.nroContrato, nroContrato);

      // 2. Seleccionar Tipo Contrato = "Costo" (1) y disparar eventos
      await this.page.evaluate(() => {
        const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
        if (el) {
          el.value = '1';
          el.dispatchEvent(new Event('change', { bubbles: true }));
          // @ts-ignore
          if (typeof $ !== 'undefined') $(el).selectpicker('refresh');
        }
      });
      await this.page.waitForTimeout(1000);

      // 3. Seleccionar Transportista (Estrategia Híbrida: JS + UI)
      logger.info(`Selecting Transportista: ${transportistaNombre}`);
      const transportistaSelectId = '#contrato-transportista_id';

      // Argumentos para evaluate (evita error TS2365)
      const evalArgs = { sel: transportistaSelectId, name: transportistaNombre };

      // Buscar el valor exacto en el DOM
      const optionValue = await this.page.evaluate((args) => {
        const el = document.querySelector(args.sel) as HTMLSelectElement;
        if (!el) return null;
        const options = Array.from(el.options);
        // Buscamos coincidencia parcial segura (nombre + timestamp)
        const match = options.find(o => o.text.includes(args.name));
        return match ? match.value : null;
      }, evalArgs);

      if (!optionValue) {
        logger.warn('Exact option not found via JS check, trying UI interaction fallback...');
        // Fallback UI: Abrir, teclear, flecha abajo, enter
        await this.page.click('button[data-id="contrato-transportista_id"]');
        await this.page.waitForTimeout(200);
        await this.page.keyboard.type(transportistaNombre, { delay: 50 });
        await this.page.waitForTimeout(500);
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
      } else {
        // Plan A: Inyección directa si encontramos el ID (Más rápido y seguro)
        const injectArgs = { sel: transportistaSelectId, val: optionValue };
        await this.page.evaluate((args) => {
          const $ = (window as any).$;
          if ($) {
            $(args.sel).selectpicker('val', args.val);
            document.querySelector(args.sel)?.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, injectArgs);
      }

      logger.info('✅ Transportista selected');
      await this.page.waitForTimeout(500);

      // 4. LIMPIEZA PREVENTIVA (CRÍTICO: Antes de guardar)
      await this.forceCloseModal();

      // 5. GUARDAR
      logger.info('💾 Saving basic contract...');
      const btnGuardar = this.page.locator(this.selectors.btnGuardar).first();

      // Hacemos click sin esperar navegación inmediata para evitar race conditions
      await btnGuardar.click();

      // Esperamos activamente a que la URL cambie
      try {
        await this.page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 8000 });
        logger.info('✅ Navigation successful');
      } catch (e) {
        // Si no navegó, buscamos errores de validación
        const errors = await this.page.locator('.text-danger, .help-block, .alert-danger').allTextContents();
        if (errors.length > 0) {
          throw new Error(`Save Failed with Validation Errors: ${errors.join(' | ')}`);
        }
        // Si no hay errores visibles pero no navegó
        throw new Error('Save clicked but navigation did not occur and no validation errors found (stuck on create page).');
      }

      // 6. Extraer ID de la nueva URL
      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) return match[1];

      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';

      throw new Error(`Contract created but ID not found in URL pattern: ${currentUrl}`);

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  // --- MÉTODOS AUXILIARES ---

  /**
   * Cierra modales forzosamente usando jQuery/Vanilla JS
   * PUBLIC para poder llamarlo desde los tests si es necesario
   */
  public async forceCloseModal(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') {
        // @ts-ignore
        $('.modal').modal('hide');
      }
      const modals = document.querySelectorAll('.modal');
      modals.forEach(m => {
        (m as HTMLElement).style.display = 'none';
        m.classList.remove('show');
      });
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(300);
  }

  async addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding specific Route 715 and Cargo 715_19');

    // Asegurar limpieza antes de empezar
    await this.forceCloseModal();

    // 1. Abrir modal Rutas
    await this.page.click(this.selectors.btnAddRuta);
    await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 5000 });

    // 2. Seleccionar Ruta 715
    await this.page.click(this.selectors.btnRoute715);
    // Cerrar modal rutas explícitamente si no se cierra solo
    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    // 3. Abrir modal Cargas
    await this.page.click('#btn_click_715'); // Botón añadir carga
    await this.page.waitForTimeout(1000);

    // 4. Seleccionar Carga
    await this.page.click(this.selectors.btnCargo715_19);

    // 5. CERRAR MODALES ANTES DE LLENAR GRILLA
    await this.forceCloseModal();

    // 6. Llenar tarifas en la grilla
    logger.info(`Filling tariffs: C=${tarifaConductor}, V=${tarifaViaje}`);

    const inputCond = this.page.locator(this.selectors.inputTarifaConductor715);
    await inputCond.click();
    await inputCond.fill(tarifaConductor);
    await this.page.keyboard.press('Tab');

    const inputViaje = this.page.locator(this.selectors.inputTarifaViaje715);
    await inputViaje.click();
    await inputViaje.fill(tarifaViaje);
    await this.page.keyboard.press('Tab');

    // Disparar eventos de cálculo
    await this.page.evaluate(() => {
      document.querySelectorAll('input[id^="txt_tarifa_"]').forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    });

    await this.page.waitForTimeout(1000);
    logger.info('✅ Route and Cargo added');
  }

  /**
   * Método restaurado: Guarda el contrato finalmente y asegura que la operación termine.
   * Usado en la Fase 3 de contrato-crear.test.ts
   */
  async saveAndExtractId(): Promise<string> {
    logger.info('💾 Saving contract (Final Step)...');

    // 1. Limpieza de seguridad
    await this.forceCloseModal();

    // 2. Click en Guardar
    const saveBtn = this.page.locator(this.selectors.btnGuardar).first();
    await saveBtn.click();

    // 3. Esperar a que se procese
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    const currentUrl = this.page.url();
    logger.info(`Final Save URL: ${currentUrl}`);

    // 4. Intentar extraer ID
    const match = currentUrl.match(/\/contrato\/(?:ver|editar)\/(\d+)/);
    return match ? match[1] : '';
  }

  // Método legacy de relleno de formulario principal (mantener si se usa en otros tests)
  async fillMainForm(clienteName: string, transportistaRut: string, fechaInicio: string, fechaFin: string): Promise<void> {
    // Implementación legacy si se requiere
  }
}