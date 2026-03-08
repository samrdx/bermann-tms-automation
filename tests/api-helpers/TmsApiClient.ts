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
    // IMPORTANT: Use the same URL resolution logic as playwright.config.ts
    // to ensure TmsApiClient navigates to the same domain as the storageState cookies.
    // playwright.config.ts uses ENV (not BASE_URL) to pick the environment URL.
    // Using BASE_URL directly can cause a domain mismatch (e.g. BASE_URL=demo but
    // storageState cookies are for QA), which silently redirects to /login.
    const ENV = process.env.ENV || 'QA';
    this.baseUrl = ENV === 'DEMO'
      ? (process.env.BASE_URL_DEMO || 'https://demo.bermanntms.cl')
      : 'https://moveontruckqa.bermanntms.cl';



  }

  async initialize(): Promise<void> {

    logger.info(`✅ TmsApiClient initialized`);

  }

  private generateRandomId(): string {

    return String(Math.floor(100000 + Math.random() * 900000));


  }

  /**
   * Helper para escribir texto lentamente simulando escritura humana.
   */

  private async fillSlowly(selector: string, value: string, delay: number = 80): Promise<void> {

    const locator = this.page.locator(selector);

    await locator.evaluate(el => (el as HTMLElement).click());

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
    * FIX FIREFOX: Usa .fill('') en lugar de triple clic para limpiar.
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

    // --- Intento 1: Escritura limpia y rápida ---
    // FIX: Usamos fill('') que es atómico y no falla en Firefox por latencia
    await locator.fill('');
    await this.page.waitForTimeout(100);

    await locator.pressSequentially(rawWithHyphen, { delay: 100 });
    await this.page.waitForTimeout(500);

    let currentValue = await locator.inputValue();
    let normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT verified (attempt 1): ${currentValue}`);
      return;
    }

    // --- Intento 2: Retry más lento ---
    logger.warn(`⚠️ RUT mismatch (attempt 1). Got: [${currentValue}], Expected: [${normalizedExpected}]. Retrying slower...`);

    await locator.fill(''); // FIX: Limpieza segura nuevamente
    await this.page.waitForTimeout(200);

    const retryRut = verificationDigit === 'K' ? `${rutBody}-k` : rawWithHyphen;
    await locator.pressSequentially(retryRut, { delay: 150 });
    await this.page.waitForTimeout(500);

    currentValue = await locator.inputValue();
    normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT verified (attempt 2): ${currentValue}`);
      return;
    }

    // --- Intento 3: Fallback JavaScript (Inyección Directa) ---
    logger.warn(`⚠️ RUT mismatch (attempt 2). Using JS fallback...`);
    const tmsFormatted = formatTmsRut(rutBody, verificationDigit);

    await this.page.evaluate(
      ({ sel, formattedValue }) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (input) {
          // Desactivamos listeners temporalmente para evitar interferencia del input mask
          const savedOnInput = input.oninput;
          const savedOnChange = input.onchange;

          input.value = formattedValue;

          // Disparamos eventos manualmente
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

    logger.error(`❌ RUT validation FAILED. Final: [${currentValue}], Expected: [${rutValue}]`);
  }

  // --- 1. TRANSPORTISTA ---
  async createTransportista(nombre: string, documento: string): Promise<string> {
    const rut = documento; // Use the provided documento for form filling and later search

    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: [${rut}]`);

    await this.page.goto(`${this.baseUrl}/transportistas/crear`);
    await this.page.waitForLoadState('networkidle');

    // Llenado de formulario
    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.typeRutSlowly('input[name="Transportistas[documento]"]', rut);
    await this.page.fill('input[name="Transportistas[calle]"]', generateChileanStreet());
    await this.page.fill('input[name="Transportistas[altura]"]', generateStreetNumber());

    // Selección de Dropdowns + Evento Change (Para validaciones de frontend)
    await this.page.selectOption('select[name="Transportistas[tipo_transportista_id]"]', '1');
    await this.page.locator('select[name="Transportistas[tipo_transportista_id]"]').dispatchEvent('change');

    await this.page.selectOption('select[name="Transportistas[region_id]"]', '1');
    await this.page.selectOption('select[name="Transportistas[ciudad_id]"]', '1');
    await this.page.selectOption('select[name="Transportistas[comuna_id]"]', '2');

    // Pausa técnica para estabilidad en Firefox
    await this.page.waitForTimeout(500);

    // --- GUARDADO ROBUSTO (JS INJECTION) ---
    logger.info('💾 Saving Transportista via JS Injection...');

    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),

      // FIX: Usamos evaluate() para hacer click directo en el DOM.
      // Esto evita que Firefox falle esperando que el botón sea "estable" o visible si hay overlays.
      this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button.btn-success, input[type="submit"].btn-success'));
        const btnGuardar = buttons.find(b => b.textContent?.includes('Guardar') || (b as HTMLInputElement).value?.includes('Guardar'));

        if (btnGuardar) {
          (btnGuardar as HTMLElement).click();
        } else {
          throw new Error('JS Injection: Botón Guardar no encontrado en el DOM');
        }
      })
    ]);

    logger.info(`✅ Transportista [${nombre}] created successfully`);

    // --- EXTRACCIÓN DE ID ---
    let id = '0';
    let currentUrl = this.page.url();
    logger.info(`📍 URL after save: ${currentUrl}`);

    // 1. Intentar extraer de la URL directa (ej: /view/123)
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);

    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ Transportista ID extracted from URL: ${id}`);
    } else {
      logger.info('⚠️ Redirected to Index. Executing Grid Rescue...');
      let foundViaRut = false;

      // Navigate to index to ensure we are on the grid page
      await this.page.goto(`${this.baseUrl}/transportistas/index`);
      await this.page.waitForTimeout(2000); // Give time for grid to load

      // PRIMARY STRATEGY: Search by RUT (Documento)
      logger.info(`🔍 Searching by RUT: ${documento}`);
      const rutFilterInput = this.page.locator('input[name*="[documento]"]')
        .or(this.page.locator('input[name*="[rut]"]'))
        .or(this.page.locator('thead th:has-text("RUT") + th input, thead input').first())
        .first();

      if (await rutFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const searchRut = documento.replace(/[.-]/g, '');
        await rutFilterInput.fill(searchRut);
        await rutFilterInput.press('Enter');
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
        await this.page.waitForTimeout(1500);

        const rutRow = this.page.locator('table tbody tr').filter({ hasText: new RegExp(searchRut.slice(0, 6), 'i') }).first();
        if (await rutRow.count() > 0) {
          const dataKey = await rutRow.getAttribute('data-key');
          if (dataKey) {
            id = dataKey;
            foundViaRut = true;
            logger.info(`✅ Rescued ID via RUT search (data-key): ${id}`);
          } else {
            const actionLink = rutRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
            if (await actionLink.count() > 0) {
              const href = await actionLink.getAttribute('href');
              const match = href?.match(/(\d+)/);
              if (match) {
                id = match[1];
                foundViaRut = true;
                logger.info(`✅ Rescued ID via RUT search (link): ${id}`);
              }
            }
          }
        }
      }

      // FALLBACK STRATEGY: Search by Name (if RUT search fails)
      if (!foundViaRut) {
        logger.warn('⚠️ RUT search failed, falling back to name-based search...');
        const searchInput = this.page.locator('#search');
        await searchInput.fill(nombre);
        logger.info(`🔎 Filled search with: ${nombre}`);

        // FIX FIREFOX: Use JS click on #buscar instead of getByRole which fails in Firefox
        await this.page.evaluate(() => {
          const btn = document.getElementById('buscar');
          if (btn) btn.click();
          else console.error('Botón Buscar no encontrado');
        });
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
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

    // --- FIX FIREFOX: Clics vía JS para evitar Timeouts de estabilidad ---

    // 1. Tipo Cliente
    await this.clickViaJS('button[data-id="clientes-tipo_cliente_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // 2. Región
    await this.clickViaJS('button[data-id="clientes-region_id"]');
    await this.page.waitForTimeout(800); // Un poco más de tiempo para carga de cascada
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // 3. Ciudad
    await this.page.waitForTimeout(1000); // Esperar carga AJAX
    await this.clickViaJS('button[data-id="clientes-ciudad_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // 4. Comuna
    await this.page.waitForTimeout(1000);
    await this.clickViaJS('button[data-id="clientes-comuna_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // --- Gestión de Polígonos (CRITICAL for Origen/Destino in Viajes) ---
    // CORRECTED: data-id is "drop_zones" NOT "poligono"
    logger.info('📍 Selecting Polígonos (drop_zones)...');
    const poligonosBtn = this.page.locator('button[data-id="drop_zones"]').first();

    if (await poligonosBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to open dropdown
      await poligonosBtn.evaluate(el => (el as HTMLElement).click());
      await this.page.waitForTimeout(800);

      // Click "Seleccionar Todos" button
      const selectAllBtn = this.page.locator('.dropdown-menu.show button.bs-select-all').first();
      if (await selectAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await selectAllBtn.evaluate(el => (el as HTMLElement).click());
        logger.info('✅ Polígonos: Seleccionar Todos clicked');
        await this.page.waitForTimeout(500);
      } else {
        // Fallback: use JS to select all options
        logger.warn('⚠️ Seleccionar Todos button not found, using JS fallback...');
        await this.page.evaluate(() => {
          const select = document.getElementById('drop_zones') as HTMLSelectElement;
          if (select) {
            Array.from(select.options).forEach(opt => opt.selected = true);
            select.dispatchEvent(new Event('change', { bubbles: true }));
            // @ts-ignore
            if (window.jQuery && window.jQuery(select).selectpicker) {
              // @ts-ignore
              window.jQuery(select).selectpicker('refresh');
            }
          }
        });
        logger.info('✅ Polígonos: All selected via JS');
      }

      // Close dropdown
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    } else {
      logger.warn('⚠️ Polígonos dropdown button not visible');
    }

    // --- GUARDADO ---
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded').catch(() => { }),
      this.clickViaJS('#btn_guardar')
    ]);

    // ... (El resto de la lógica de extracción de ID se mantiene igual)
    return this.extractIdAfterSave(nombre, 'Cliente');
  }

  /**
   * HELPER: Extrae el ID de la entidad creada (Transportista, Cliente, etc.)
   * Intenta primero por URL (si redirige a /ver/123) y luego usa el buscador de la grilla.
   */
  private async extractIdAfterSave(nombre: string, entityLabel: string): Promise<string> {
    let id = '0';
    let currentUrl = this.page.url();
    logger.info(`📍 URL after save (${entityLabel}): ${currentUrl}`);

    // 1. Intentar extraer de la URL directa (ej: /view/123)
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ ${entityLabel} ID extracted from URL: ${id}`);
      return id;
    }

    // 2. Si no redirigió, usar el buscador de la grilla
    logger.info(`🔍 Using search filter to find ${entityLabel}: ${nombre}`);
    await this.page.waitForTimeout(1000);

    const searchInput = this.page.locator('#search');
    await searchInput.fill(nombre);
    logger.info(`🔎 Filled search with: ${nombre}`);

    // CORRECCIÓN FIREFOX: Clic vía JS directo al ID 'buscar'
    // Reemplaza: await this.page.getByRole('link', { name: 'Buscar' }).click();
    await this.page.evaluate(() => {
      const btn = document.getElementById('buscar');
      if (btn) btn.click();
      else console.error('Botón Buscar no encontrado');
    });

    await this.page.waitForLoadState('networkidle');
    logger.info(`🔎 Clicked Buscar link (JS)`)
    await this.page.waitForTimeout(2000);

    // 3. Buscar en la tabla por data-key
    const row = this.page.locator('table tbody tr[data-key]').filter({ hasText: nombre }).first();

    if (await row.count() > 0) {
      const dataKey = await row.getAttribute('data-key');
      if (dataKey) {
        id = dataKey;
        logger.info(`✅ ${entityLabel} ID from data-key: ${id}`);
        return id;
      }
    }

    // 4. Fallback: Buscar cualquier fila que tenga el texto
    logger.info(`🔎 Trying alternative search in table...`);
    const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();

    if (await anyRow.count() > 0) {
      const dataKey = await anyRow.getAttribute('data-key');
      if (dataKey) {
        id = dataKey;
        logger.info(`✅ ${entityLabel} ID from fallback data-key: ${id}`);
        return id;
      }

      // Intentar sacar ID de algún link de editar/ver dentro de la fila
      const link = anyRow.locator('a[href*="/ver/"], a[href*="/editar/"]').first();
      if (await link.count() > 0) {
        const href = await link.getAttribute('href');
        const match = href?.match(/\/(\d+)/);
        if (match) {
          id = match[1];
          logger.info(`✅ ${entityLabel} ID from link: ${id}`);
          return id;
        }
      }
    }

    if (id === '0') {
      logger.error(`❌ Could not extract ${entityLabel} ID for: ${nombre}`);
      throw new Error(`Failed to extract ${entityLabel} ID for: ${nombre}`);
    }

    return id;
  }

  /**
     * HELPER: Realiza un clic directo en el DOM usando la referencia del elemento de Playwright.
     * Ventaja: Soporta selectores complejos (:has-text, xpath) y evita Timeouts de estabilidad.
     */
  private async clickViaJS(selector: string): Promise<void> {
    logger.info(`⚡ JS Click: ${selector}`);

    // 1. Resolvemos el elemento con Playwright (así entiende :has-text, xpath, etc.)
    const locator = this.page.locator(selector).first();

    // 2. Esperamos a que exista en el DOM (attached)
    await locator.waitFor({ state: 'attached', timeout: 15000 });

    // 3. Ejecutamos el click nativo sobre el elemento ya resuelto
    await locator.evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.click();
      } else {
        console.error('Element is not clickable via JS:', el);
      }
    });
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







    await this.page.evaluate(() => {
      const btn = document.querySelector('button[data-id="vehiculos-transportista_id"]') as HTMLElement;
      if (btn) btn.click();
    });



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



    await this.page.evaluate(() => {
      const btn = document.querySelector('button[data-id="vehiculos-tipo_vehiculo_id"]') as HTMLElement;
      if (btn) btn.click();
    });



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



      await capacidadBtn.evaluate(el => (el as HTMLElement).click());



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







    // FIX FIREFOX: Limpiar modal-backdrop antes de Guardar
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(300);

    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }),



      this.page.evaluate(() => {
        const btn = (document.getElementById('btn_guardar')
          || Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Guardar')) as HTMLElement;
        if (btn) btn.click();
      })



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







    await this.page.evaluate(() => {
      const btn = document.querySelector('button[data-id="conductores-licencia"]') as HTMLElement;
      if (btn) btn.click();
    });



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







    await this.page.evaluate(() => {
      const btn = document.querySelector('button[data-id="conductores-transportista_id"]') as HTMLElement;
      if (btn) btn.click();
    });



    await this.page.waitForTimeout(500);



    const searchBox = this.page.locator('.dropdown-menu.show .bs-searchbox input');



    if (await searchBox.isVisible()) {



      await searchBox.fill(transportistaNombre);



      await this.page.waitForTimeout(1000);



    }



    await this.page.keyboard.press('ArrowDown');



    await this.page.keyboard.press('Enter');



    await this.page.waitForTimeout(500);







    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.evaluate(() => { const b = document.getElementById('btn_guardar') as HTMLElement; if (b) b.click(); });



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



    logger.info('⏳ Waiting for form to reconfigure...');
    await Promise.all([
      this.page.waitForResponse(
        r => r.url().includes('rendersubview') && r.status() === 200,
        { timeout: 15000 }
      ).catch(() => {
        logger.warn('⚠️ rendersubview response not detected, using fallback wait');
      }),
      this.page.evaluate((val: string) => {
        const $ = (window as any).jQuery;
        if ($) {
          $('#contrato-tipo_tarifa_contrato_id').val(val).trigger('change');
        } else {
          const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
          if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      }, tipoVal)
    ]);



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







      const matchingOption = $sel.find('option').filter(function (this: any) {



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

    // 4.5 [DEMO ONLY] Set Fecha vencimiento + Unidad de negocio
    const isDemo = process.env.ENV === 'DEMO';
    if (isDemo) {
      logger.info('📅 [DEMO] Setting Fecha vencimiento via JS con Eventos...');
      await this.page.evaluate(() => {
        const dp = document.getElementById('contrato-fecha_vencimiento') as HTMLInputElement;
        if (dp) {
          dp.value = '31-12-2026';
          dp.dispatchEvent(new Event('input', { bubbles: true }));
          dp.dispatchEvent(new Event('change', { bubbles: true }));
          dp.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      });

      logger.info('🏢 [DEMO] Selecting Unidad de negocio: Defecto...');
      await this.page.evaluate(() => {
        const selectId = 'drop_business_unit';
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (select) {
          const opt = Array.from(select.options).find(o => o.text.includes('Defecto'));
          if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            // @ts-ignore
            const $ = window.jQuery;
            if ($ && $(`#${selectId}`).selectpicker) {
              $(`#${selectId}`).selectpicker('refresh');
            }
          }
        }
      });
    }

    // 5. Save with navigation wait
    logger.info('💾 Saving contract header...');

    // FIX FIREFOX: Limpiar modal-backdrop residuales que bloquean page.click() en Firefox
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(300);

    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {



        logger.warn('⚠️ Navigation timeout, checking URL...');



      }),



      // FIX FIREFOX: JS click bypasea overlays invisibles que causan TimeoutError
      this.page.evaluate(() => {
        const btn = document.getElementById('btn_guardar') as HTMLElement;
        if (btn) btn.click();
        else console.error('btn_guardar not found');
      })



    ]);







    // 6. Verify save success



    const currentUrl = this.page.url();



    if (currentUrl.includes('/editar/')) {



      logger.info(`✅ Contract header saved! Adding routes...`);



      await this.addRouteAndTarifas('20000', '50000');



    } else if (currentUrl.includes('/crear')) {
      logger.warn(`⚠️ Still on create page. URL: ${currentUrl}. Extrayendo campos con error...`);

      const errorFields = await this.page.evaluate(() => {
        const errorElements = document.querySelectorAll('.has-error, .is-invalid');
        const fields: string[] = [];
        errorElements.forEach(el => {
          // Si el propio elemento es un input/select
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            fields.push(el.id || el.getAttribute('name') || 'unknown');
          } else {
            // Si es un contenedor, buscar dentro
            const input = el.querySelector('input, select, textarea');
            if (input) fields.push(input.id || input.getAttribute('name') || 'unknown');
          }
        });
        return fields;
      });

      logger.error(`❌ Validation error fields: ${errorFields.join(', ')}`);
      await this.page.screenshot({ path: `reports/screenshots/stuck-contrato-${Date.now()}.png`, fullPage: true });

      if (errorFields.length > 0) {
        throw new Error(`Contract save failed. Invalid fields: ${errorFields.join(', ')}`);
      }
    } else {
      logger.info(`⚠️ Contract form submitted (URL: ${currentUrl})`);
    }



  }

  private async addRouteAndTarifas(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    const isDemo = process.env.ENV === 'DEMO';
    const routeId = isDemo ? '47' : '715';
    const routeCargoId = isDemo ? '47_6' : '715_19';

    logger.info(`🛣️ Adding Route ${routeId} and Cargo ${routeCargoId} with SLOW tarifa entry...`);







    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(500);







    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();



    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });



    await btnAnadirRuta.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));



    await btnAnadirRuta.evaluate(el => (el as HTMLElement).click());







    try {



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });



    } catch {



      logger.warn('⚠️ Modal did not open, retrying...');



      await this.page.waitForTimeout(500);



      await btnAnadirRuta.evaluate(el => (el as HTMLElement).click());



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });



    }







    const btnPlusRoute = this.page.locator(`#btn_plus_${routeId}`);
    await btnPlusRoute.waitFor({ state: 'attached', timeout: 5000 });
    await btnPlusRoute.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await btnPlusRoute.evaluate(el => (el as HTMLElement).click());

    // Wait for loading modal to disappear (CRITICAL: blocks all clicks)
    logger.info('⏳ Waiting for loading modal to disappear...');
    try {
      await this.page.waitForSelector('#modalCargando', { state: 'hidden', timeout: 15000 });
      logger.info('✅ Loading modal hidden');
    } catch {
      // Fallback: force-hide via JS if still visible
      logger.warn('⚠️ Loading modal timeout, forcing hide via JS...');
      await this.page.evaluate(() => {
        const loadingModal = document.getElementById('modalCargando');
        if (loadingModal) {
          loadingModal.classList.remove('show');
          loadingModal.style.display = 'none';
        }
        // Also clean up any backdrop
        document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      });
    }
    await this.page.waitForTimeout(500);

    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();

    if (await closeBtn.isVisible()) await closeBtn.evaluate(el => (el as HTMLElement).click());







    const btnClickRoute = this.page.locator(`#btn_click_${routeId}`);
    await btnClickRoute.waitFor({ state: 'attached', timeout: 5000 });
    await btnClickRoute.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await btnClickRoute.evaluate(el => (el as HTMLElement).click());

    // Wait for loading modal after expanding route
    try {
      await this.page.waitForSelector('#modalCargando', { state: 'hidden', timeout: 10000 });
    } catch {
      // Ignore - might not appear for this action
    }
    await this.page.waitForTimeout(1000);







    const btnPlusRouteCargo = this.page.locator(`#btn_plus_ruta_${routeCargoId}`);
    await btnPlusRouteCargo.waitFor({ state: 'attached', timeout: 5000 });
    await btnPlusRouteCargo.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await btnPlusRouteCargo.evaluate(el => {
      const icon = el.querySelector('i');
      if (icon) icon.click(); else (el as HTMLElement).click();
    });
    // Wait for loading modal after adding route tariff
    logger.info('⏳ Waiting for loading modal after route tariff...');
    try {
      await this.page.waitForSelector('#modalCargando', { state: 'hidden', timeout: 15000 });
    } catch {
      logger.warn('⚠️ Loading modal timeout, forcing hide...');
      await this.page.evaluate(() => {
        const m = document.getElementById('modalCargando');
        if (m) { m.classList.remove('show'); m.style.display = 'none'; }
      });
    }




    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(1000);







    logger.info(`💰 Filling tarifa conductor SLOWLY: ${tarifaConductor}`);



    await this.fillSlowly(`#txt_tarifa_conductor_${routeId}`, tarifaConductor, 100);







    logger.info(`💰 Filling tarifa viaje SLOWLY: ${tarifaViaje}`);



    await this.fillSlowly(`#txt_tarifa_extra_${routeId}`, tarifaViaje, 100);







    await this.page.waitForTimeout(2000);







    logger.info('💾 Saving contract with routes...');



    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.evaluate(() => { const b = document.getElementById('btn_guardar') as HTMLElement; if (b) b.click(); });



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

  // --- 6. PLANIFICAR VIAJE (FIX CARGA & AUTO-HEALING) ---
  async createViaje(clienteNombre: string, nroViaje: string) {
    logger.info(`🚚 UI: Creating Viaje [${nroViaje}] for Cliente [${clienteNombre}]`);

    await this.page.goto(`${this.baseUrl}/viajes/crear`);
    await this.page.waitForLoadState('networkidle');

    // --- FUNCIÓN HELPER: Llenar Formulario (Reutilizable para Auto-Healing) ---
    const fillForm = async (isRetry = false) => {
      logger.info(`📝 Filling Form (Retry: ${isRetry})...`);

      // 1. Campos de Texto
      await this.page.fill('#viajes-nro_viaje', nroViaje);

      const isDemo = process.env.ENV === 'DEMO';
      const tipoOperacionText = isDemo ? 'Distribución' : 'tclp2210';
      const tipoServicioText = isDemo ? 'Lcl' : 'tclp2210';

      // 2. Dropdowns Simples (Operación, Servicio, Cliente)
      // Usamos JS directo si es retry para mayor velocidad y seguridad
      if (isRetry) {
        await this.forceSelectByText('tipo_operacion_form', tipoOperacionText); // Asumiendo ID del select oculto
        await this.forceSelectByText('viajes-tipo_servicio_id', tipoServicioText);
        await this.forceSelectByText('viajes-cliente_id', clienteNombre);
      } else {
        await this.selectBootstrapDropdownSimple('button[data-id="tipo_operacion_form"]', tipoOperacionText, 'Tipo Operación');
        await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_servicio_id"]', tipoServicioText, 'Tipo Servicio');
        await this.selectBootstrapDropdownSimple('button[data-id="viajes-cliente_id"]', clienteNombre, 'Cliente');
      }

      if (!isRetry) await this.page.waitForTimeout(1000); // Esperar carga de datos del cliente

      const tipoViajeText = isDemo ? 'DIRECTO' : 'Normal';
      const codigoCargaText = isDemo ? 'CONTENEDOR DRY' : 'Pallet_Furgon_Frio_10ton';

      // 3. Tipos de Viaje
      if (isRetry) {
        await this.forceSelectByText('viajes-tipo_viaje_id', tipoViajeText);
        await this.forceSelectByText('viajes-unidad_negocio_id', 'Defecto');
      } else {
        await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_viaje_id"]', tipoViajeText, 'Tipo Viaje');
        await this.selectBootstrapDropdownSimple('button[data-id="viajes-unidad_negocio_id"]', 'Defecto', 'Unidad Negocio');
      }
    };

    // 1. LLENADO INICIAL
    await fillForm(false);

    // =======================================================================
    // 2. SELECCIÓN DE ORIGEN Y DESTINO (PASO A PASO - SIN RECARGA)
    // Secuencia: Carga ya seleccionada -> Abrir Origen -> Seleccionar -> Abrir Destino -> Seleccionar
    // IMPORTANTE: No usar forceSelectByText aquí porque dispara change y puede recargar
    // =======================================================================

    // PASO 1: ORIGEN
    logger.info('📍 PASO 1: Abriendo dropdown Origen...');
    const origenBtn = this.page.locator('button[data-id="_origendestinoform-origen"]').first();
    await origenBtn.waitFor({ state: 'visible', timeout: 10000 });
    await origenBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(800);

    // Esperar que el dropdown esté visible
    const origenDropdown = this.page.locator('button[data-id="_origendestinoform-origen"]').locator('xpath=..').locator('.dropdown-menu.show').first();
    await origenDropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Setup dynamic environment variables for Origen/Destino
    const isDemoForCarga = process.env.ENV === 'DEMO';
    const origenText = isDemoForCarga ? '233_CD SuperZoo_Quilicura' : '1_Agunsa_Lampa_RM-18';
    const destinoSearchText = isDemoForCarga ? 'Divisa' : '225_Starken';
    const destinoText = isDemoForCarga ? 'Divisa' : '225_Starken_Sn Bernardo-19';

    // Buscar en el searchbox si existe
    const origenSearchBox = origenDropdown.locator('.bs-searchbox input');
    if (await origenSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await origenSearchBox.fill(origenText);
      await this.page.waitForTimeout(500);
    }

    // PASO 2: Seleccionar opción Origen
    logger.info(`📍 PASO 2: Seleccionando "${origenText}"...`);
    const origenOption = origenDropdown.locator('li a, li span.text').filter({ hasText: origenText }).first();
    await origenOption.waitFor({ state: 'visible', timeout: 5000 });
    await origenOption.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);
    logger.info(`✅ Origen seleccionado: ${origenText}`);

    // PASO 3: DESTINO
    logger.info('📍 PASO 3: Abriendo dropdown Destino...');
    const destinoBtn = this.page.locator('button[data-id="_origendestinoform-destino"]').first();
    await destinoBtn.waitFor({ state: 'visible', timeout: 10000 });
    await destinoBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(800);

    // Esperar que el dropdown esté visible
    const destinoDropdown = this.page.locator('button[data-id="_origendestinoform-destino"]').locator('xpath=..').locator('.dropdown-menu.show').first();
    await destinoDropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Buscar en el searchbox si existe
    const destinoSearchBox = destinoDropdown.locator('.bs-searchbox input');
    if (await destinoSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await destinoSearchBox.fill(destinoSearchText);
      await this.page.waitForTimeout(500);
    }

    // PASO 4: Seleccionar opción Destino
    logger.info(`📍 PASO 4: Seleccionando "${destinoText}"...`);
    const destinoOptionItem = destinoDropdown.locator('ul.dropdown-menu.inner li a span.text').filter({ hasText: destinoText }).first();
    await destinoOptionItem.waitFor({ state: 'visible', timeout: 5000 });
    await destinoOptionItem.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);
    logger.info(`✅ Destino seleccionado: ${destinoText}`);

    // Esperar estabilización (sin networkidle que puede causar problemas)
    await this.page.waitForTimeout(2000);

    // =======================================================================
    // 3. SELECCIÓN DE CARGA (POST ORIGEN/DESTINO)
    // Se movió aquí porque elegir origen/destino puede gatillar AJAX
    // y limpiar las opciones de carga (quedando EMPTY) en Demo.
    // =======================================================================
    const codigoCargaTextFinal = isDemoForCarga ? 'CONTENEDOR DRY' : 'Pallet_Furgon_Frio_10ton';
    // FIX QA: Both QA and Demo use 'viajes-carga_id' (not 'viajes-codigo_carga_id')
    const cargaSelectIdFinal = 'viajes-carga_id';

    logger.info(`📦 SELECCIONANDO CARGA AL FINAL (Polling DOM for ${cargaSelectIdFinal} to have option ${codigoCargaTextFinal})...`);

    // Esperar explícitamente a que el AJAX traiga la opción de Carga
    await this.page.waitForFunction(({ id, text }) => {
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) return false;
      return Array.from(select.options).some(opt => opt.text.toUpperCase().includes(text.toUpperCase()));
    }, { id: cargaSelectIdFinal, text: codigoCargaTextFinal }, { timeout: 15000 }).catch(() => {
      logger.warn(`⚠️ Timeout esperando que la opción de carga '${codigoCargaTextFinal}' apareciera en '#${cargaSelectIdFinal}'.`);
    });

    await this.forceSelectByText(cargaSelectIdFinal, codigoCargaTextFinal);
    await this.page.waitForTimeout(1000);
    // DIAGNÓSTICO: Verificar estado completo del formulario (incluyendo Origen/Destino)
    const formDiag = await this.page.evaluate(() => {
      const ids = ['viajes-nro_viaje', 'tipo_operacion_form', 'viajes-tipo_servicio_id',
        'viajes-cliente_id', 'viajes-tipo_viaje_id', 'viajes-unidad_negocio_id',
        'viajes-carga_id', '_origendestinoform-origen', '_origendestinoform-destino'];
      return ids.map(id => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
        if (!el) return `${id}=NOT_FOUND`;
        if (el.tagName === 'SELECT') {
          const sel = el as HTMLSelectElement;
          return `${id}="${sel.options[sel.selectedIndex]?.text || 'EMPTY'}" (opts:${sel.options.length})`;
        }
        return `${id}="${el.value}"`;
      }).join(' | ');
    });
    logger.info(`📋 Form state before save: ${formDiag}`);

    // 14. PRE-GUARDAR: Limpiar modales/backdrops residuales que puedan interceptar el clic
    await this.page.evaluate(() => {
      const $ = (window as any).jQuery;
      if ($) {
        $('.modal').modal('hide');
        $('.bootbox').modal('hide');
      }
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(500);

    // 15. GUARDAR - con verificación de que el botón existe y es clickeable
    logger.info('💾 Clicking Guardar...');
    const guardarBtn = this.page.locator('#btn_guardar_form');
    await guardarBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll al botón para asegurar visibilidad
    await guardarBtn.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await this.page.waitForTimeout(300);

    // FIX FIREFOX: Limpiar modal-backdrop antes de Guardar
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });

    // Clic con espera de respuesta de red
    await Promise.all([
      this.page.waitForResponse(
        (resp: any) => resp.url().includes('/viajes/') && resp.status() < 400,
        { timeout: 15000 }
      ).catch(() => logger.warn('⚠️ No response captured after Guardar click')),
      guardarBtn.evaluate(el => (el as HTMLElement).click()),
    ]);

    await this.page.waitForLoadState('domcontentloaded').catch(() => { });
    await this.page.waitForTimeout(2000);

    // 16. VERIFICACIÓN POST-GUARDAR (3 estrategias en orden de fiabilidad)
    logger.info('⏳ Verificando creación del viaje...');

    // Estrategia 1: Toast exacto "Viaje Creado con éxito"
    const toastExacto = this.page.getByText('Viaje Creado con éxito', { exact: true });
    if (await toastExacto.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info(`✅ Viaje [${nroViaje}] creado exitosamente (toast exacto)`);
      return;
    }

    // Estrategia 2: Toast o alerta parcial
    const toastAlt = this.page.locator('.toast-success, .alert-success').first();
    if (await toastAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await toastAlt.textContent().catch(() => '');
      logger.info(`✅ Viaje [${nroViaje}] creado exitosamente (toast alt: "${text?.trim().substring(0, 60)}")`);
      return;
    }

    // Verificar si hay error visible ANTES de ir a la grilla
    const errors = await this.page.locator('.alert-danger, .has-error').allTextContents();
    const filteredErrors = errors.filter(e => e.trim().length > 0);
    if (filteredErrors.length > 0) {
      throw new Error(`❌ Error al guardar viaje: ${filteredErrors.join(' | ')}`);
    }

    // Estrategia 3: Verificar si redirigió (éxito silencioso) o buscar en grilla
    // FIX FIREFOX: Esperar a que la URL se estabilice antes de leerla (Firefox es más lento para redirigir)
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    logger.info(`⚠️ No se detectó toast. URL actual: ${currentUrl}`);

    // Si la URL cambió a /viajes/asignar, el viaje se creó correctamente
    if (currentUrl.includes('/viajes/asignar') || currentUrl.includes('/viajes/index')) {
      logger.info(`✅ Viaje [${nroViaje}] creado (redirect a ${currentUrl})`);
      return;
    }

    // Fallback: navegar a grilla y buscar
    logger.info('⚠️ Fallback: verificando en grilla de asignación...');
    await this.page.goto(`${this.baseUrl}/viajes/asignar`);
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
    await this.page.waitForTimeout(1500);

    const searchInput = this.page.locator('#search');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(nroViaje);
    await searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
    await this.page.waitForTimeout(1500);

    // Verificar por texto estricto
    const viajeRow = this.page.locator(`text="${nroViaje}"`);
    if (await viajeRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.info(`✅ Viaje [${nroViaje}] encontrado en grilla de asignación por texto`);
      return;
    }

    // Verificar por conteo de filas luego de aplicar el filtro
    const allRows = this.page.locator('table tbody tr');
    const rowCount = await allRows.count().catch(() => 0);
    if (rowCount >= 1) {
      logger.info(`✅ Viaje [${nroViaje}] creado: encontradas ${rowCount} filas en grilla de asignación`);
      return;
    }

    throw new Error(`❌ Viaje [${nroViaje}] no encontrado. El botón Guardar puede no haber ejecutado el submit. URL final: ${this.page.url()}`);
  }

  // --- ASEGÚRATE DE TENER ESTE HELPER (Lo usamos para la Carga) ---


  // --- 7. ASIGNAR VIAJE (ORDENADO: Selección -> Espera -> Healer -> Vehículo) ---
  async assignViaje(nroViaje: string, transportistaNombre: string, patenteVehiculo: string, nombreConductor: string) {

    logger.info(`🚚 UI: Assigning Viaje [${nroViaje}]`);



    // 1. Navegar y Buscar

    await this.page.goto(`${this.baseUrl}/viajes/asignar`);

    const search = this.page.locator('#search');

    await search.fill(nroViaje);

    await search.press('Enter');

    await this.page.waitForTimeout(2000);



    await this.page.locator('a[href*="asignar"], a[href*="update"]').first().evaluate(el => (el as HTMLElement).click());

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

    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.evaluate(() => { const b = document.getElementById('btn_guardar_form') as HTMLElement; if (b) b.click(); });



    // C.3 Manejo Modal Confirmación

    const modal = this.page.locator('text=Confirmación');

    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {

      logger.info('⚠️ Accepting confirmation modal...');

      await this.page.locator('button:has-text("Aceptar")').first().evaluate(el => (el as HTMLElement).click());

    }



    // ── FIX: Verificación por búsqueda en grid de /viajes/asignar ──
    logger.info('🔍 Verifying assignment: waiting for redirect to /viajes/asignar...');
    await this.verifyAssignmentInGrid(nroViaje);
    logger.info(`✅ Viaje [${nroViaje}] assigned successfully`);

  }

  /**
   * Verificación determinista: espera la redirección a /viajes/asignar,
   * busca el nroViaje en el filtro #search, y verifica que exista en el grid.
   */
  private async verifyAssignmentInGrid(nroViaje: string): Promise<void> {
    // 1. Esperar redirect a /viajes/asignar
    await this.page.waitForURL('**/viajes/asignar**', { timeout: 20000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      logger.warn('⚠️ networkidle timeout post-redirect, continuando...');
    });
    logger.info(`📍 Redirected to: ${this.page.url()}`);

    // 2. Buscar el viaje en el filtro
    const searchInput = this.page.locator('#search');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(nroViaje);
    await searchInput.press('Enter');
    logger.info(`🔎 Searching for trip: ${nroViaje}`);

    // 3. Esperar actualización del grid
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
    await this.page.waitForTimeout(1500);

    // 4. Verificar que el viaje aparece en el grid
    const viajeRow = this.page.locator(`text="${nroViaje}"`).first();
    const isVisible = await viajeRow.isVisible({ timeout: 10000 }).catch(() => false);

    if (!isVisible) {
      const visibleErrors = await this.page.locator('.alert-danger, .toast-error')
        .allTextContents()
        .catch(() => [] as string[]);
      const errorMsg = visibleErrors.filter((e: string) => e.trim().length > 0).join(' | ');
      throw new Error(`❌ Viaje [${nroViaje}] no encontrado en grid de /viajes/asignar. Errores: ${errorMsg || 'none'}`);
    }

    logger.info(`✅ Viaje [${nroViaje}] encontrado en el grid de asignación`);
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



    await btn.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));



    await btn.evaluate(el => (el as HTMLElement).click());







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



      await option.evaluate(el => (el as HTMLElement).click());



    }







    if (await dropdownMenu.isVisible({ timeout: 500 }).catch(() => false)) {



      await this.page.keyboard.press('Escape');



    }



    await this.page.waitForTimeout(300);



    logger.info(`✅ ${fieldName} selected`);



  }

  private async forceSelectByText(selectId: string, textToSelect: string): Promise<void> {
    await this.page.evaluate(({ id, text }) => {
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) return;

      const option = Array.from(select.options).find(opt => opt.text.toUpperCase().includes(text.toUpperCase()));
      if (option) {
        select.value = option.value;
        // Disparar eventos para que el framework (Yii/Bootstrap) detecte el cambio
        select.dispatchEvent(new Event('change', { bubbles: true }));

        // Actualizar visualmente Bootstrap Select si existe
        // @ts-ignore
        if (window.jQuery && window.jQuery(select).selectpicker) {
          // @ts-ignore
          window.jQuery(select).selectpicker('refresh');
        }
      }
    }, { id: selectId, text: textToSelect });
  }

}