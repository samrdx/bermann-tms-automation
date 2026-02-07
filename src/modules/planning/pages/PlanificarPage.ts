import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PlanificarViajesPage');

export interface ViajeData {
  // Campos básicos
  nroViaje?: string;
  numeroPlanilla?: string;
  valorFlete?: string;
  
  // Selects críticos
  tipoOperacion?: string;    // 'Tclp2210'
  cliente?: string;           // 'Clientedummy'
  tipoServicio?: string;      // 'Tclp2210'
  tipoViaje?: string;         // '1'
  unidadNegocio?: string;     // '1'
  codigoCarga?: string;       // 'CONT-Bobinas-Sider14'
  
  // Ruta
  numeroRuta?: string;        // '05082025-1'
  
  // Origen/Destino
  origen?: string;            // '1_agunsa_lampa_RM'
  destino?: string;           // '225_Starken_Sn Bernardo'
  
  // Fecha (pre-llenado generalmente)
  fechaEntradaOrigen?: string;
}

export class PlanificarPage extends BasePage {
  private readonly selectors = {
    // Campos básicos
    nroViaje: '#viajes-nro_viaje',
    numeroPlanilla: '#viajes-numero_planilla',
    valorFlete: '#viajes-valor_flete',
    
    // Selects críticos
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
    
    // Origen/Destino
    origen: '#_origendestinoform-origen',
    destino: '#_origendestinoform-destino',
    fechaEntradaOrigen: '#_origendestinoform-fechaentradaorigen',
    
    // Botones
    btnGuardar: '#btn_guardar_form',
    btnVolver: 'a[href="/viajes/index"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info('Navigating to Planificar Viajes page');
    await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/crear');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ========== CAMPOS BÁSICOS ==========

  async fillNroViaje(nro?: string): Promise<void> {
    logger.info('Filling Nro Viaje');
    try {
      const nroViaje = nro || String(Math.floor(10000 + Math.random() * 90000));
      await this.fill(this.selectors.nroViaje, nroViaje);
      logger.info(`✅ Nro Viaje filled: ${nroViaje}`);
    } catch (error) {
      logger.error('Failed to fill Nro Viaje', error);
      await this.takeScreenshot('fill-nro-viaje-error');
      throw error;
    }
  }

  async fillNumeroPlanilla(numero: string): Promise<void> {
    logger.info(`Filling Numero Planilla: ${numero}`);
    try {
      await this.fill(this.selectors.numeroPlanilla, numero);
    } catch (error) {
      logger.error('Failed to fill Numero Planilla', error);
      throw error;
    }
  }

  async fillValorFlete(valor: string): Promise<void> {
    logger.info(`Filling Valor Flete: ${valor}`);
    try {
      await this.fill(this.selectors.valorFlete, valor);
    } catch (error) {
      logger.error('Failed to fill Valor Flete', error);
      throw error;
    }
  }

  // ========== SELECTS ROBUSTOS (Pattern from old script) ==========

  /**
   * Robust select that uses Bootstrap-select's selectpicker('val') API.
   * Playwright's selectOption() does NOT trigger Bootstrap-select change events,
   * which breaks cascading AJAX calls. Using selectpicker('val') ensures proper
   * event propagation and AJAX triggers.
   */
  private async robustSelect(
    selector: string,
    textOrValue: string,
    searchByText = true
  ): Promise<void> {
    const selectLoc = this.page.locator(selector);

    // Wait for select to be visible
    await selectLoc.waitFor({ state: 'visible', timeout: 5000 });

    // If searching by text, wait for the dropdown to have options loaded (AJAX may populate them)
    if (searchByText) {
      logger.info(`Waiting for options to load in ${selector}...`);
      await this.page.waitForFunction(
        (sel: string) => {
          const selectEl = document.querySelector(sel) as HTMLSelectElement;
          return selectEl && selectEl.options.length > 1;
        },
        selector,
        { timeout: 10000 }
      ).catch(() => {
        logger.warn(`Timeout waiting for options in ${selector}, proceeding anyway`);
      });
    }

    for (let retry = 0; retry < 3; retry++) {
      try {
        let valueToSet: string;

        if (searchByText) {
          // Find option value by text content
          const optionValue = await selectLoc.evaluate((sel: HTMLSelectElement, text: string) => {
            const opts = Array.from(sel.options || []);
            const found = opts.find(o =>
              (o.textContent || '').toLowerCase().includes(text.toLowerCase())
            );
            return found ? found.value : null;
          }, textOrValue);

          if (!optionValue) {
            const allOptions = await selectLoc.evaluate((sel: HTMLSelectElement) =>
              Array.from(sel.options).map(o => o.textContent?.trim() || '')
            );
            logger.warn(`Option with text "${textOrValue}" not found. Available: ${allOptions.join(', ')}`);
            throw new Error(`Option with text "${textOrValue}" not found`);
          }
          valueToSet = optionValue;
        } else {
          valueToSet = textOrValue;
        }

        // Use Bootstrap-select's selectpicker('val') API for proper event propagation
        // ALSO trigger inline onchange handlers (e.g. getTiposServicio(), getZones())
        // which selectpicker('val') does NOT trigger automatically
        await this.page.evaluate((args: { sel: string; val: string }) => {
          const $ = (window as any).$;
          const selectEl = document.querySelector(args.sel) as HTMLSelectElement;
          if ($ && selectEl && $(selectEl).selectpicker) {
            $(selectEl).selectpicker('val', args.val);
          } else if (selectEl) {
            selectEl.value = args.val;
          }
          // Trigger inline onchange handlers (critical for cascading AJAX)
          if (selectEl) {
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            if (typeof selectEl.onchange === 'function') {
              selectEl.onchange(new Event('change'));
            }
          }
        }, { sel: selector, val: valueToSet });

        // Wait for cascading effects (AJAX calls, dependent dropdowns loading)
        await this.page.waitForTimeout(1000);

        // Verify not invalid
        const isInvalid = await selectLoc.evaluate(el =>
          el.classList.contains('is-invalid') ||
          el.closest('.form-group, .form-control')?.classList.contains('has-error')
        );

        if (!isInvalid) {
          return; // Success
        }
      } catch (error) {
        if (retry === 2) throw error;
        await this.page.waitForTimeout(1000);
      }
    }

    // Final fallback: set value via DOM + change event
    await this.page.evaluate((args: { sel: string; val: string }) => {
      const el = document.querySelector(args.sel) as HTMLSelectElement;
      if (el) {
        el.value = args.val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { sel: selector, val: textOrValue });

    await this.page.waitForTimeout(500);
  }

  async selectTipoOperacion(tipo: string = 'tclp2210'): Promise<void> {
    logger.info(`Selecting Tipo Operacion: ${tipo}`);
    try {
      await this.robustSelect(this.selectors.tipoOperacion, tipo, true);
      logger.info('✅ Tipo Operacion selected');
    } catch (error) {
      logger.error('Failed to select Tipo Operacion', error);
      await this.takeScreenshot('select-tipo-operacion-error');
      throw error;
    }
  }

  async selectCliente(cliente: string = 'Clientedummy'): Promise<void> {
    logger.info(`Selecting Cliente: ${cliente}`);
    try {
      await this.robustSelect(this.selectors.cliente, cliente, true);
      logger.info('✅ Cliente selected');
    } catch (error) {
      logger.error('Failed to select Cliente', error);
      await this.takeScreenshot('select-cliente-error');
      throw error;
    }
  }

  async selectTipoServicio(tipo: string = 'tclp2210'): Promise<void> {
    logger.info(`Selecting Tipo Servicio: ${tipo}`);
    try {
      await this.page.waitForTimeout(1000); // Wait for cascade
      await this.robustSelect(this.selectors.tipoServicio, tipo, true);
      logger.info('✅ Tipo Servicio selected');
    } catch (error) {
      logger.error('Failed to select Tipo Servicio', error);
      await this.takeScreenshot('select-tipo-servicio-error');
      throw error;
    }
  }

  async selectTipoViaje(value: string = '1'): Promise<void> {
    logger.info('Selecting Tipo Viaje');
    try {
      await this.robustSelect(this.selectors.tipoViaje, value, false);
      logger.info('✅ Tipo Viaje selected');
    } catch (error) {
      logger.error('Failed to select Tipo Viaje', error);
      throw error;
    }
  }

  async selectUnidadNegocio(value: string = '1'): Promise<void> {
    logger.info('Selecting Unidad Negocio');
    try {
      await this.robustSelect(this.selectors.unidadNegocio, value, false);
      logger.info('✅ Unidad Negocio selected');
    } catch (error) {
      logger.error('Failed to select Unidad Negocio', error);
      throw error;
    }
  }

  async selectCodigoCarga(carga?: string): Promise<void> {
    try {
      const selectLoc = this.page.locator(this.selectors.codigoCarga);

      // Wait for dropdown options to load (populated dynamically via AJAX after
      // Tipo Operación + Cliente + Tipo Servicio + Unidad Negocio are selected)
      logger.info('Waiting for Codigo Carga options to load...');
      await this.page.waitForFunction(
        () => {
          const sel = document.querySelector('#viajes-carga_id') as HTMLSelectElement;
          return sel && sel.options.length > 1;
        },
        { timeout: 15000 }
      );
      await this.page.waitForTimeout(500); // Small buffer after options load
      logger.info('Codigo Carga options loaded');

      if (!carga) {
        // Select first available option (skip empty/placeholder)
        logger.info('Selecting first available Codigo Carga...');

        const firstOption = await selectLoc.evaluate((sel: HTMLSelectElement) => {
          const options = Array.from(sel.options);
          // Skip first option if it's empty or placeholder
          const validOption = options.find(opt => opt.value && opt.value.trim() !== '' && opt.textContent?.trim());
          return validOption ? { value: validOption.value, text: validOption.textContent?.trim() } : null;
        });

        if (!firstOption) {
          throw new Error('No valid Codigo Carga options available');
        }

        logger.info(`Found first available: ${firstOption.text} (value: ${firstOption.value})`);
        // Use selectpicker API for consistency
        await this.page.evaluate((args: { sel: string; val: string }) => {
          const $ = (window as any).$;
          const selectEl = document.querySelector(args.sel) as HTMLSelectElement;
          if ($ && selectEl && $(selectEl).selectpicker) {
            $(selectEl).selectpicker('val', args.val);
          } else if (selectEl) {
            selectEl.value = args.val;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, { sel: this.selectors.codigoCarga, val: firstOption.value });
        await this.page.waitForTimeout(900);
        logger.info('✅ First available Codigo Carga selected');
      } else {
        // Select specific cargo by text
        logger.info(`Selecting Codigo Carga: ${carga}`);

        // First, log all available options for debugging
        const allOptions = await selectLoc.evaluate((sel: HTMLSelectElement) =>
          Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent?.trim() || '' }))
        );
        logger.info(`Available Codigo Carga options (${allOptions.length}):`);
        allOptions.slice(0, 10).forEach(opt => logger.info(`  - "${opt.text}" (value: ${opt.value})`));
        if (allOptions.length > 10) logger.info(`  ... and ${allOptions.length - 10} more`);

        await this.robustSelect(this.selectors.codigoCarga, carga, true);
        logger.info('✅ Codigo Carga selected');
      }
    } catch (error) {
      logger.error('Failed to select Codigo Carga', error);
      await this.takeScreenshot('select-carga-error');
      throw error;
    }
  }

  // ========== RUTA (MODAL COMPLEJO) ==========

  async agregarRuta(numeroRuta: string = '05082025-1'): Promise<void> {
    logger.info(`Adding ruta: ${numeroRuta}`);
    
    try {
      // Click Agregar Ruta button
      const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();
      
      // Remove any modal backdrops that might be intercepting
      await this.page.evaluate(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(bd => bd.remove());
      });
      await this.page.waitForTimeout(500);
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await btnAgregar.click({ timeout: 5000 });
          logger.info('Clicked Agregar Ruta button');
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await this.page.waitForTimeout(500);
        }
      }
      
      // Wait for modal
      await this.page.waitForTimeout(1000);
      const modal = this.page.locator(this.selectors.modalRutas);
      const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!modalVisible) {
        throw new Error('Modal de rutas no apareció');
      }
      
