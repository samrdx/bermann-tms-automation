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
      divViajes: '#div_viajes',
      tipoServicioProformaSelect: '#tipo_servicio_proforma',
      tipoServicioProformaBtn: 'button[data-id="tipo_servicio_proforma"]',
      btnAgregarViajeProforma: 'button[title="agregar"]',
      btnAgregar: 'button.btn-success, button:has-text("Agregar"), button:has-text(""), button i.fa-check',
      tablaViajesFilas: 'table tbody tr',
      btnGuardar: 'button#btn_guardar',
      successMessage: 'text="Prefactura creada con éxito"'
    },
    index: {
      clienteDropdownBtn: 'button[data-id="cliente"]',
      btnBuscar: 'button.btn-success.mt-2:has-text("Buscar"), button[onclick="getGridPreInvoice()"], button.btn-success:has-text("Buscar")',
      tablaPrefacturas: 'div.dataTables_wrapper table, table#tabla-prefactura',
      filasPrefactura: 'div.dataTables_wrapper table tbody tr, table#tabla-prefactura tbody tr',
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

  async navigateToProformaCrear(): Promise<void> {
    logger.info('🧾 Navegando a /proforma/crear');
    await this.page.goto('/proforma/crear');
    await this.waitForElement(this.selectors.crear.btnProcesar);
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando a /prefactura/index');
    await this.page.goto('/prefactura/index');
    await this.waitForElement(this.selectors.index.tablaPrefacturas);
  }

  async navigateToProformaIndex(): Promise<void> {
    logger.info('🧾 Navegando a /proforma/index');
    await this.page.goto('/proforma/index');
    await this.page.waitForSelector('text=/Listado Proforma/i', { state: 'visible', timeout: 15000 });
    await this.page.waitForSelector('div.dataTables_wrapper table', { state: 'visible', timeout: 15000 });
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
    
    await this.page.evaluate(() => {
        const desde = document.getElementById('desde') as HTMLInputElement;
        if (desde) {
            desde.value = '01/01/2026';
            desde.dispatchEvent(new Event('input', { bubbles: true }));
            desde.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }).catch((e: unknown) => logger.warn(`No se pudo usar JS para #desde: ${String(e)}`));
    
    await this.page.locator('#desde').fill('01/01/2026', { force: true }).catch(() => {});
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Escape'); // Cerramos cualquier datepicker que pueda quedar abierto
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

  async filtrarViajesPorTransportista(transportistaName: string): Promise<void> {
    logger.info(`🚚 Buscando viajes para transportista: ${transportistaName}`);

    await this.page.evaluate(() => {
      const desde = document.getElementById('desde') as HTMLInputElement | null;
      if (desde) {
        desde.value = '01/01/2026';
        desde.dispatchEvent(new Event('input', { bubbles: true }));
        desde.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }).catch((error: unknown) => logger.warn(`No se pudo establecer #desde con JS: ${String(error)}`));

    await this.page.locator('#desde').fill('01/01/2026', { force: true }).catch(() => {});
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);

    await this.selectBootstrapOption('tipo', 'Transportistas');
    logger.success('Entidad seleccionada: Transportistas ✅');

    await this.selectBootstrapDropdownByDataIdsWithSearch(
      ['proforma-transportista_id', 'prefactura-transportista_id', 'transportista_id', 'prefactura-cliente_id'],
      transportistaName,
    );

    await this.page.waitForTimeout(1200);
    await this.selectRequiredBootstrapDropdown('drop_currecy_type', 'Pesos Chilenos', 'Tipo de Moneda');
    await this.selectRequiredBootstrapDropdown('drop_include_tax', 'Si', 'Incluye IVA');

    await this.page.locator(this.selectors.crear.btnProcesar).click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.waitForTransportistasGridLoaded({ timeoutMs: 25000 });

    await this.waitForProformaTripsSectionVisible();
    await this.selectTipoServicioProforma('defecto');

    const noResultsText = await this.page.locator('text=/No existen viajes/i').isVisible();
    if (noResultsText) {
      const errorMsg = `❌ No se encontraron viajes para proformar con transportista ${transportistaName}`;
      logger.error(errorMsg);
      await this.takeScreenshot('proforma-no-viajes-transportista');
      throw new Error(errorMsg);
    }

    await this.waitForElement(this.selectors.crear.btnAgregar, 15000);
  }

  async waitForTransportistasGridLoaded(options?: { timeoutMs?: number }): Promise<void> {
    const timeoutMs = options?.timeoutMs ?? 20000;
    logger.info('⏳ Esperando carga web-first de grilla de transportistas...');

    await this.page.waitForFunction(() => {
      const hasRows = document.querySelectorAll('table tbody tr').length > 0;
      const hasNoResults = /No existen viajes/i.test(document.body.innerText);
      return hasRows || hasNoResults;
    }, { timeout: timeoutMs });

    logger.success('Grilla de transportistas cargada correctamente');
  }

  async assertGuardarDisabledWithoutViajes(): Promise<void> {
    logger.info('🧪 Validando Guardar bloqueado sin viajes seleccionados...');
    const guardarBtn = this.page.locator(this.selectors.crear.btnGuardar).first();

    const disabledSignals = await guardarBtn
      .evaluate((element: Element) => {
        const htmlElement = element as HTMLElement;
        const nativeDisabled = element.hasAttribute('disabled');
        const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
        const classDisabled = htmlElement.classList.contains('disabled');
        return nativeDisabled || ariaDisabled || classDisabled;
      })
      .catch(() => false);

    if (disabledSignals) {
      logger.success('Validación OK: Guardar deshabilitado sin viajes');
      return;
    }

    logger.warn('Guardar aparece habilitado; validando bloqueo funcional...');
    const previousUrl = this.page.url();
    await guardarBtn.click();
    await this.page.waitForTimeout(1200);
    const currentUrl = this.page.url();

    const redirectedToIndex = /\/proforma\/index/i.test(currentUrl);
    if (redirectedToIndex && currentUrl !== previousUrl) {
      await this.takeScreenshot('proforma-guardar-permite-guardar-sin-viajes');
      throw new Error('Guardar permitió finalizar sin viajes seleccionados.');
    }

    logger.success('Validación OK: sin viajes, guardado bloqueado funcionalmente');
  }

  async seleccionarPrimerViajeParaProforma(): Promise<void> {
    logger.info('➕ Seleccionando primer viaje para proforma...');
    const btnAgregarProforma = this.page.locator(this.selectors.crear.btnAgregarViajeProforma).first();
    const usarBotonProforma = await btnAgregarProforma.isVisible().catch(() => false);
    const btnAgregar = usarBotonProforma
      ? btnAgregarProforma
      : this.page.locator(this.selectors.crear.btnAgregar).first();

    await btnAgregar.waitFor({ state: 'visible', timeout: 10000 });
    await btnAgregar.click();
    await this.page.waitForTimeout(500);
    logger.success('Primer viaje agregado a proforma');
  }

  async generarProforma(): Promise<void> {
    logger.info('🧾 Generando proforma para viaje seleccionado...');

    await this.assertProformaRequiredFieldsReady();

    const rowCount = await this.page.locator(this.selectors.crear.tablaViajesFilas).count();
    if (rowCount === 0) {
      throw new Error('No hay viajes en la tabla para proformar.');
    }

    await this.seleccionarPrimerViajeParaProforma();
    await this.click(this.selectors.crear.btnGuardar);

    logger.info('⏳ Esperando confirmación de generación de proforma...');
    const reachedIndex = this.page.waitForURL('**/proforma/index*', { timeout: 25000 });
    const successToast = this.page
      .locator('text=/Proforma creada con|éxito|correctamente/i')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 });

    try {
      await Promise.any([reachedIndex, successToast]);
    } catch {
      await this.takeScreenshot('proforma-sin-confirmacion-exito');
      logger.warn('No hubo señal visual de éxito inmediata. Se validará existencia en /proforma/index en el siguiente paso.');
    }

    logger.success('Proforma generada correctamente');
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
    const rows = this.page.locator(this.selectors.index.filasPrefactura).filter({ hasNotText: /Ningún dato disponible/i });
    const count = await rows.count();
    if (count === 0) {
      throw new Error(`Visualización fallida: No se encontraron prefacturas para el cliente ${clienteName}`);
    }

    // Extraer el ID (Primera columna del primer row)
    const firstRowId = await rows.first().locator('td').first().textContent();
    const id = firstRowId?.trim() || 'N/A';
    
    logger.info(`Se encontraron ${count} registros. ID de la primera prefactura: [${id}]`);
    return id;
  }

  async buscarProformaEnIndexPorTransportista(transportistaName: string): Promise<string> {
    logger.info(`🔎 Buscando proformas para transportista: ${transportistaName}`);

    if (!/\/proforma\/index/i.test(this.page.url())) {
      await this.navigateToProformaIndex();
    }

    await this.selectBootstrapDropdownByDataIdsWithSearch(
      ['proforma-transportista_id', 'prefactura-transportista_id', 'transportista', 'cliente'],
      transportistaName,
      false,
    );

    const btnBuscar = this.page.locator(this.selectors.index.btnBuscar).first();
    if (await btnBuscar.isVisible().catch(() => false)) {
      await btnBuscar.click();
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.waitForProformaIndexGridLoaded({ timeoutMs: 15000 });

    const rows = this.page.locator(this.selectors.index.filasPrefactura).filter({ hasNotText: /Ningún dato disponible/i });
    const count = await rows.count();
    if (count === 0) {
      throw new Error(`No se encontraron proformas para transportista ${transportistaName}`);
    }

    const rowWithTransportista = rows.filter({ hasText: new RegExp(transportistaName, 'i') }).first();
    const selectedRow = (await rowWithTransportista.count()) > 0 ? rowWithTransportista : rows.first();

    const firstRowId = await selectedRow.locator('td').first().textContent();
    const id = firstRowId?.trim() || 'N/A';

    logger.success(`Proforma encontrada. ID: ${id}`);
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
      await this.page.evaluate(({ id, text }: { id: string; text: string }) => {
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
      const dropdownBtn = this.page.locator(`button[data-id="${dataId}"]`).first();
      const container = this.page.locator('div.bootstrap-select').filter({ has: dropdownBtn }).first();

      await dropdownBtn.waitFor({ state: 'visible', timeout: 5000 });
      await dropdownBtn.click();
      await this.page.waitForTimeout(300);

      const menu = container.locator('div.dropdown-menu').first();
      await menu.waitFor({ state: 'visible', timeout: 5000 });
      
      const searchInput = menu.locator('.bs-searchbox input').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(textToSelect);
        await this.page.waitForTimeout(500);
      }
      
      const option = menu.locator('li:not(.disabled) a, button.dropdown-item')
        .filter({ hasText: new RegExp(textToSelect, 'i') })
        .first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      logger.info(`Seleccionando opción: ${await option.textContent()}`);
      await option.click();

      const synced = await this.page.evaluate(({ id, text }: { id: string; text: string }) => {
        const normalize = (value: string) => value.trim().toLowerCase();

        const button = document.querySelector(`button[data-id="${id}"]`) as HTMLButtonElement | null;
        const containerNode = button?.closest('.bootstrap-select') as HTMLElement | null;
        const select = containerNode?.querySelector('select') as HTMLSelectElement | null;

        if (!select) {
          return { ok: false, reason: 'select-not-found' };
        }

        const options = Array.from(select.options);
        const desired = normalize(text);
        let target = options.find((option) => normalize(option.text) === desired);
        if (!target) {
          target = options.find((option) => normalize(option.text).includes(desired));
        }

        if (!target) {
          return { ok: false, reason: 'option-not-found' };
        }

        select.value = target.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));

        // @ts-ignore
        const $ = window.jQuery;
        if ($ && $(select).selectpicker) {
          // @ts-ignore
          $(select).selectpicker('val', target.value);
          // @ts-ignore
          $(select).selectpicker('refresh');
          // @ts-ignore
          $(select).trigger('change');
        }

        const selectedText = select.options[select.selectedIndex]?.text?.trim() || '';
        const buttonText =
          button?.querySelector('.filter-option-inner-inner')?.textContent?.trim() ||
          button?.textContent?.trim() ||
          '';

        return { ok: true, selectedText, buttonText };
      }, { id: dataId, text: textToSelect });

      if (!synced.ok) {
        throw new Error(`No se pudo sincronizar dropdown ${dataId}: ${synced.reason}`);
      }

      await this.page.waitForTimeout(500);

      const selectedOk = await this.isBootstrapSelectionApplied(dataId, textToSelect);
      if (!selectedOk) {
        throw new Error(`Dropdown ${dataId} no reflejó visualmente la selección "${textToSelect}"`);
      }
    } catch (e) {
      logger.warn(`selectBootstrapDropdownWithSearch falló para el data-id "${dataId}", usando fallback JS: ${e}`);
      await this.page.evaluate(({ id, text }: { id: string; text: string }) => {
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

      const selectedOk = await this.isBootstrapSelectionApplied(dataId, textToSelect);
      if (!selectedOk) {
        throw new Error(`Dropdown ${dataId} no quedó seleccionado con "${textToSelect}" tras fallback.`);
      }
    }
  }

  private async selectBootstrapDropdownByDataIdsWithSearch(
    dataIds: string[],
    textToSelect: string,
    throwIfNotFound: boolean = true,
  ): Promise<void> {
    for (const dataId of dataIds) {
      const btn = this.page.locator(`button[data-id="${dataId}"]`).first();
      const exists = await btn.count().then((count: number) => count > 0).catch(() => false);
      if (!exists) {
        continue;
      }

      try {
        logger.info(`Intentando selección en dropdown data-id="${dataId}"`);
        await this.selectBootstrapDropdownWithSearch(dataId, textToSelect);
        logger.success(`Selección exitosa para data-id="${dataId}"`);
        return;
      } catch (error) {
        logger.warn(`Falló selección para data-id="${dataId}": ${String(error)}`);
      }
    }

    if (throwIfNotFound) {
      throw new Error(
        `No se pudo seleccionar "${textToSelect}" en ningún dropdown candidato: ${dataIds.join(', ')}`,
      );
    }
  }

  private async selectTipoServicioProforma(optionText: string): Promise<void> {
    logger.info(`🧩 Seleccionando Tipo de Servicio Proforma: ${optionText}`);

    const result = await this.page.evaluate(({ desiredText }: { desiredText: string }) => {
      const normalize = (value: string) => value.trim().toLowerCase();
      const desired = normalize(desiredText);

      const select = document.getElementById('tipo_servicio_proforma') as HTMLSelectElement | null;
      const button = document.querySelector('button[data-id="tipo_servicio_proforma"]') as HTMLButtonElement | null;

      if (!select || !button) {
        return { ok: false, message: 'No se encontró #tipo_servicio_proforma o su botón bootstrap' };
      }

      const options = Array.from(select.options);
      let target = options.find((option) => normalize(option.text) === desired);

      if (!target) {
        target = options.find((option) => normalize(option.text).includes(desired));
      }

      if (!target) {
        target = options.find((option) => {
          const text = normalize(option.text);
          return text.length > 0 && text !== 'seleccionar' && text !== 'select';
        });
      }

      if (!target) {
        return { ok: false, message: 'No hay opciones válidas en Tipo de Servicio Proforma' };
      }

      select.value = target.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));

      // @ts-ignore
      const $ = window.jQuery;
      if ($ && $(select).selectpicker) {
        // @ts-ignore
        $(select).selectpicker('val', target.value);
        $(select).selectpicker('refresh');
        // @ts-ignore
        $(select).trigger('change');
      }

      const selectedText = select.options[select.selectedIndex]?.text?.trim() || '';
      const buttonText =
        button?.querySelector('.filter-option-inner-inner')?.textContent?.trim() ||
        button?.textContent?.trim() ||
        '';

      return {
        ok: true,
        selectedValue: select.value,
        selectedText,
        buttonText,
        selectId: select.id,
      };
    }, { desiredText: optionText });

    if (!result.ok) {
      await this.takeScreenshot('proforma-tipo-servicio-no-seleccionado');
      throw new Error(String(result.message || 'No se pudo seleccionar Tipo de Servicio Proforma'));
    }

    if (!result.selectedText || /seleccionar/i.test(result.selectedText)) {
      await this.takeScreenshot('proforma-tipo-servicio-sigue-vacio');
      throw new Error('Tipo de Servicio Proforma no quedó seleccionado correctamente.');
    }

    if (!result.selectedValue) {
      await this.takeScreenshot('proforma-tipo-servicio-value-vacio');
      throw new Error('Tipo de Servicio Proforma quedó con value vacío.');
    }

    if (result.buttonText && /seleccionar/i.test(result.buttonText)) {
      await this.takeScreenshot('proforma-tipo-servicio-placeholder-visible');
      throw new Error('Tipo de Servicio Proforma quedó con placeholder visible en bootstrap-select.');
    }

    logger.success(`Tipo de Servicio Proforma seleccionado: ${result.selectedText}`);
  }

  private async selectRequiredBootstrapDropdown(dataId: string, value: string, fieldLabel: string): Promise<void> {
    logger.info(`🔐 Seleccionando campo requerido "${fieldLabel}": ${value}`);

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.selectBootstrapDropdownWithSearch(dataId, value);

        const selected = await this.isBootstrapSelectionApplied(dataId, value);
        if (!selected) {
          throw new Error(`El campo ${fieldLabel} no reflejó selección en UI.`);
        }

        logger.success(`Campo requerido "${fieldLabel}" seleccionado correctamente`);
        return;
      } catch (error) {
        lastError = error;
        logger.warn(`Intento ${attempt}/2 falló para "${fieldLabel}": ${String(error)}`);
        await this.page.waitForTimeout(1000);
      }
    }

    await this.takeScreenshot(`proforma-campo-requerido-fallo-${dataId}`);
    throw new Error(`No se pudo seleccionar campo requerido "${fieldLabel}" (${dataId}): ${String(lastError)}`);
  }

  private async isBootstrapSelectionApplied(dataId: string, expectedText: string): Promise<boolean> {
    const state = await this.page.evaluate(({ id }: { id: string }) => {
      const normalize = (value: string) => value.trim().toLowerCase();

      const button = document.querySelector(`button[data-id="${id}"]`) as HTMLButtonElement | null;
      const container = button?.closest('.bootstrap-select') as HTMLElement | null;
      const select = container?.querySelector('select') as HTMLSelectElement | null;

      const selectedText = select?.options[select.selectedIndex]?.text?.trim() || '';
      const buttonText =
        button?.querySelector('.filter-option-inner-inner')?.textContent?.trim() ||
        button?.textContent?.trim() ||
        '';

      return {
        selectedText: normalize(selectedText),
        buttonText: normalize(buttonText),
      };
    }, { id: dataId });

    const expected = expectedText.trim().toLowerCase();
    const selectLooksValid = Boolean(state.selectedText) && !/seleccionar|select/i.test(state.selectedText);
    const buttonLooksValid = Boolean(state.buttonText) && !/seleccionar|select/i.test(state.buttonText);

    const selectMatches = state.selectedText.includes(expected) || expected.includes(state.selectedText);
    const buttonMatches = state.buttonText.includes(expected) || expected.includes(state.buttonText);

    return selectLooksValid && buttonLooksValid && (selectMatches || buttonMatches);
  }

  private async assertProformaRequiredFieldsReady(): Promise<void> {
    logger.info('🧪 Validando campos requeridos antes de Guardar Proforma...');

    const checks = await Promise.all([
      this.isBootstrapSelectionApplied('drop_currecy_type', 'Pesos Chilenos'),
      this.isBootstrapSelectionApplied('drop_include_tax', 'Si'),
      this.isBootstrapSelectionApplied('tipo_servicio_proforma', 'defecto'),
    ]);

    if (!checks[0]) {
      await this.takeScreenshot('proforma-moneda-no-seleccionada-antes-guardar');
      throw new Error('Tipo de Moneda no está correctamente seleccionado antes de guardar Proforma.');
    }

    if (!checks[1]) {
      await this.takeScreenshot('proforma-iva-no-seleccionado-antes-guardar');
      throw new Error('Incluye IVA no está correctamente seleccionado antes de guardar Proforma.');
    }

    if (!checks[2]) {
      await this.takeScreenshot('proforma-tipo-servicio-no-seleccionado-antes-guardar');
      throw new Error('Tipo de Servicio Proforma no está correctamente seleccionado antes de guardar Proforma.');
    }

    logger.success('Campos requeridos de Proforma listos para guardar');
  }

  private async waitForProformaTripsSectionVisible(timeoutMs: number = 15000): Promise<void> {
    logger.info('⏳ Esperando sección de viajes proforma visible...');

    await this.page.waitForFunction(() => {
      const container = document.getElementById('div_viajes');
      if (!container) {
        return false;
      }

      const style = getComputedStyle(container);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }

      const typeServiceButton = document.querySelector('button[data-id="tipo_servicio_proforma"]') as HTMLElement | null;
      if (!typeServiceButton) {
        return false;
      }

      const btnStyle = getComputedStyle(typeServiceButton);
      return btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden';
    }, { timeout: timeoutMs });

    logger.success('Sección de viajes proforma visible');
  }

  private async waitForProformaIndexGridLoaded(options?: { timeoutMs?: number }): Promise<void> {
    const timeoutMs = options?.timeoutMs ?? 15000;
    logger.info('⏳ Esperando carga de DataTable en /proforma/index...');

    await this.page.waitForSelector(this.selectors.index.tablaPrefacturas, { state: 'visible', timeout: timeoutMs });

    await this.page.waitForFunction(() => {
      const processing = document.querySelector('div.dataTables_processing') as HTMLElement | null;
      const processingVisible = Boolean(
        processing &&
        processing.offsetParent !== null &&
        getComputedStyle(processing).display !== 'none' &&
        processing.innerText.trim().length > 0,
      );

      if (processingVisible) {
        return false;
      }

      const rows = Array.from(
        document.querySelectorAll('div.dataTables_wrapper table tbody tr, table#tabla-prefactura tbody tr'),
      );

      if (rows.length === 0) {
        return false;
      }

      return true;
    }, { timeout: timeoutMs });

    logger.success('DataTable de proforma cargada en index');
  }
}
