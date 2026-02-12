import { Page, expect } from '@playwright/test';



import { logger } from '../../src/utils/logger.js';



import {



  generateChileanStreet,



  generateStreetNumber,



  generatePatente,



  generateRandomName,



  generateRandomLastName,



  generateValidChileanRUT



} from '../../src/utils/rutGenerator.js';







export class TmsApiClient {



  private baseUrl: string;







  constructor(private page: Page) {



    this.baseUrl = process.env.BASE_URL || 'https://moveontruckqa.bermanntms.cl';



  }







  async initialize(): Promise<void> {



    logger.info(`✅ TmsApiClient initialized`);



  }







  private generateRandomId(): string {



    return String(Math.floor(10000 + Math.random() * 100000));



  }







  /**



   * Helper para escribir texto lentamente simulando escritura humana.



   */



  private async fillSlowly(selector: string, value: string, delay: number = 80): Promise<void> {



    const locator = this.page.locator(selector);



    await locator.click();



    await locator.clear();



    await this.page.waitForTimeout(200);







    // Escribir caracter por caracter con delay



    await locator.pressSequentially(value, { delay });







    // Esperar a que el input mask procese



    await this.page.waitForTimeout(300);







    // Verificar si se perdió el último caracter (común con "K" en RUTs)



    const currentValue = await locator.inputValue();



    const normalizedCurrent = currentValue.replace(/[^0-9Kk]/g, '').toUpperCase();



    const normalizedExpected = value.replace(/[^0-9Kk]/g, '').toUpperCase();







    if (normalizedCurrent !== normalizedExpected) {



      logger.warn(`⚠️ RUT value mismatch - trying to fix. Got: ${currentValue}, Expected: ${value}`);



      // Intentar agregar el último caracter si falta



      const lastChar = normalizedExpected.slice(-1);



      if (!normalizedCurrent.endsWith(lastChar)) {



        await locator.press(lastChar);



        await this.page.waitForTimeout(200);



        logger.info(`✅ Added missing character: ${lastChar}`);



      }



    }



  }







  /**



   * Helper especializado para escribir RUT en campos con Input Mask.



   */



  private async typeRutSlowly(selector: string, rutValue: string): Promise<void> {



    logger.info(`🔑 typeRutSlowly: Writing RUT [${rutValue}] on ${selector}`);



    const locator = this.page.locator(selector);







    const normalize = (val: string) => val.toUpperCase().replace(/[^0-9K]/g, '');



    const normalizedExpected = normalize(rutValue);



    const verificationDigit = normalizedExpected.slice(-1);



    const rutBody = normalizedExpected.slice(0, -1);



    const rawWithHyphen = `${rutBody}-${verificationDigit}`;







    const formatTmsRut = (body: string, dv: string): string => {



      const parts: string[] = [];



      let remaining = body;



      while (remaining.length > 3) {



        parts.unshift(remaining.slice(-3));



        remaining = remaining.slice(0, -3);



      }



      if (remaining) parts.unshift(remaining);



      return parts.join('.') + '-' + dv;



    };







    // --- Intento 1: pressSequentially con delay 100ms ---



    await locator.click({ clickCount: 3 });



    await this.page.keyboard.press('Backspace');



    await this.page.waitForTimeout(200);







    await locator.pressSequentially(rawWithHyphen, { delay: 100 });



    await this.page.waitForTimeout(500);







    let currentValue = await locator.inputValue();



    let normalizedCurrent = normalize(currentValue);







    if (normalizedCurrent === normalizedExpected) {



      logger.info(`✅ RUT verified (attempt 1): ${currentValue}`);



      return;



    }







    // --- Intento 2: Retry más lento (delay 150ms) ---



    logger.warn(`⚠️ RUT mismatch (attempt 1). Got: [${currentValue}] (${normalizedCurrent}), Expected: (${normalizedExpected}). Retrying slower...`);







    await locator.click({ clickCount: 3 });



    await this.page.keyboard.press('Backspace');



    await this.page.waitForTimeout(300);







    const retryRut = verificationDigit === 'K' ? `${rutBody}-k` : rawWithHyphen;







    await locator.pressSequentially(retryRut, { delay: 150 });



    await this.page.waitForTimeout(500);







    currentValue = await locator.inputValue();



    normalizedCurrent = normalize(currentValue);







    if (normalizedCurrent === normalizedExpected) {



      logger.info(`✅ RUT verified (attempt 2): ${currentValue}`);



      return;



    }







    // --- Intento 3: Fallback JavaScript ---



    logger.warn(`⚠️ RUT mismatch (attempt 2). Got: [${currentValue}] (${normalizedCurrent}). Using JS fallback...`);



    const tmsFormatted = formatTmsRut(rutBody, verificationDigit);







    await this.page.evaluate(



      ({ sel, formattedValue }) => {



        const input = document.querySelector(sel) as HTMLInputElement;



        if (input) {



          const savedOnInput = input.oninput;



          const savedOnChange = input.onchange;



          const savedOnKeydown = input.onkeydown;







          input.oninput = null;



          input.onchange = null;



          input.onkeydown = null;







          input.value = formattedValue;







          input.oninput = savedOnInput;



          input.onchange = savedOnChange;



          input.onkeydown = savedOnKeydown;







          input.dispatchEvent(new Event('input', { bubbles: true }));



          input.dispatchEvent(new Event('change', { bubbles: true }));



          input.dispatchEvent(new Event('blur', { bubbles: true }));



        }



      },



      { sel: selector, formattedValue: tmsFormatted }



    );







    await this.page.waitForTimeout(300);



    currentValue = await locator.inputValue();



    normalizedCurrent = normalize(currentValue);







    if (normalizedCurrent === normalizedExpected) {



      logger.info(`✅ RUT verified (JS fallback): ${currentValue}`);



      return;



    }







    if (normalizedCurrent.slice(0, -1) === rutBody || normalizedCurrent === rutBody) {



      logger.warn(`⚠️ RUT body matches but DV may differ. Got: [${currentValue}], Expected: [${rutValue}]. Continuing...`);



      return;



    }







    logger.error(`❌ RUT validation FAILED after all attempts. Final: [${currentValue}] (${normalizedCurrent}), Expected: [${rutValue}] (${normalizedExpected})`);



  }







