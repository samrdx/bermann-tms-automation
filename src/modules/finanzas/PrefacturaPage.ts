import { BasePage } from '../../core/BasePage.js';
import { Page } from '@playwright/test';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('PrefacturaPage');

export class PrefacturaPage extends BasePage {
  private readonly selectors = {
    crear: {
      fechaDesdeInput: '#desde',
      fechaHastaInput: '#hasta',
      tipoDropdownBtn: 'button[data-id="tipo"]',
      clienteDropdownBtn: 'button[data-id="prefactura-cliente_id"]',
      monedaDropdownBtn: 'button[data-id="drop_currecy_type"]',
      ivaDropdownBtn: 'button[data-id="drop_include_tax"]',
      btnProcesar: 'button:has-text("Buscar viajes")', 
      btnAgregar: 'button.btn-success, button:has-text("Agregar"), button:has-text(""), button i.fa-check',
      tablaViajesFilas: 'table tbody tr',
      btnGuardar: 'button#btn_guardar',
      successMessage: 'text="Prefactura creada con éxito"'
    },
    index: {
      clienteDropdownBtn: 'button[data-id="cliente"]',
      btnBuscar: 'button.btn-success.mt-2:has-text("Buscar"), button[onclick="getGridPreInvoice()"], button.btn-success:has-text("Buscar")',
      tablaPrefacturas: 'table#tabla-prefactura',
      filasPrefactura: 'table#tabla-prefactura tbody tr',
    }
  };

  constructor(page: Page) {
    super(page);
  }

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  async navigateToCrear(): Promise<void> {
    logger.info('Navegando a /prefactura/crear');
    await this.page.goto('/prefactura/crear');
    await this.waitForElement(this.selectors.crear.btnProcesar);
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando a /prefactura/index');
    await this.page.goto('/prefactura/index');
    await this.waitForElement(this.selectors.index.tablaPrefacturas);
  }

  // ==========================================
  // OPERACIONES EN /CREAR
  // ==========================================

  /**
   * Completa el formulario de prefactura buscando los viajes finalizados de un cliente.
   */
  async filtrarViajesPorCliente(clienteName: string): Promise<void> {
    logger.info(`Buscando viajes para el cliente: ${clienteName}`);

    // Asegurar rango de fechas amplio (Desde: 01/01/2026) usando evaluate por robustez
    logger.info('Asegurando rango de fechas...');
    await this.page.locator('#desde').click();
    await this.page.locator('#desde').fill('01/01/2026');
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(500);

    // Fallback: Click and type if evaluate didn't seem to work (wait a bit)
    await this.page.waitForTimeout(500);

    // Tipo
    await this.selectBootstrapOption('tipo', 'Clientes');

    // Cliente (con búsqueda, Pattern 3 del TMS dropdowns)
    await this.selectBootstrapDropdownWithSearch('prefactura-cliente_id', clienteName);

    // 2. Esperar a que se carguen dependencias (Moneda)
    await this.page.waitForTimeout(2000);

    // 3. Seleccionar Tipo de Moneda (Pesos Chilenos) - Usamos búsqueda por robustez
    await this.selectBootstrapDropdownWithSearch('drop_currecy_type', 'Pesos Chilenos');
    
    // 4. Seleccionar Incluye IVA (Si)
    await this.selectBootstrapOption('drop_include_tax', 'Si');
    
    // 5. Procesar
    await this.page.locator(this.selectors.crear.btnProcesar).click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);
    // Esperar a que la tabla se cargue (AJAX) - Wait for content OR no results
    logger.info('Esperando resultados en la grilla (Firefox Robust Wait)...');
    
    await this.page.waitForFunction(() => {
        const table = document.querySelector('table');
        const hasRows = table && table.querySelectorAll('tbody tr').length > 0;
        const noResults = document.body.innerText.includes('No existen viajes');
        return hasRows || noResults;
    }, { timeout: 20000 }).catch(() => {
        logger.warn('Tiempo de espera agotado esperando resultados de la grilla');
    });

    // Verificar si aparece el mensaje "No existen viajes"
    const noResultsText = await this.page.locator('text=/No existen viajes/i').isVisible();
    if (noResultsText) {
        const browserName = this.page.context().browser()?.browserType().name() || 'unknown';
        const errorMsg = `❌ No se encontraron viajes para prefacturar con los filtros aplicados (${browserName}).`;
        logger.error(errorMsg);
        await this.takeScreenshot(`error-no-viajes-${browserName}`);
        throw new Error(errorMsg);
    }
    
