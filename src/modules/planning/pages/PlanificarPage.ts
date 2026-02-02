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
    await this.page.waitForLoadState('networkidle');
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
   * Robust select that retries and uses fallback methods
   */
  private async robustSelect(
    selector: string,
    textOrValue: string,
    searchByText = true
  ): Promise<void> {
    const selectLoc = this.page.locator(selector);
    
    // Wait for select to be visible
    await selectLoc.waitFor({ state: 'visible', timeout: 5000 });
    
    for (let retry = 0; retry < 3; retry++) {
      try {
        if (searchByText) {
          // Find option by text content
          const optionValue = await selectLoc.evaluate((sel: HTMLSelectElement, text: string) => {
            const opts = Array.from(sel.options || []);
            const found = opts.find(o => 
              (o.textContent || '').toLowerCase().includes(text.toLowerCase())
            );
            return found ? found.value : null;
          }, textOrValue);
          
          if (optionValue) {
            await selectLoc.selectOption(optionValue);
          } else {
            throw new Error(`Option with text "${textOrValue}" not found`);
          }
        } else {
          // Select by value directly
          await selectLoc.selectOption(textOrValue);
        }
        
        // Wait and verify not invalid
        await this.page.waitForTimeout(900);
        const isInvalid = await selectLoc.evaluate(el => 
          el.classList.contains('is-invalid') || 
          el.closest('.form-group, .form-control')?.classList.contains('has-error')
        );
        
        if (!isInvalid) {
          return; // Success
        }
      } catch (error) {
        if (retry === 2) throw error;
        await this.page.waitForTimeout(500);
      }
    }
    
    // Fallback: set value via DOM
    await selectLoc.evaluate((el: HTMLSelectElement, val: string) => {
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, textOrValue);
    
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

  async selectCodigoCarga(carga: string = 'CONT-Bobinas-Sider14'): Promise<void> {
    logger.info(`Selecting Codigo Carga: ${carga}`);
    try {
      await this.robustSelect(this.selectors.codigoCarga, carga, true);
      logger.info('✅ Codigo Carga selected');
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
      await this.robustSelect(this.selectors.origen, origen, true);
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
      await this.robustSelect(this.selectors.destino, destino, true);
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
      
      // Check table for nroViaje
      const found = await this.page.evaluate((viaje: string) => {
        const tbody = document.querySelector('table tbody');
        if (!tbody) return false;
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          // Column 2 is Nro Viaje in asignar table
          if (cells[2]?.textContent?.trim() === viaje) {
            return true;
          }
        }
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