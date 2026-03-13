import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('CapacidadPage');

export class CapacidadPage extends BasePage {
  private readonly selectors = {
    // Index Page
    indexGrid: '#table_capacities',
    btnCreate: 'a[href="/capacities/create"]',
    searchBox: '#search',
    btnSearch: '#buscar',
    
    // Create Page
    checkboxEsRango: '#is-range-checkbox',
    inputCapacidadInicial: '#capacidades-capacidad_inicial',
    inputCapacidadFinal: '#capacidades-capacidad_final',
    tipoCapacidadSelect: '#capacidades-tipo_capacidad_id',
    btnGuardar: 'button[type="submit"].btn-success',

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando al listado de Capacidades');
    await this.page.goto('/capacities/index');
    await this.page.waitForLoadState('networkidle');
    await this.page.locator(this.selectors.indexGrid).waitFor({ state: 'visible' });
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la creación de Capacidad');
    try {
      // Usar commit y luego esperar load/networkidle para mayor robustez ante ERR_ABORTED
      await this.page.goto('/capacities/create', { waitUntil: 'commit', timeout: 60000 });
      await this.page.waitForLoadState('load');
    } catch (error) {
      logger.warn('Error inicial navegando a creación, reintentando...', error);
      await this.page.goto('/capacities/create', { waitUntil: 'load', timeout: 60000 });
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.locator(this.selectors.inputCapacidadInicial).waitFor({ state: 'visible' });
  }

  async clickCrear(): Promise<void> {
    logger.info('Haciendo clic en el botón Crear Nueva Capacidad');
    await this.click(this.selectors.btnCreate);
  }

  async setEsRango(esRango: boolean): Promise<void> {
    logger.info(`Configurando 'Es Rango' a: ${esRango}`);
    const checkbox = this.page.locator(this.selectors.checkboxEsRango);
    const isChecked = await checkbox.isChecked();
    if (isChecked !== esRango) {
      await checkbox.click();
      // Brief wait for JS toggle logic to execute (toggleFields() in DOM)
      await this.page.waitForTimeout(500);
    }
  }

  async fillCapacidadInicial(valor: string): Promise<void> {
    logger.info(`Completando capacidad inicial: ${valor}`);
    await this.fill(this.selectors.inputCapacidadInicial, valor);
    
    // If NOT range, the application syncs Capacidad Final automatically via JS,
    // but it makes it readonly. We'll set it explicitly using evaluation to 
    // ensure backend consistency if JS sync fails or is slow.
    const isRange = await this.page.locator(this.selectors.checkboxEsRango).isChecked();
    if (!isRange) {
      logger.info('Modo valor único detected: Sincronizando capacidad final vía JS (readonly)');
      await this.page.locator(this.selectors.inputCapacidadFinal).evaluate((el: HTMLInputElement, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, valor);
    }
  }

  async fillCapacidadFinal(valor: string): Promise<void> {
    logger.info(`Completando capacidad final: ${valor}`);
    await this.fill(this.selectors.inputCapacidadFinal, valor);
  }

  async selectTipoCapacidad(tipo: string): Promise<void> {
    logger.info(`Seleccionando tipo de capacidad: ${tipo}`);
    try {
      // Confirmed via live inspection that this is a native select element
      await this.page.selectOption(this.selectors.tipoCapacidadSelect, { label: tipo });
      logger.info(`✅ Tipo de capacidad "${tipo}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tipo de capacidad: ${tipo}`, error);
      await this.takeScreenshot('select-tipo-capacidad-error');
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en el botón guardar');
    await this.click(this.selectors.btnGuardar);
    // Wait for redirection to index or some feedback - Aumentado a 30s para Demo
    await this.page.waitForURL(/\/capacities\/index/, { timeout: 30000 });
  }

  /**
   * Verifica si una capacidad es visible en el listado.
   * La aplicación muestra el formato "X a Y Z" para rangos (ej: "1 a 12 TON").
   */
  async isCapacidadVisible(capInicial: string, capFinal: string, tipo: string, esRango: boolean): Promise<boolean> {
    // Definir el patrón de búsqueda basado en cómo lo muestra la aplicación
    // Si es rango: "X a Y Z"
    // Si no es rango, es probable que también muestre "X a X Z" o simplemente "X Z"
    // Según el DOM dump, vemos "1 a 12 TON".
    
    let pattern;
    if (esRango) {
      pattern = `${capInicial} a ${capFinal} ${tipo}`;
    } else {
      // Probamos ambos patrones por si acaso
      pattern = `${capInicial} a ${capInicial} ${tipo}`;
    }

    logger.info(`Buscando capacidad "${pattern}" en el listado`);
    try {
      // Usar el searchbox personalizado (#search)
      const searchBox = this.page.locator(this.selectors.searchBox);
      const btnSearch = this.page.locator(this.selectors.btnSearch);
      
      if (await searchBox.isVisible()) {
        logger.info(`Usando searchbox para filtrar por: ${capInicial}`);
        await searchBox.fill(capInicial);
        await btnSearch.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2500); // Increasded from 1000 to 2500 for Demo stability
      } else {
        logger.warn('Searchbox no visible en el listado de capacidades');
      }

      const grid = this.page.locator(this.selectors.indexGrid);
      const rows = grid.locator('tbody tr');
      const count = await rows.count();
      logger.info(`Filas encontradas en el grid: ${count}`);

      if (count === 0) {
        await this.takeScreenshot('grid-vacio-capacidades');
        return false;
      }

      // Verificamos si alguna fila contiene el patrón esperado
      // Si no es rango, intentamos también el patrón simple
      const matchingRow = rows.filter({ hasText: pattern });
      let foundCount = await matchingRow.count();
      
      if (foundCount === 0 && !esRango) {
        const simplePattern = `${capInicial} ${tipo}`;
        logger.info(`No encontrado como "${pattern}", probando patrón simple: "${simplePattern}"`);
        const matchingSimple = rows.filter({ hasText: simplePattern });
        foundCount = await matchingSimple.count();
      }

      logger.info(`Coincidencias encontradas: ${foundCount}`);
      
      if (foundCount === 0) {
        // Log what we DO see in the table for debugging
        const firstRowText = await rows.first().innerText().catch(() => 'no data');
        logger.info(`Texto de la primera fila encontrada: "${firstRowText.replace(/\n/g, ' | ')}"`);
      }

      return foundCount > 0;
    } catch (error) {
      logger.error(`Error al verificar visibilidad de capacidad. Pattern: "${pattern}"`, error);
      return false;
    }
  }
}