    await this.waitForElement(this.selectors.crear.btnAgregar, 15000);
  }

  /**
   * Genera la prefactura para los viajes listados
   */
  async generarPrefactura(): Promise<void> {
    logger.info('Generando prefactura para el viaje cargado...');
    
    // Validar que exista al menos una fila en el grid de viajes (excluyendo el grid de resumen si hubiera)
    const rowCount = await this.page.locator(this.selectors.crear.tablaViajesFilas).count();
    if (rowCount === 0) {
      throw new Error('No hay viajes en la tabla para prefacturar.');
    }

    // Seleccionar el viaje y agregarlo (clic en "btn agregar")
    logger.info('Haciendo clic en "btn agregar"');
    const btnAgregar = this.page.locator(this.selectors.crear.btnAgregar).first();
    await btnAgregar.waitFor({ state: 'visible', timeout: 5000 });
    await btnAgregar.click();

    await this.page.waitForTimeout(500); // Esperar a que se asigne al bloque inferior

    // Clic en Guardar
    logger.info('Haciendo clic en Guardar');
    await this.click(this.selectors.crear.btnGuardar);

    // Validar SweetAlert o msj de éxito y la redirección
    logger.info('Esperando redirección automática a /prefactura/index y mensaje de éxito');
    await this.page.waitForURL('**/prefactura/index*', { timeout: 15000 });
    
    // Validar mensaje
    const successMsg = this.page.locator('text=/Prefactura creada con \\w*/i').first(); 
    await successMsg.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
        logger.warn('Mensaje de éxito no se mostró como texto, verificando redirección solamente...');
    });
  }

  // ==========================================
  // OPERACIONES EN /INDEX
  // ==========================================

  /**
   * Busca prefacturas en el index y retorna el ID de la primera encontrada
   */
  async buscarPrefacturaEnIndex(clienteName: string): Promise<string> {
    logger.info(`Buscando prefacturas para el cliente: ${clienteName} en /index`);
    
    // Filtrar por cliente
    await this.selectBootstrapDropdownWithSearch('cliente', clienteName);

    // Buscar (Botón Success mt-2 según observación del usuario)
    logger.info('Haciendo clic en botón Buscar (Index)');
    await this.click(this.selectors.index.btnBuscar);
    
    // Esperar a que la tabla se actualice
    await this.page.waitForTimeout(3000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    // Validar que la tabla tiene registros
    const count = await this.page.locator(this.selectors.index.filasPrefactura).count();
    if (count === 0) {
      throw new Error(`Visualización fallida: No se encontraron prefacturas para el cliente ${clienteName}`);
    }

    // Extraer el ID (Primera columna del primer row)
    const firstRowId = await this.page.locator(`${this.selectors.index.filasPrefactura}:first-child td`).first().textContent();
    const id = firstRowId?.trim() || 'N/A';
    
    logger.info(`Se encontraron ${count} registros. ID de la primera prefactura: [${id}]`);
    return id;
  }

  // ==========================================
  // HELPERS INTERNOS PARA BOOTSTRAP SELECT
  // ==========================================

  /**
   * Helper para select simples (< 20 options) usando JS fallback si falla la UI
   */
  private async selectBootstrapOption(dataId: string, value: string): Promise<void> {
    try {
      const btn = this.page.locator(`button[data-id="${dataId}"]`);
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      
      /* Removed return early for Firefox robustness - always click to ensure events trigger */
      await btn.click();
      await this.page.waitForTimeout(1000); // Wait for menu to show
      
      // Intentar encontrar la opción de forma robusta
      const option = this.page.locator(`div.show button[data-id="${dataId}"] + .dropdown-menu .dropdown-item, .dropdown.show .dropdown-item, .dropdown.show li a`)
        .filter({ hasText: new RegExp(`^${value}$`, 'i') })
        .first();

      if (await option.isVisible({ timeout: 3000 })) {
          await option.click();
          await this.page.waitForTimeout(500);
      } else {
          throw new Error(`Opción "${value}" no visible en dropdown "${dataId}"`);
      }
    } catch (e: any) {
      logger.warn(`selectBootstrapOption falló para "${dataId}" con valor "${value}": ${e.message}, usando fallback JS...`);
      await this.page.evaluate(({ id, text }) => {
        const select = (document.getElementById(id) || document.querySelector(`select[name="${id}"]`) || document.querySelector(`select#${id}`)) as HTMLSelectElement;
        if (!select) return;
        
        const opt = Array.from(select.options).find(o => o.text.trim().toLowerCase() === text.trim().toLowerCase());
        if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            // @ts-ignore
            if (window.jQuery && window.jQuery(select).selectpicker) {
              // @ts-ignore
              window.jQuery(select).selectpicker('refresh');
            }
        }
      }, { id: dataId, text: value });
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Helper robusto para dropdowns con búsqueda (Search pattern)
   */
  private async selectBootstrapDropdownWithSearch(dataId: string, textToSelect: string): Promise<void> {
    try {
      const dropdownBtn = this.page.locator(`button[data-id="${dataId}"]`);
      await dropdownBtn.click();
      await this.page.waitForTimeout(300);
      
      const searchInput = this.page.locator('.dropdown-menu.show .bs-searchbox input').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(textToSelect);
        await this.page.waitForTimeout(500);
      }
      
      const option = this.page.locator('.dropdown-menu.show li a, .dropdown-menu.show button.dropdown-item')
        .filter({ hasText: new RegExp(textToSelect, 'i') })
        .first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      logger.info(`Seleccionando opción: ${await option.textContent()}`);
      await option.click();
    } catch (e) {
      logger.warn(`selectBootstrapDropdownWithSearch falló para el data-id "${dataId}", usando fallback JS: ${e}`);
      await this.page.evaluate(({ id, text }) => {
        const select = document.getElementById(id) as HTMLSelectElement;
        if (!select) return;
        const opt = Array.from(select.options).find(o => o.text.trim().includes(text.trim()));
        if (opt) {
          select.value = opt.value;
          // @ts-ignore
          if (window.jQuery) {
              // @ts-ignore
              window.jQuery(select).selectpicker('refresh');
              // @ts-ignore
              window.jQuery(select).trigger('change');
          }
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, { id: dataId, text: textToSelect });
      await this.page.waitForTimeout(2000); // Wait more for AJAX cascade
    }
  }
}
