import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PlanificarViajesPage');

export class PlanificarPage extends BasePage {
  private readonly selectors = {
    // Inputs Simples
    nroViaje: '#viajes-nro_viaje',
    numeroPlanilla: '#viajes-numero_planilla',
    valorFlete: '#viajes-valor_flete',

    // Botones de Dropdowns (Bootstrap Select)
    // Usamos data-id para identificar el botón que abre el menú
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
    await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/crear');
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

  // --- NUEVA ESTRATEGIA: SELECCIÓN NATIVA (Click UI) ---

  /**
   * Método universal para interactuar con Dropdowns de Bootstrap
   * 1. Hace click en el botón del dropdown.
   * 2. Espera a que el menú se abra.
   * 3. Busca la opción por texto o selecciona la primera disponible.
   */
  private async selectBootstrapDropdown(buttonSelector: string, textToSelect?: string, fieldName: string = 'Dropdown'): Promise<void> {
    logger.info(`Selecting ${fieldName}...`);
    try {
      const btn = this.page.locator(buttonSelector);
      await btn.waitFor({ state: 'visible' });
      await btn.click(); // Abrir menú

      const dropdownMenu = this.page.locator('.dropdown-menu.show');
      await dropdownMenu.waitFor({ state: 'visible' });

      if (textToSelect) {
        // Opción A: Buscar por texto específico
        // Usamos una búsqueda laxa para evitar problemas con espacios
        const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
        if (await option.isVisible()) {
          await option.click();
          logger.info(`✅ ${fieldName}: Selected "${textToSelect}"`);
        } else {
          // Si no encuentra el texto exacto, intenta búsqueda por teclado (si hay searchbox)
          const searchBox = dropdownMenu.locator('.bs-searchbox input');
          if (await searchBox.isVisible()) {
            await searchBox.fill(textToSelect);
            await this.page.waitForTimeout(500);
            await this.page.keyboard.press('Enter');
            logger.info(`✅ ${fieldName}: Selected via search "${textToSelect}"`);
          } else {
            throw new Error(`Option "${textToSelect}" not found in ${fieldName}`);
          }
        }
      } else {
        // Opción B: Seleccionar el primero disponible (que no esté oculto)
        const firstOption = dropdownMenu.locator('li:not(.hidden):not(.disabled) a').first();
        await firstOption.click();
        logger.info(`✅ ${fieldName}: Selected first available option`);
      }

      // Pequeña pausa para animaciones y validaciones
      await this.page.waitForTimeout(300);

    } catch (error) {
      logger.error(`Failed to select ${fieldName}`, error);
      throw error;
    }
  }

  // --- IMPLEMENTACIÓN DE SELECTS USANDO UI NATIVA ---

  async selectTipoOperacion(tipo: string = 'tclp2210'): Promise<void> {
    // Mapeo rápido si el texto visual difiere del valor interno, 
    // pero intentaremos seleccionar por texto parcial que suele funcionar.
    await this.selectBootstrapDropdown(this.selectors.btnTipoOperacion, tipo, 'Tipo Operacion');
  }

  async selectTipoServicio(tipo: string = 'tclp2210'): Promise<void> {
    // Si 'tclp2210' es un código interno y no texto visible, 
    // ajusta esto al TEXTO que ve el usuario (ej. "Transporte Local")
    await this.selectBootstrapDropdown(this.selectors.btnTipoServicio, tipo, 'Tipo Servicio');
  }

  async selectTipoViaje(tipo: string = 'Normal'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnTipoViaje, tipo, 'Tipo Viaje');
  }

  async selectUnidadNegocio(unidad: string = 'Defecto'): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnUnidadNegocio, unidad, 'Unidad Negocio');
    // Esperar cascada (carga de contratos/configuraciones)
    await this.page.waitForLoadState('networkidle');
  }

  async selectCliente(cliente: string): Promise<void> {
    logger.info(`Selecting Cliente: ${cliente}`);
    // Reusamos la lógica nativa, aprovechando el buscador si existe
    await this.selectBootstrapDropdown(this.selectors.btnCliente, cliente, 'Cliente');

    // Esperar a que la cascada habilite el siguiente campo (Código Carga)
    logger.info('Waiting for cascading updates...');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCodigoCarga(carga?: string): Promise<void> {
    // Este es el que fallaba antes. Ahora usará click real.
    await this.selectBootstrapDropdown(this.selectors.btnCodigoCarga, carga, 'Codigo Carga');

    // CRÍTICO: Disparar evento de teclado para forzar validación y cálculo de rutas
    await this.page.keyboard.press('Tab');

    logger.info('Waiting for route calculation...');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Tiempo para que el botón "Agregar Ruta" se habilite
  }

  // --- MÉTODOS DE RUTA (Sin cambios mayores, solo esperas) ---

  async agregarRuta(numeroRuta: string): Promise<void> {
    logger.info(`Adding ruta: ${numeroRuta}`);
    const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

    // Esperar a que el botón se habilite (ahora debería funcionar porque Codigo Carga se seleccionó bien)
    try {
      await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
    } catch (e) {
      throw new Error(`Timeout: "Agregar Ruta" button never became enabled. The previous form fields (Tipo Operacion, Servicio, Carga) might be empty or invalid.`);
    }

    await btnAgregar.click();
    await this.page.waitForTimeout(1000);

    // Buscar en la tabla
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

  // --- ORIGEN Y DESTINO ---

  async selectOrigen(origen: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnOrigen, origen, 'Origen');
  }

  async selectDestino(destino: string): Promise<void> {
    await this.selectBootstrapDropdown(this.selectors.btnDestino, destino, 'Destino');
  }

  // --- GUARDAR ---

  async clickGuardar(): Promise<void> {
    await this.page.click(this.selectors.btnGuardar);
    await this.page.waitForLoadState('networkidle');
  }

  async isFormSaved(): Promise<boolean> {
    return !(this.page.url().includes('/crear'));
  }
}