  // --- 1. TRANSPORTISTA ---



  async createTransportista(nombre: string): Promise<string> {



    const rut = generateValidChileanRUT();



    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: [${rut}]`);



    await this.page.goto(`${this.baseUrl}/transportistas/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });



    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);



    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);



    await this.typeRutSlowly('input[name="Transportistas[documento]"]', rut);



    await this.page.fill('input[name="Transportistas[calle]"]', generateChileanStreet());



    await this.page.fill('input[name="Transportistas[altura]"]', generateStreetNumber());



    await this.page.selectOption('select[name="Transportistas[tipo_transportista_id]"]', '1');



    await this.page.selectOption('select[name="Transportistas[region_id]"]', '1');



    await this.page.selectOption('select[name="Transportistas[ciudad_id]"]', '1');



    await this.page.selectOption('select[name="Transportistas[comuna_id]"]', '2');







    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }),



      this.page.locator('button:has-text("Guardar"), input[type="submit"]').first().click()



    ]);







    let id = '0';



    let currentUrl = this.page.url();



    logger.info(`📍 URL after save: ${currentUrl}`);







    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);



    if (idMatch) {



      id = idMatch[1];



      logger.info(`✅ Transportista ID extracted from URL: ${id}`);



    } else {



      logger.info(`🔍 Using search filter to find Transportista: ${nombre}`);



      await this.page.waitForTimeout(1000);







      const searchInput = this.page.locator('#search');



      await searchInput.fill(nombre);



      logger.info(`🔎 Filled search with: ${nombre}`);







      await this.page.getByRole('link', { name: 'Buscar' }).click();



      await this.page.waitForLoadState('networkidle');



      logger.info(`🔎 Clicked Buscar link`);



      await this.page.waitForTimeout(2000);







      const row = this.page.locator('table tbody tr[data-key]').filter({ hasText: nombre }).first();







      if (await row.count() > 0) {



        const dataKey = await row.getAttribute('data-key');



        if (dataKey) {



          id = dataKey;



          logger.info(`✅ Transportista ID from data-key: ${id}`);



        }



      } else {



        logger.info(`🔎 Trying alternative search in table...`);



        const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();



        if (await anyRow.count() > 0) {



          const dataKey = await anyRow.getAttribute('data-key');



          if (dataKey) {



            id = dataKey;



            logger.info(`✅ Transportista ID from fallback data-key: ${id}`);



          } else {



            const link = anyRow.locator('a[href*="/transportistas/"]').first();



            if (await link.count() > 0) {



              const href = await link.getAttribute('href');



              const match = href?.match(/\/(\d+)/);



              if (match) {



                id = match[1];



                logger.info(`✅ Transportista ID from link: ${id}`);



              }



            }



          }



        } else {



          logger.warn(`⚠️ No row found for Transportista: ${nombre}`);



        }



      }



    }







    if (id === '0') {



      logger.error(`❌ Could not extract Transportista ID for: ${nombre}`);



      throw new Error(`Failed to extract Transportista ID for: ${nombre}`);



    }







    logger.info(`✅ Transportista created with ID: ${id}`);



    return id;



  }







  // --- 2. CLIENTE ---



  async createCliente(nombre: string): Promise<string> {



    const rut = generateValidChileanRUT();



    logger.info(`🚀 UI: Creating Cliente [${nombre}] RUT: [${rut}]`);



    await this.page.goto(`${this.baseUrl}/clientes/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForSelector('#clientes-nombre', { state: 'visible', timeout: 15000 });







    await this.page.fill('#clientes-nombre', nombre);



    await this.typeRutSlowly('#clientes-rut', rut);



    await this.page.fill('#clientes-nombre_fantasia', nombre);



    await this.page.fill('#clientes-calle', generateChileanStreet());







    await this.page.click('button[data-id="clientes-tipo_cliente_id"]');



    await this.page.waitForTimeout(500);



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    await this.page.click('button[data-id="clientes-region_id"]');



    await this.page.waitForTimeout(500);



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(2000);







    await this.page.click('button[data-id="clientes-ciudad_id"]');



    await this.page.waitForTimeout(500);



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(2000);







    await this.page.click('button[data-id="clientes-comuna_id"]');



    await this.page.waitForTimeout(500);



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    logger.info('📍 Selecting Polígonos...');



    const poligonosBtn = this.page.locator('button[data-id*="poligono"], button[data-id*="Poligono"]').first();







    if (await poligonosBtn.isVisible({ timeout: 3000 }).catch(() => false)) {



      await poligonosBtn.click();



      await this.page.waitForTimeout(500);







      const selectAllBtn = this.page.locator('.dropdown-menu.show button.actions-btn.bs-select-all');



      if (await selectAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {



        await selectAllBtn.click();



        logger.info('✅ Polígonos: Seleccionar todos clicked');



      } else {



        const firstOption = this.page.locator('.dropdown-menu.show .dropdown-item, .dropdown-menu.show li a').first();



        if (await firstOption.isVisible({ timeout: 1000 }).catch(() => false)) {



          await firstOption.click();



          logger.info('✅ Polígonos: Primera opción seleccionada');



        }



      }



      await this.page.keyboard.press('Escape');



      await this.page.waitForTimeout(500);



    } else {



      logger.info('🔎 Trying fallback selector for Polígonos...');



      const labelDiv = this.page.locator('label:has-text("Polígonos")').first();



      if (await labelDiv.isVisible({ timeout: 2000 }).catch(() => false)) {



        const nearbyBtn = this.page.locator('label:has-text("Polígonos") ~ .bootstrap-select button, label:has-text("Polígonos") + div button').first();



        if (await nearbyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {



          await nearbyBtn.click();



          await this.page.waitForTimeout(500);



          const selectAllBtn = this.page.locator('.dropdown-menu.show button.actions-btn.bs-select-all');



          if (await selectAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {



            await selectAllBtn.click();



            logger.info('✅ Polígonos: Seleccionar todos clicked (fallback)');



          }



          await this.page.keyboard.press('Escape');



          await this.page.waitForTimeout(500);



        }



      } else {



        logger.warn('⚠️ Polígonos dropdown not found - continuing without it');



      }



    }







    await this.page.click('#btn_guardar');



    await this.page.waitForTimeout(3000);







    let id = '0';



    let currentUrl = this.page.url();



    logger.info(`📍 URL after save: ${currentUrl}`);







    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);



    if (idMatch) {



      id = idMatch[1];



      logger.info(`✅ Cliente ID extracted from URL: ${id}`);



    } else {



      logger.info(`🔍 Using search filter to find Cliente: ${nombre}`);



      await this.page.waitForTimeout(1000);







      const searchInput = this.page.locator('#search');



      await searchInput.fill(nombre);



      logger.info(`🔎 Filled search with: ${nombre}`);







      await this.page.getByRole('link', { name: 'Buscar' }).click();



      await this.page.waitForLoadState('networkidle');



      logger.info(`🔎 Clicked Buscar link`);



      await this.page.waitForTimeout(2000);







      const row = this.page.locator('table tbody tr[data-key]').filter({ hasText: nombre }).first();







      if (await row.count() > 0) {



        const dataKey = await row.getAttribute('data-key');



        if (dataKey) {



          id = dataKey;



          logger.info(`✅ Cliente ID from data-key: ${id}`);



        }



      } else {



        logger.info(`🔎 Trying alternative search in table...`);



        const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();



        if (await anyRow.count() > 0) {



          const dataKey = await anyRow.getAttribute('data-key');



          if (dataKey) {



            id = dataKey;



            logger.info(`✅ Cliente ID from fallback data-key: ${id}`);



          } else {



            const link = anyRow.locator('a[href*="/clientes/"]').first();



            if (await link.count() > 0) {



              const href = await link.getAttribute('href');



              const match = href?.match(/\/(\d+)/);



              if (match) {



                id = match[1];



                logger.info(`✅ Cliente ID from link: ${id}`);



              }



            }



          }



        } else {



          logger.warn(`⚠️ No row found for Cliente: ${nombre}`);



        }



      }



    }







    if (id === '0') {



      logger.error(`❌ Could not extract Cliente ID for: ${nombre}`);



      throw new Error(`Failed to extract Cliente ID for: ${nombre}`);



    }







    logger.info(`✅ Cliente created with ID: ${id}`);



    return id;



  }







  // --- 3. VEHÍCULO ---



  async createVehiculo(transportistaNombre: string): Promise<string> {



    const patente = generatePatente();



    logger.info(`🚛 UI: Creating Vehículo [${patente}] for Transportista: ${transportistaNombre}`);



    await this.page.goto(`${this.baseUrl}/vehiculos/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForSelector('input[name="Vehiculos[patente]"]', { state: 'visible', timeout: 15000 });



    await this.page.fill('input[name="Vehiculos[patente]"]', patente);



    await this.page.fill('input[name="Vehiculos[muestra]"]', patente);







    await this.page.click('button[data-id="vehiculos-transportista_id"]');



    await this.page.waitForTimeout(500);



    const searchBox = this.page.locator('.dropdown-menu.show .bs-searchbox input');



    if (await searchBox.isVisible()) {



      await searchBox.fill(transportistaNombre);



      await this.page.waitForTimeout(1000);



    }



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    logger.info('🚛 Selecting Tipo Vehículo: TRACTO');



    await this.page.click('button[data-id="vehiculos-tipo_vehiculo_id"]');



    await this.page.waitForTimeout(500);



    const tipoVehiculoMenu = this.page.locator('div.dropdown-menu.show').first();



    const tipoSearchBox = tipoVehiculoMenu.locator('.bs-searchbox input');



    if (await tipoSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {



      await tipoSearchBox.fill('TRACTO');



      await this.page.waitForTimeout(500);



    }



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(1000);







    logger.info('📦 Selecting Capacidad: 3 KG');



    const capacidadBtn = this.page.locator('button[data-id="vehiculos-capacidad_id"]');



    if (await capacidadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {



      await capacidadBtn.click();



      await this.page.waitForTimeout(500);



      const capacidadMenu = this.page.locator('div.dropdown-menu.show').first();



      const capacidadSearchBox = capacidadMenu.locator('.bs-searchbox input');



      if (await capacidadSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {



        await capacidadSearchBox.fill('3 KG');



        await this.page.waitForTimeout(500);



      }



      await this.page.keyboard.press('ArrowDown');



      await this.page.keyboard.press('Enter');



      await this.page.waitForTimeout(500);



    } else {



      logger.warn('⚠️ Capacidad dropdown not visible - skipping');



    }







    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }),



      this.page.locator('button:has-text("Guardar")').click()



    ]);



    logger.info(`✅ Vehículo created: ${patente}`);



    return patente;



  }







  // --- 4. CONDUCTOR ---



  async createConductor(transportistaNombre: string): Promise<string> {



    const nombre = generateRandomName();



    const rut = generateValidChileanRUT();



    const usuario = `user${Math.floor(Math.random() * 100000)}`;



    const clave = `pass${Math.floor(Math.random() * 100000)}`;



    logger.info(`👨‍✈️ UI: Creating Conductor [${nombre}] for Transportista: ${transportistaNombre}`);



    await this.page.goto(`${this.baseUrl}/conductores/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForSelector('input[name="Conductores[nombre]"]', { state: 'visible', timeout: 15000 });







    await this.page.fill('input[name="Conductores[usuario]"]', usuario);



    await this.page.fill('input[name="Conductores[clave]"]', clave);



    await this.page.fill('input[name="Conductores[nombre]"]', nombre);



    await this.page.fill('input[name="Conductores[apellido]"]', generateRandomLastName());



    await this.typeRutSlowly('input[name="Conductores[documento]"]', rut);







    await this.page.click('button[data-id="conductores-licencia"]');



    await this.page.waitForTimeout(500);



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    const fechaVencimiento = new Date();



    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);



    const dia = String(fechaVencimiento.getDate()).padStart(2, '0');



    const mes = String(fechaVencimiento.getMonth() + 1).padStart(2, '0');



    const anio = fechaVencimiento.getFullYear();



    const fechaStr = `${dia}-${mes}-${anio}`;



    logger.info(`📅 Setting fecha vencimiento licencia: ${fechaStr}`);







    const fechaInput = this.page.locator('#conductores-fecha_vencimiento_licencia, input[name="Conductores[fecha_vencimiento_licencia]"]').first();



    if (await fechaInput.isVisible({ timeout: 2000 }).catch(() => false)) {



      await fechaInput.click();



      await this.page.waitForTimeout(300);



      await fechaInput.fill(fechaStr);



      await this.page.keyboard.press('Tab');



      await this.page.waitForTimeout(500);



    }







    await this.page.click('button[data-id="conductores-transportista_id"]');



    await this.page.waitForTimeout(500);



    const searchBox = this.page.locator('.dropdown-menu.show .bs-searchbox input');



    if (await searchBox.isVisible()) {



      await searchBox.fill(transportistaNombre);



      await this.page.waitForTimeout(1000);



    }



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    await this.page.click('#btn_guardar');



    await this.page.waitForTimeout(3000);







    const currentUrl = this.page.url();



    if (currentUrl.includes('/index') || currentUrl.includes('/ver') || currentUrl.includes('/editar')) {



      logger.info(`✅ Conductor created: ${nombre}`);



    } else {



      logger.info(`⚠️ Conductor form submitted (URL: ${currentUrl})`);



    }



    return nombre;



  }







  // --- 5. LÓGICA DE CONTRATOS ---



  /**



   * Refactored contract creation using jQuery pattern (proven in contrato-crear.test.ts)



   * Key improvements:



   * 1. Uses jQuery trigger('change') instead of vanilla dispatchEvent



   * 2. Waits for rendersubview AJAX response instead of fixed timeout



   * 3. Uses jQuery for dropdown selection (most reliable for Bootstrap Select)



   * 4. Explicit error handling with validation error reporting



   */



  private async fillGenericContract(tipoVal: '1' | '2', entityName: string, selectId: string) {



    const nro = this.generateRandomId();



    logger.info(`📝 Creating contract [${nro}] tipo=${tipoVal === '1' ? 'COSTO' : 'VENTA'} for: ${entityName}`);



    await this.page.goto(`${this.baseUrl}/contrato/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.fill('#contrato-nro_contrato', nro);







    // 1. Set tipo using jQuery trigger (works with Bootstrap Select)



    logger.info(`📋 Setting contract type to: ${tipoVal === '1' ? 'COSTO' : 'VENTA'}`);



    await this.page.evaluate((val: string) => {



      const $ = (window as any).jQuery;



      if ($) {



        $('#contrato-tipo_tarifa_contrato_id').val(val).trigger('change');



      } else {



        const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;



        if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }



      }



    }, tipoVal);







    // 2. Wait for form reconfiguration (rendersubview AJAX)



    logger.info('⏳ Waiting for form to reconfigure...');



    await this.page.waitForResponse(



      r => r.url().includes('rendersubview') && r.status() === 200,



      { timeout: 15000 }



    ).catch(() => {



      logger.warn('⚠️ rendersubview response not detected, using fallback wait');



    });



    await this.page.waitForTimeout(1000); // Brief DOM stabilization







    // 3. For VENTA (tipo=2), wait for and set subtipo dropdown



    if (tipoVal === '2') {



      logger.info('📋 Setting subtipo for VENTA contract...');



      await this.page.waitForSelector('select#tipo', { state: 'attached', timeout: 5000 }).catch(() => {



        logger.warn('⚠️ select#tipo not found, skipping subtipo');



      });







      const tipoSelect = this.page.locator('select#tipo');



      if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {



        await this.page.evaluate(() => {



          const el = document.querySelector('select#tipo') as HTMLSelectElement;



          if (el) { el.value = '1'; el.dispatchEvent(new Event('change')); }



        });



        await this.page.waitForTimeout(500);



      }



    }







    // 4. Select entity using jQuery (most reliable for Bootstrap Select)



    logger.info(`📋 Selecting ${tipoVal === '1' ? 'Transportista' : 'Cliente'}: "${entityName}"`);







    const selectionResult = await this.page.evaluate(({ selectIdFull, nombre }) => {



      const $ = (window as any).jQuery;



      if (!$) return { success: false, msg: 'jQuery not available' };







      const $sel = $(`#${selectIdFull}`);



      if (!$sel.length) return { success: false, msg: `Select #${selectIdFull} not found` };







      const matchingOption = $sel.find('option').filter(function(this: any) {



        return ($(this).text() || '').toUpperCase().includes(nombre.toUpperCase());



      });







      if (!matchingOption.length) return { success: false, msg: `Option containing "${nombre}" not found` };







      const val = matchingOption.val();



      $sel.val(val).trigger('change');







      // Refresh Bootstrap Select visual if available



      if ($sel.selectpicker) {



        $sel.selectpicker('refresh');



      }







      return { success: true, value: val, text: matchingOption.text() };



    }, { selectIdFull: selectId, nombre: entityName });







    if (!selectionResult.success) {



      logger.error(`❌ Entity selection failed: ${selectionResult.msg}`);



      throw new Error(`Failed to select ${entityName}: ${selectionResult.msg}`);



    }



    logger.info(`✅ Selected: ${selectionResult.text} (value: ${selectionResult.value})`);







    await this.page.waitForTimeout(500);







    // 5. Save with navigation wait



    logger.info('💾 Saving contract header...');



    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {



        logger.warn('⚠️ Navigation timeout, checking URL...');



      }),



      this.page.click('#btn_guardar')



    ]);







    // 6. Verify save success



    const currentUrl = this.page.url();



    if (currentUrl.includes('/editar/')) {



      logger.info(`✅ Contract header saved! Adding routes...`);



      await this.addRouteAndTarifas('20000', '50000');



    } else if (currentUrl.includes('/crear')) {



      // Check for validation errors



      const errors = await this.page.locator('.has-error, .invalid-feedback, .alert-danger').allTextContents();



      if (errors.length > 0) {



        logger.error(`❌ Validation errors: ${errors.join(' | ')}`);



        throw new Error(`Contract save failed with errors: ${errors.join(' | ')}`);



      }



      logger.warn(`⚠️ Still on create page. URL: ${currentUrl}`);



    } else {



      logger.info(`⚠️ Contract form submitted (URL: ${currentUrl})`);



    }



  }







  private async addRouteAndTarifas(tarifaConductor: string, tarifaViaje: string): Promise<void> {



    logger.info('🛣️ Adding Route 715 and Cargo with SLOW tarifa entry...');







    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(500);







    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();



    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });



    await btnAnadirRuta.scrollIntoViewIfNeeded();



    await btnAnadirRuta.click();







    try {



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });



    } catch {



      logger.warn('⚠️ Modal did not open, retrying...');



      await this.page.waitForTimeout(500);



      await btnAnadirRuta.click();



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });



    }







    await this.page.click('a#btn_plus_715');



    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();



    if (await closeBtn.isVisible()) await closeBtn.click();







    await this.page.click('#btn_click_715');



    await this.page.waitForTimeout(1000);







    await this.page.click('a#btn_plus_ruta_715_19');







    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(1000);







    logger.info(`💰 Filling tarifa conductor SLOWLY: ${tarifaConductor}`);



    await this.fillSlowly('#txt_tarifa_conductor_715', tarifaConductor, 100);







    logger.info(`💰 Filling tarifa viaje SLOWLY: ${tarifaViaje}`);



    await this.fillSlowly('#txt_tarifa_extra_715', tarifaViaje, 100);







    await this.page.waitForTimeout(2000);







    logger.info('💾 Saving contract with routes...');



    await this.page.click('#btn_guardar');



    await this.page.waitForTimeout(3000);







    const finalUrl = this.page.url();



    if (finalUrl.includes('/editar/') || finalUrl.includes('/index')) {



      logger.info('✅ Contract with routes saved successfully');



    } else {



      logger.warn(`⚠️ Contract save status uncertain (URL: ${finalUrl})`);



    }



  }







  async createContratoCosto(transportistaNombre: string) {



    await this.fillGenericContract('1', transportistaNombre, 'contrato-transportista_id');



  }







  async createContratoVenta(clienteNombre: string) {



    await this.fillGenericContract('2', clienteNombre, 'contrato-cliente_id');



  }







  // --- 6. PLANIFICAR VIAJE ---



  async createViaje(clienteNombre: string, nroViaje: string) {



    logger.info(`🚚 UI: Creating Viaje [${nroViaje}] for Cliente [${clienteNombre}]`);







    await this.page.goto(`${this.baseUrl}/viajes/crear`);



    await this.page.waitForLoadState('domcontentloaded');



    await this.page.waitForTimeout(1000);







    await this.page.fill('#viajes-nro_viaje', nroViaje);



    logger.info(`✅ Filled Nro Viaje: ${nroViaje}`);







    await this.selectBootstrapDropdownSimple('button[data-id="tipo_operacion_form"]', 'tclp2210', 'Tipo Operación');



    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_servicio_id"]', 'tclp2210', 'Tipo Servicio');



    await this.selectBootstrapDropdownSimple('button[data-id="viajes-cliente_id"]', clienteNombre, 'Cliente');



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForTimeout(1500);







    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_viaje_id"]', 'Normal', 'Tipo Viaje');



    await this.selectBootstrapDropdownSimple('button[data-id="viajes-unidad_negocio_id"]', 'Defecto', 'Unidad Negocio');



    await this.page.waitForLoadState('networkidle');







    await this.selectBootstrapDropdownSimple('button[data-id="viajes-carga_id"]', 'Pallet_Furgon_Frio_10ton', 'Código Carga');



    await this.page.keyboard.press('Tab');



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForTimeout(2000);







    logger.info('📍 Adding Route...');



    const btnAgregarRuta = this.page.locator('button:has-text("Agregar Ruta")').first();



    await btnAgregarRuta.waitFor({ state: 'visible', timeout: 15000 });



    await expect(btnAgregarRuta).toBeEnabled({ timeout: 20000 });



    await btnAgregarRuta.click();



    await this.page.waitForTimeout(1000);







    const ruta715Selector = this.page.locator(`//tr[td[contains(., '715')]]//i`).first();



    const rutaGenericaSelector = this.page.locator('#tabla-rutas tbody tr .btn-success').first();







    if (await ruta715Selector.isVisible({ timeout: 5000 }).catch(() => false)) {



      await ruta715Selector.click();



      logger.info('✅ Route 715 selected (Specific XPath)');



    } else if (await rutaGenericaSelector.isVisible({ timeout: 2000 }).catch(() => false)) {



      await rutaGenericaSelector.click();



      logger.warn('⚠️ Route 715 not found, selected first available route instead.');



    } else {



      logger.warn('⚠️ No route found in modal to select.');



    }







    await this.page.waitForTimeout(1000);







    logger.info('💾 Clicking Guardar...');



    await this.page.click('#btn_guardar_form');



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForTimeout(2000);







    const successToast = this.page.locator('text="Viaje Creado con éxito"');



    const nroViajeVal = await this.page.locator('#viajes-nro_viaje').inputValue().catch(() => '');







    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false) || nroViajeVal === '') {



      logger.info(`✅ Viaje [${nroViaje}] created successfully via UI`);



    } else {



      logger.warn(`⚠️ Could not confirm viaje creation, continuing...`);



    }



  }



 // --- 7. ASIGNAR VIAJE (ORDENADO: Selección -> Espera -> Healer -> Vehículo) ---

  async assignViaje(nroViaje: string, transportistaNombre: string, patenteVehiculo: string, nombreConductor: string) {

    logger.info(`🚚 UI: Assigning Viaje [${nroViaje}]`);

   

    // 1. Navegar y Buscar

    await this.page.goto(`${this.baseUrl}/viajes/asignar`);

    const search = this.page.locator('#search');

    await search.fill(nroViaje);

    await search.press('Enter');

    await this.page.waitForTimeout(2000);

   

    await this.page.locator('a[href*="asignar"], a[href*="update"]').first().click();

    await this.page.waitForLoadState('domcontentloaded');

   

    // ---------------------------------------------------------

    // PASO A: GESTIÓN DEL TRANSPORTISTA (CRÍTICO)

    // ---------------------------------------------------------

   

    // A.1 Selección Inicial

    await this.selectTransportistaRobust(transportistaNombre);

   

    // A.2 Espera de Estabilización (Cascada AJAX)

    // Damos tiempo a que Bermann cargue los vehículos y termine de "temblar"

    logger.info('⏳ Waiting 4s for vehicle cascade stabilization...');

    await this.page.locator('body').click(); // Blur para asegurar evento

    await this.page.waitForTimeout(4000);



    // A.3 Auto-Curación (Healer)

    // Verificamos si el sistema reseteó el campo. Si es así, lo corregimos ANTES de seguir.

    const currentTrans = await this.page.locator('#s2id_Viajes_transportista_id .select2-chosen').textContent();

   

    if (!currentTrans?.toUpperCase().includes(transportistaNombre.toUpperCase())) {

        logger.warn(`⚠️ Transportista reset detected! Re-applying value...`);

       

        // Re-seleccionamos

        await this.selectTransportistaRobust(transportistaNombre);

        await this.page.locator('body').click();

       

        // Esperamos un poco más para asegurar que esta segunda selección pegue

        await this.page.waitForTimeout(3000);

    } else {

        logger.info('✅ Transportista is stable.');

    }



    // ---------------------------------------------------------

    // PASO B: SELECCIÓN DE VEHÍCULO (AHORA SEGURO)

    // ---------------------------------------------------------

   

    // B.1 Esperar a que los datos existan (usando el ID correcto)

    logger.info(`⏳ Waiting for Vehicle data in #viajes-vehiculo_uno_id...`);

    try {

        await this.page.waitForFunction(() => {

            const select = document.querySelector('#viajes-vehiculo_uno_id') as HTMLSelectElement;

            // Opción 0 es "Seleccione...", esperamos que haya más

            return select && select.options.length > 1;

        }, null, { timeout: 15000 });

        logger.info('✅ Vehicle data loaded!');

    } catch (e) {

        logger.warn('⚠️ Timeout waiting for vehicle data. Attempting selection anyway...');

    }



    // B.2 Selección por Inyección JS (ID Corregido)

    logger.info(`🚛 Selecting Vehicle via JS: ${patenteVehiculo}`);

    await this.forceSelectByText('viajes-vehiculo_uno_id', patenteVehiculo);

   

    await this.page.waitForTimeout(1000); // Esperar eventos onchange del vehículo



    // ---------------------------------------------------------

    // PASO C: CONDUCTOR Y GUARDADO

    // ---------------------------------------------------------



    // C.1 Selección Conductor

    logger.info(`👨‍✈️ Selecting Conductor: ${nombreConductor}`);

    await this.forceSelectByText('viajes-conductor_id', nombreConductor);

    await this.page.waitForTimeout(500);



    // C.2 Guardar

    logger.info('💾 Clicking Guardar...');

    await this.page.click('#btn_guardar_form');



    // C.3 Manejo Modal Confirmación

    const modal = this.page.locator('text=Confirmación');

    if (await modal.isVisible({ timeout: 3000 }).catch(()=>false)) {

        logger.info('⚠️ Accepting confirmation modal...');

        await this.page.locator('button:has-text("Aceptar")').click();

    }



    // C.4 Validación Final

    await expect(this.page.locator('body')).toContainText('éxito', { timeout: 20000 });

    logger.info(`✅ Viaje assigned successfully`);

  }



  // --- UTILS ---



