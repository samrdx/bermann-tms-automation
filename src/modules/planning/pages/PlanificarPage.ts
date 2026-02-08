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

  // --- ESTRATEGIA DE SELECCIÓN NATIVA (Click UI + Search) ---
  
  /**
   * Selecciona una opción en un dropdown Bootstrap.
   * Estrategia: Click botón -> Esperar menú -> Escribir en buscador -> Enter
   */
  private async selectBootstrapDropdown(buttonSelector: string, textToSelect?: string, fieldName: string = 'Dropdown'): Promise<void> {
    logger.info(`Selecting ${fieldName}: "${textToSelect || 'First available'}"`);
    try {
        const btn = this.page.locator(buttonSelector);
        await btn.waitFor({ state: 'visible' });
        await btn.scrollIntoViewIfNeeded();
        await btn.click(); // Abrir menú

        const dropdownMenu = this.page.locator('.dropdown-menu.show');
        await dropdownMenu.waitFor({ state: 'visible' });

        if (textToSelect) {
            // Estrategia Principal: Usar el buscador interno del dropdown
            const searchBox = dropdownMenu.locator('.bs-searchbox input');
            
            if (await searchBox.isVisible()) {
                await searchBox.fill(textToSelect);
                await this.page.waitForTimeout(500); // Esperar filtrado
                
                // Verificar si hay resultados
                const noResults = await dropdownMenu.locator('.no-results').isVisible();
                if (noResults) {
                     // Fallback: Si no encuentra por búsqueda (ej. tclp2210 no es buscable),
                     // intentamos buscar por texto exacto en las opciones visibles
                     logger.warn(`Search for "${textToSelect}" yielded no results. Trying direct text match...`);
                     await searchBox.clear();
                     await this.page.waitForTimeout(300);
                     const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
                     if (await option.isVisible()) {
                         await option.click();
                     } else {
                         throw new Error(`Option "${textToSelect}" not found in ${fieldName}`);
                     }
                } else {
                    // Si hay resultados, seleccionamos el primero (o presionamos Enter)
                    await this.page.keyboard.press('Enter');
                }
            } else {
                // Si no hay buscador, click directo en texto
                const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
                await option.click();
            }
        } else {
            // Seleccionar el primero disponible
            const firstOption = dropdownMenu.locator('li:not(.hidden):not(.disabled) a').first();
            await firstOption.click();
        }
        
        // Cerrar menú si quedó abierto (seguridad)
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
    // Buscará "tclp2210" en la caja de búsqueda del dropdown
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
    
    // CRÍTICO: Disparar evento TAB para forzar validación y cálculo de rutas
    await this.page.keyboard.press('Tab');
    
    logger.info('Waiting for route calculation...');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); 
  }

  // --- MÉTODOS DE RUTA ---

  async agregarRuta(numeroRuta: string): Promise<void> {
    logger.info(`Adding ruta: ${numeroRuta}`);
    const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

    try {
       await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
    } catch (e) {
       // Diagnóstico visual si falla
       await this.page.screenshot({ path: `reports/screenshots/agregar-ruta-disabled-${Date.now()}.png` });
       throw new Error(`Timeout: "Agregar Ruta" button never became enabled. Check if contract has valid routes.`);
    }

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

  // --- VERIFICACIÓN FINAL ---

  async verifyInAsignar(nroViaje: string): Promise<boolean> {
    logger.info(`Verifying viaje ${nroViaje} in /viajes/asignar`);

    try {
      await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/asignar');
      await this.page.waitForLoadState('networkidle');

      // Usar el buscador de la grilla si existe
      const searchInput = this.page.locator('input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(nroViaje);
        await this.page.waitForTimeout(1500); // Esperar filtrado
      }

      // Buscar el Nro de Viaje en la tabla visible
      const row = this.page.locator('table tbody tr').filter({ hasText: nroViaje }).first();
      
      const isVisible = await row.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
          logger.info(`✅ Viaje ${nroViaje} found in Asignar grid`);
          return true;
      } else {
          logger.warn(`⚠️ Viaje ${nroViaje} NOT found in Asignar grid`);
          return false;
      }

    } catch (error) {
      logger.error('Failed to verify in asignar', error);
      return false;
    }
  }
}