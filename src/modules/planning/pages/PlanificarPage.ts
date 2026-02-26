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
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navigating to Planificar Viajes page');
    await this.page.goto('/viajes/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // --- MÉTODOS DE LLENADO SIMPLE ---

  async fillNroViaje(nro?: string): Promise<void> {
    const nroViaje = nro || String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`Filling Nro Viaje: ${nroViaje}`);
    await this.fill(this.selectors.nroViaje, nroViaje);
  }

  async fillNumeroPlanilla(numero: string): Promise<void> {
    await this.fill(this.selectors.numeroPlanilla, numero);
  }

  async fillValorFlete(valor: string): Promise<void> {
    await this.fill(this.selectors.valorFlete, valor);
  }

  // --- ESTRATEGIA DE SELECCIÓN NATIVA (Click UI + Scoped Selector) ---

  private async selectBootstrapDropdown(buttonSelector: string, textToSelect?: string, fieldName: string = 'Dropdown'): Promise<void> {
    logger.info(`Selecting ${fieldName}: "${textToSelect || 'First available'}"`);
    try {
      if (!(await this.isVisible(buttonSelector))) return;
      const btn = this.page.locator(buttonSelector);
      await btn.scrollIntoViewIfNeeded();
      await btn.click(); 

      const parent = btn.locator('xpath=..');
      const dropdownMenu = parent.locator('div.dropdown-menu.show').first();

      await dropdownMenu.waitFor({ state: 'visible' });

      if (textToSelect) {
        const searchBox = dropdownMenu.locator('.bs-searchbox input');

        if (await searchBox.isVisible()) {
          await searchBox.fill(textToSelect);
          await this.page.waitForTimeout(500); 

          const noResults = await dropdownMenu.locator('.no-results').isVisible();
          if (noResults) {
            logger.warn(`Search for "${textToSelect}" yielded no results in ${fieldName}. Trying direct click...`);
            await searchBox.clear();
            await this.page.waitForTimeout(300);
            const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
            if (await option.isVisible()) {
              await option.click();
            } else {
              throw new Error(`Option "${textToSelect}" not found in ${fieldName}`);
            }
          } else {
            await this.page.keyboard.press('Enter');
          }
        } else {
          const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
          await option.click();
        }
      } else {
        const firstOption = dropdownMenu.locator('li:not(.hidden):not(.disabled) a').first();
        await firstOption.click();
      }

      if (await dropdownMenu.isVisible()) {
        await this.page.keyboard.press('Escape');
      }

      await this.page.waitForTimeout(300);

    } catch (error) {
      logger.error(`Failed to select ${fieldName}`, error);
      throw error;
    }
  }

  // --- IMPLEMENTACIÓN DE SELECTS ---

  async selectTipoOperacion(tipo: string = 'tclp2210'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoOperacion, tipo, 'Tipo Operacion');
  }

  async selectTipoServicio(tipo: string = 'tclp2210'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoServicio, tipo, 'Tipo Servicio');
  }

  async selectTipoViaje(tipo: string = 'Normal'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoViaje, tipo, 'Tipo Viaje');
  }

  async selectUnidadNegocio(unidad: string = 'Defecto'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnUnidadNegocio, unidad, 'Unidad Negocio');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCliente(cliente: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnCliente, cliente, 'Cliente');
    logger.info('Waiting for cascading updates...');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCodigoCarga(carga?: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnCodigoCarga, carga, 'Codigo Carga');
    await this.page.keyboard.press('Tab');
    logger.info('Waiting for route calculation...');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // --- MÉTODOS DE RUTA ---

  async agregarRuta(numeroRuta: string): Promise<void> {
    if (isDemoMode()) {
      logger.info('Skipping "agregarRuta" in DEMO mode as it is not supported in this environment.');
      return;
    }

    logger.info(`Adding ruta: ${numeroRuta}`);
    if (!(await this.isVisible(this.selectors.btnAgregarRuta))) return;
    const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

    try {
      await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
      await btnAgregar.click();
      await this.page.waitForTimeout(1000);

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
    } catch (e) {
      logger.error('Failed in agregarRuta', e);
      throw e;
    }
  }

  // --- ORIGEN Y DESTINO ---

  async selectOrigen(origen: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnOrigen, origen, 'Origen');
  }

  async selectDestino(destino: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnDestino, destino, 'Destino');
  }

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar button...');
    await this.click(this.selectors.btnGuardar);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async isFormSaved(): Promise<boolean> {
    const successToast = this.page.locator('text="Viaje Creado con éxito"').first();
    if (await successToast.isVisible()) {
      return true;
    }
    const nroViajeVal = await this.page.locator(this.selectors.nroViaje).inputValue();
    if (nroViajeVal === '') {
      return true;
    }
    if (!this.page.url().includes('/crear')) {
      return true;
    }
    return false;
  }
}