/**



   * Selector ULTRA ROBUSTO para Transportistas (Actualizado)



   */



  async selectTransportistaRobust(nombreTransportista: string) {



    logger.info(`🛡️ Robust Selection: Intentando seleccionar Transportista "${nombreTransportista}"`);



   



    const container = this.page.locator('#s2id_Viajes_transportista_id');



    const inputSearch = this.page.locator('#s2id_autogen20_search, .select2-input, input.select2-search__field').first();



   



    // INTENTO 1: Vía UI Estándar (Select2)



    try {



      if (await container.isVisible({ timeout: 2000 })) {



        await container.click();



        await this.page.waitForTimeout(500);



       



        await inputSearch.fill(nombreTransportista);



        await this.page.waitForTimeout(1500);



        await inputSearch.press('Enter');



        await this.page.waitForTimeout(1000);



      }



    } catch (e) {



      logger.warn('⚠️ UI Selection glitch, ensuring with JS...');



    }







    // INTENTO 2: Inyección de JS (Siempre ejecuta para asegurar)



    logger.info('💉 Ensuring value with JS Injection...');



   



    await this.page.evaluate((targetName) => {



      const selectElement = document.querySelector('select[id$="transportista_id"]') as HTMLSelectElement;



     



      if (selectElement) {



        const options = Array.from(selectElement.options);



        const matchingOption = options.find(opt =>



          opt.text.toLowerCase().includes(targetName.toLowerCase())



        );







        if (matchingOption) {



          selectElement.value = matchingOption.value;



         



          // Disparar todos los eventos posibles para que Yii2 reaccione



          selectElement.dispatchEvent(new Event('input', { bubbles: true }));



          selectElement.dispatchEvent(new Event('change', { bubbles: true }));



         



          // Actualizar visualmente el Select2 (Legacy)



          // @ts-ignore



          if (window.jQuery) {



             // @ts-ignore



             window.jQuery(selectElement).trigger('change');



             // @ts-ignore



             if (window.jQuery(selectElement).select2) {



                // @ts-ignore



                window.jQuery(selectElement).select2('data', { id: matchingOption.value, text: matchingOption.text });



             }



          }



        }



      }



    }, nombreTransportista);







    await this.page.waitForTimeout(1000);



  }











  private async selectBootstrapDropdownSimple(buttonSelector: string, textToSelect: string, fieldName: string): Promise<void> {



    logger.info(`📋 Selecting ${fieldName}: "${textToSelect}"`);



    const btn = this.page.locator(buttonSelector);



    await btn.waitFor({ state: 'visible', timeout: 10000 });



    await btn.scrollIntoViewIfNeeded();



    await btn.click();







    const parent = btn.locator('xpath=..');



    const dropdownMenu = parent.locator('div.dropdown-menu.show').first();



    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });







    const searchBox = dropdownMenu.locator('.bs-searchbox input');



    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {



      await searchBox.fill(textToSelect);



      await this.page.waitForTimeout(500);



      await this.page.keyboard.press('Enter');



    } else {



      const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();



      await option.click();



    }







    if (await dropdownMenu.isVisible({ timeout: 500 }).catch(() => false)) {



      await this.page.keyboard.press('Escape');



    }



    await this.page.waitForTimeout(300);



    logger.info(`✅ ${fieldName} selected`);



  }







  private async forceSelectByText(selectId: string, textToSelect: string): Promise<void> {



    logger.info(`💉 JS Injection: Forcing selection in #${selectId} -> "${textToSelect}"`);







    const result = await this.page.evaluate(({ id, text }) => {



      const select = document.getElementById(id) as HTMLSelectElement;



      if (!select) return { success: false, msg: 'Select element not found' };







      const option = Array.from(select.options).find(opt =>



        opt.text.toUpperCase().includes(text.toUpperCase())



      );







      if (!option) return { success: false, msg: `Option containing "${text}" not found in #${id}` };







      select.value = option.value;







      select.dispatchEvent(new Event('change', { bubbles: true }));



      select.dispatchEvent(new Event('input', { bubbles: true }));







      // @ts-ignore



      if (window.jQuery && window.jQuery(select).selectpicker) {



        // @ts-ignore



        window.jQuery(select).selectpicker('refresh');



        // @ts-ignore



        window.jQuery(select).selectpicker('render');



      }







      return { success: true, value: option.value, text: option.text };







    }, { id: selectId, text: textToSelect });







    if (!result.success) {



      logger.error(`❌ JS Injection Failed: ${result.msg}`);



    } else {



      logger.info(`✅ JS Injection Success: Selected value [${result.value}] for text "${result.text}"`);



    }



  }



}