      logger.info('Modal de rutas visible, buscando ruta en tabla');
      
      // Find and click row with matching ruta
      const rows = this.page.locator(this.selectors.tablaRutas);
      const rowCount = await rows.count();
      
      logger.info(`Found ${rowCount} rows in ruta table`);
      
      let foundRuta = false;
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const cells = await row.locator('td').allTextContents();
        const rowText = cells.join('|');
        
        if (rowText.includes(numeroRuta)) {
          logger.info(`Found ruta ${numeroRuta} in row ${i}`);
          
          // Click green button in this row
          const btnOk = row.locator('button.btn.btn-sm.btn-success').first();
          await btnOk.scrollIntoViewIfNeeded();
          await btnOk.click();
          
          logger.info('✅ Ruta selected and clicked');
          foundRuta = true;
          break;
        }
      }
      
      if (!foundRuta) {
        throw new Error(`Ruta ${numeroRuta} not found in table`);
      }
      
      // Wait for modal to close
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      logger.error('Failed to add ruta', error);
      await this.takeScreenshot('agregar-ruta-error');
      throw error;
    }
  }

  // ========== ORIGEN/DESTINO ==========

  async selectOrigen(origen: string = '1_agunsa_lampa_RM'): Promise<void> {
    logger.info(`Selecting Origen: ${origen}`);
    try {
      await this.robustSelect(this.selectors.origen, origen, false); // false = value
      logger.info('✅ Origen selected');
    } catch (error) {
      logger.error('Failed to select Origen', error);
      await this.takeScreenshot('select-origen-error');
      throw error;
    }
  }

  async selectDestino(destino: string = '225_Starken_Sn Bernardo'): Promise<void> {
    logger.info(`Selecting Destino: ${destino}`);
    try {
      await this.robustSelect(this.selectors.destino, destino, false); // false = value
      logger.info('✅ Destino selected');
    } catch (error) {
      logger.error('Failed to select Destino', error);
      await this.takeScreenshot('select-destino-error');
      throw error;
    }
  }

  // ========== GUARDAR ==========

  async clickGuardar(): Promise<void> {
    logger.info('Clicking Guardar button');
    
    try {
      const btnGuardar = this.page.locator(this.selectors.btnGuardar).first();
      
      // Wait for button to be visible
      await btnGuardar.waitFor({ state: 'visible', timeout: 10000 });
      
      // Remove any modal backdrops
      await this.page.evaluate(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(bd => bd.remove());
      });
      
      await this.page.waitForTimeout(300);
      
      // Try click with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt === 0) {
            await btnGuardar.click({ timeout: 5000 });
          } else if (attempt === 1) {
            await btnGuardar.click({ force: true, timeout: 5000 });
          } else {
            // JS fallback
            await this.page.evaluate(() => {
              const btn = document.querySelector('#btn_guardar_form') as HTMLElement;
              if (btn) btn.click();
            });
          }
          
          logger.info('✅ Guardar button clicked');
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await this.page.waitForTimeout(500);
        }
      }
      
      // Wait for response
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      logger.error('Failed to click Guardar', error);
      await this.takeScreenshot('click-guardar-error');
      throw error;
    }
  }

  // ========== VERIFICACIÓN ==========

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      
      // Check for success alert
      const successAlert = await this.page.locator('.alert-success, [role="alert"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (successAlert) {
        const alertText = await this.page.locator('.alert-success, [role="alert"]').first().textContent();
        logger.info(`Success alert: ${alertText}`);
        return true;
      }
      
      // Check URL change
      const url = this.page.url();
      if (!url.includes('/crear')) {
        logger.info('URL changed from /crear, form likely saved');
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  async verifyInAsignar(nroViaje: string): Promise<boolean> {
    logger.info(`Verifying viaje ${nroViaje} in /viajes/asignar`);
    
    try {
      await this.page.goto('https://moveontruckqa.bermanntms.cl/viajes/asignar');
      await this.page.waitForLoadState('networkidle');
      
      // Use search if available
      const searchInput = this.page.locator('input[type="search"]').first();
      const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (searchVisible) {
        await searchInput.fill(nroViaje);
        await this.page.waitForTimeout(1000);
      }
      
      // Check table for nroViaje - search ALL columns for robustness
      const found = await this.page.evaluate((viaje: string) => {
        const tbody = document.querySelector('table tbody');
        if (!tbody) {
          console.log('No table body found');
          return false;
        }

        const rows = Array.from(tbody.querySelectorAll('tr'));
        console.log(`Found ${rows.length} rows in table`);

        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));

          // Search ALL columns for matching text (more robust)
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i]?.textContent?.trim() || '';
            if (cellText === viaje) {
              console.log(`Found viaje "${viaje}" in row, column ${i}`);
              return true;
            }
          }
        }

        console.log(`Viaje "${viaje}" not found in any column`);
        return false;
      }, nroViaje);
      
      if (found) {
        logger.info(`✅ Viaje ${nroViaje} found in /viajes/asignar`);
      } else {
        logger.warn(`⚠️ Viaje ${nroViaje} NOT found in /viajes/asignar`);
      }
      
      return found;
    } catch (error) {
      logger.error('Failed to verify in asignar', error);
      return false;
    }
  }
}