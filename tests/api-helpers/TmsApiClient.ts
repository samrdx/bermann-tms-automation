import { Page, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import {
  generateChileanStreet,
  generateStreetNumber,
  generatePatente,
  generateRandomName,
  generateRandomLastName,
  generateValidChileanRUT,
  generateEmail,
  generatePhone
} from '../../src/utils/rutGenerator.js';
import { entityTracker } from '../../src/utils/entityTracker.js';
import { NamingHelper } from '../../src/utils/NamingHelper.js';


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

    logger.info(`✅ TmsApiClient inicializado`);

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

      logger.warn(`⚠️ Diferencia en valor de RUT - intentando corregir. Obtenido: ${currentValue}, Esperado: ${value}`);

      // Intentar agregar el último caracter si falta

      const lastChar = normalizedExpected.slice(-1);

      if (!normalizedCurrent.endsWith(lastChar)) {

        await locator.press(lastChar);

        await this.page.waitForTimeout(200);

        logger.info(`✅ Carácter faltante agregado: ${lastChar}`);

      }



    }



  }
  /**
    * Helper especializado para escribir RUT en campos con Input Mask.
    * FIX FIREFOX: Usa .fill('') en lugar de triple clic para limpiar.
    */
  private async typeRutSlowly(selector: string, rutValue: string): Promise<void> {
    logger.info(`🔑 typeRutSlowly: Escribiendo RUT [${rutValue}] en ${selector}`);
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
      logger.info(`✅ RUT verificado (intento 1): ${currentValue}`);
      return;
    }

    // --- Intento 2: Retry más lento ---
    logger.warn(`⚠️ Diferencia en RUT (intento 1). Obtenido: [${currentValue}], Esperado: [${normalizedExpected}]. Reintentando más lento...`);

    await locator.fill(''); // FIX: Limpieza segura nuevamente
    await this.page.waitForTimeout(200);

    const retryRut = verificationDigit === 'K' ? `${rutBody}-k` : rawWithHyphen;
    await locator.pressSequentially(retryRut, { delay: 150 });
    await this.page.waitForTimeout(500);

    currentValue = await locator.inputValue();
    normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT verificado (intento 2): ${currentValue}`);
      return;
    }

    // --- Intento 3: Fallback JavaScript (Inyección Directa) ---
    logger.warn(`⚠️ Diferencia en RUT (intento 2). Usando fallback de JS...`);
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
      logger.info(`✅ RUT verificado (JS fallback): ${currentValue}`);
      return;
    }

    logger.error(`❌ Validación de RUT FALLIDA. Final: [${currentValue}], Esperado: [${rutValue}]`);
  }

  // --- 1. TRANSPORTISTA ---
  async createTransportista(nombre: string, documento: string): Promise<string> {
    const rut = documento; // Use the provided documento for form filling and later search

    logger.info(`🚀 UI: Creando Transportista [${nombre}] RUT: [${rut}]`);

    await this.page.goto(`${this.baseUrl}/transportistas/crear`);
    await this.page.waitForLoadState('networkidle');

    // Llenado de formulario
    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.typeRutSlowly('input[name="Transportistas[documento]"]', rut);
    await this.page.fill('input[name="Transportistas[calle]"]', generateChileanStreet());
    await this.page.fill('input[name="Transportistas[altura]"]', generateStreetNumber());

    // FIX: Tipo 'Terceros' (valor '1') es REQUISITO para aparecer en contratos COSTO
    // Opciones: '' = vacío | '2' = Propios | '3' = En Arriendo | '1' = Terceros
    await this.page.selectOption('select[name="Transportistas[tipo_transportista_id]"]', '1');
    await this.page.locator('select[name="Transportistas[tipo_transportista_id]"]').dispatchEvent('change');
    await this.page.waitForTimeout(500);

    // Mantener "Permite Tercearizar viajes" en NO (valor '0' = No)
    logger.info('⚙️ Manteniendo "Permite Tercearizar viajes" en NO...');
    await this.page.selectOption('select[name="Transportistas[terceariza]"]', '0');
    await this.page.locator('select[name="Transportistas[terceariza]"]').dispatchEvent('change');
    await this.page.waitForTimeout(500);

    // Opcional: Establecer forma de pago (1 = Contado) para asegurar guardado exitoso
    const formaPago = this.page.locator('select[name="Transportistas[forma_pago]"]');
    if (await formaPago.isVisible()) {
      await formaPago.selectOption('1');
    }

    await this.page.selectOption('select[name="Transportistas[region_id]"]', '1');
    await this.page.selectOption('select[name="Transportistas[ciudad_id]"]', '1');
    await this.page.selectOption('select[name="Transportistas[comuna_id]"]', '2');

    // Pausa técnica para estabilidad en Firefox
    await this.page.waitForTimeout(500);

    // --- GUARDADO ROBUSTO (JS INJECTION) ---
    logger.info('💾 Guardando Transportista vía Inyección JS...');

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

    logger.info(`✅ Transportista [${nombre}] creado exitosamente`);

    // --- EXTRACCIÓN DE ID ---
    let id = '0';
    let currentUrl = this.page.url();
    logger.info(`📍 URL después de guardar: ${currentUrl}`);

    // 1. Intentar extraer de la URL directa (ej: /view/123)
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);

    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ ID de Transportista extraído de la URL: ${id}`);
    } else {
      logger.info('⚠️ Redirigido al Índice. Ejecutando Rescate de Grilla...');
      let foundViaRut = false;

      // Navigate to index to ensure we are on the grid page
      await this.page.goto(`${this.baseUrl}/transportistas/index`);
      await this.page.waitForTimeout(2000); // Give time for grid to load

      // PRIMARY STRATEGY: Search by RUT (Documento)
      logger.info(`🔍 Buscando por RUT: ${documento}`);
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
            logger.info(`✅ ID rescatado vía búsqueda por RUT (data-key): ${id}`);
          } else {
            const actionLink = rutRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
            if (await actionLink.count() > 0) {
              const href = await actionLink.getAttribute('href');
              const match = href?.match(/(\d+)/);
              if (match) {
                id = match[1];
                foundViaRut = true;
                logger.info(`✅ ID rescatado vía búsqueda por RUT (link): ${id}`);
              }
            }
          }
        }
      }

      // FALLBACK STRATEGY: Search by Name (if RUT search fails)
      if (!foundViaRut) {
        logger.warn('⚠️ La búsqueda por RUT falló, recurriendo a la búsqueda por nombre...');
        const searchInput = this.page.locator('#search');
        await searchInput.fill(nombre);
        logger.info(`🔎 Búsqueda completada con: ${nombre}`);

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
            logger.info(`✅ ID de Transportista desde data-key: ${id}`);
          }
        } else {
          logger.info(`🔎 Probando búsqueda alternativa en la tabla...`);
          const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();

          if (await anyRow.count() > 0) {
            const dataKey = await anyRow.getAttribute('data-key');
            if (dataKey) {
              id = dataKey;
              logger.info(`✅ ID de Transportista desde data-key alternativo: ${id}`);
            } else {
              const link = anyRow.locator('a[href*="/transportistas/"]').first();
              if (await link.count() > 0) {
                const href = await link.getAttribute('href');
                const match = href?.match(/\/(\d+)/);
                if (match) {
                  id = match[1];
                  logger.info(`✅ ID de Transportista desde el link: ${id}`);
                }
              }
            }
          } else {
            logger.warn(`⚠️ No se encontró fila para el Transportista: ${nombre}`);
          }
        }
      }
    }

    if (id === '0') {
      logger.error(`❌ No se pudo extraer el ID del Transportista para: ${nombre}`);
      throw new Error(`Failed to extract Transportista ID for: ${nombre}`);
    }

    logger.info(`✅ Transportista creado: ${nombre} | ID: ${id}`);
    entityTracker.register({ type: 'Transportista', name: nombre, id: String(id) });
    return String(id);
  }

  // --- 2. CLIENTE ---
  async createCliente(nombre: string): Promise<string> {
    const rut = generateValidChileanRUT();
    logger.info(`🚀 UI: Creando Cliente [${nombre}] RUT: [${rut}]`);

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
    logger.info('📍 Seleccionando Polígonos (drop_zones)...');
    const poligonosBtn = this.page.locator('button[data-id="drop_zones"]').first();

    if (await poligonosBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to open dropdown
      await poligonosBtn.evaluate(el => (el as HTMLElement).click());
      await this.page.waitForTimeout(800);

      // Click "Seleccionar Todos" button
      const selectAllBtn = this.page.locator('.dropdown-menu.show button.bs-select-all').first();
      if (await selectAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await selectAllBtn.evaluate(el => (el as HTMLElement).click());
        logger.info('✅ Polígonos: Seleccionar Todos clickeado');
        await this.page.waitForTimeout(500);
      } else {
        // Fallback: use JS to select all options
        logger.warn('⚠️ Botón Seleccionar Todos no encontrado, usando fallback de JS...');
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
        logger.info('✅ Polígonos: Todos seleccionados vía JS');
      }

      // Close dropdown
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    } else {
      logger.warn('⚠️ Dropdown de polígonos no visible');
    }

    // --- GUARDADO ---
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded').catch(() => { }),
      this.clickViaJS('#btn_guardar')
    ]);

    // ... (El resto de la lógica de extracción de ID se mantiene igual)
    const id = await this.extractIdAfterSave(nombre, 'Cliente');
    entityTracker.register({ type: 'Cliente', name: nombre, id: String(id) });
    return id;
  }

  /**
   * HELPER: Extrae el ID de la entidad creada (Transportista, Cliente, etc.)
   * Intenta primero por URL (si redirige a /ver/123) y luego usa el buscador de la grilla.
   */
  private async extractIdAfterSave(
    nombre: string,
    entityLabel: string,
    options?: { indexPath?: string; transportistaFilterName?: string },
  ): Promise<string> {
    let id = '0';

    // FIX FIREFOX: Esperar a que la redirección a /ver/\d+ o /editar/\d+ complete antes de leer la URL.
    // Chromium lo hace casi instantáneamente, Firefox puede tardar hasta 5-8 segundos más.
    await this.page.waitForURL(/\/(ver|view|editar|update)\/\d+/, { timeout: 8000 }).catch(() => {
      logger.warn(`⚠️ waitForURL (ver/editar) no completó en 8s para ${entityLabel} (${nombre}) — continuando con URL actual`);
    });

    let currentUrl = this.page.url();
    logger.info(`📍 URL después de guardar (${entityLabel}): ${currentUrl}`);

    // 1. Intentar extraer de la URL directa (ej: /ver/123)
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ ${entityLabel} ID extraído de la URL: ${id}`);
      return id;
    }

    // 2. Si no redirigió aún, esperar un poco más y reintentar URL
    logger.info(`🔄 URL no contiene ID todavía, esperando 2s y reintentando...`);
    await this.page.waitForTimeout(2000);
    currentUrl = this.page.url();
    idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ ${entityLabel} ID extraído de la URL (retry): ${id}`);
      return id;
    }

    const extractIdFromCurrentGrid = async (
      searchValue: string,
      scopeLabel: string,
      maxAttempts: number = 3,
    ): Promise<{ id: string; rowText: string; strategy: string } | null> => {
      const searchInput = this.page.locator('#search');
      let lastRowText = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        logger.info(`🔍 [${scopeLabel}] Buscando ${entityLabel} "${searchValue}" (intento ${attempt}/${maxAttempts})`);

        if (options?.transportistaFilterName) {
          await this.applyTransportistaFilter(options.transportistaFilterName).catch(() => {});
        }

        if (await searchInput.isVisible().catch(() => false)) {
          await searchInput.fill(searchValue);
          await Promise.all([
            this.page.waitForLoadState('domcontentloaded').catch(() => {}),
            searchInput.press('Enter').catch(() => {}),
            this.clickViaJS('#buscar').catch(() => {}),
          ]);
        }

        await this.page.waitForTimeout(2500);

        const result = await this.page.evaluate((targetName: string) => {
          const normalize = (value: string) =>
            value
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .trim();

          const normalizedTarget = normalize(targetName);
          const rows = Array.from(document.querySelectorAll('table tbody tr')) as HTMLTableRowElement[];

          const row = rows.find((item) => normalize(item.innerText || '').includes(normalizedTarget));
          if (!row) {
            return { id: '', rowText: '' };
          }

          const rowText = (row.innerText || '').trim();
          const dataKey = row.getAttribute('data-key')?.trim() || '';
          if (dataKey) {
            return { id: dataKey, rowText, strategy: 'data-key' };
          }

          const actionLink = row.querySelector('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"], a[href*="/update/"]') as HTMLAnchorElement | null;
          const href = actionLink?.getAttribute('href') || '';
          const match = href.match(/\/(\d+)(?:\D|$)/);
          if (match) {
            return { id: match[1], rowText, strategy: 'action-link' };
          }

          return { id: '', rowText };
        }, searchValue);

        if (result.rowText) {
          lastRowText = result.rowText;
        }

        if (result.id) {
          return {
            id: result.id,
            rowText: result.rowText || lastRowText,
            strategy: result.strategy || 'unknown',
          };
        }
      }

      if (lastRowText) {
        logger.warn(`⚠️ [${scopeLabel}] Se encontró fila pero sin ID extraíble para ${entityLabel}: ${lastRowText}`);
      }
      return null;
    };

    const lookupResult = await extractIdFromCurrentGrid(nombre, 'lookup-inicial');
    if (lookupResult?.id) {
      logger.info(`✅ ${entityLabel} ID desde ${lookupResult.strategy}: ${lookupResult.id}`);
      return lookupResult.id;
    }

    if (id === '0') {
      logger.warn(`⚠️ No se pudo extraer el ID de ${entityLabel} inicialmente para: ${nombre}. Intentando Rescate de Grilla...`);
      // Grid Rescue: navigate to index page
      const indexPath = options?.indexPath ?? `/${entityLabel.toLowerCase()}s/index`;
      const indexUrl = `${this.baseUrl}${indexPath}`;
      await this.page.goto(indexUrl);
      await this.page.waitForLoadState('networkidle');

      const rescueResult = await extractIdFromCurrentGrid(nombre, 'grid-rescue', 4);
      if (rescueResult?.id) {
        logger.info(`✅ ${entityLabel} ID desde ${rescueResult.strategy} de Rescate de Grilla: ${rescueResult.id}`);
        return rescueResult.id;
      }
    }

    if (id === '0') {
      logger.error(`❌ No se pudo extraer el ID de ${entityLabel} para: ${nombre}`);
      throw new Error(`Failed to extract ${entityLabel} ID for: ${nombre}`);
    }

    return id;
  }

  private async assertEntityIndexedInGrid(options: {
    entityLabel: string;
    indexPath: string;
    searchValue: string;
    fallbackSearchValues?: string[];
    transportistaFilterName?: string;
    useSearchInput?: boolean;
    expectedId: string;
    expectedTokens: string[];
    maxAttempts?: number;
  }): Promise<void> {
    const {
      entityLabel,
      indexPath,
      searchValue,
      fallbackSearchValues = [],
      transportistaFilterName,
      useSearchInput = true,
      expectedId,
      expectedTokens,
      maxAttempts = 4,
    } = options;

    const tokens = expectedTokens.map((token) => token.trim()).filter((token) => token.length > 0);
    const searchCandidates = [searchValue, ...fallbackSearchValues]
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);

    if (useSearchInput && searchCandidates.length === 0) {
      throw new Error(`❌ ${entityLabel} requiere al menos un valor de búsqueda para validar index.`);
    }

    let lastSnapshot = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await this.page.waitForTimeout(attempt * 800);
      await this.page.goto(`${this.baseUrl}${indexPath}`);
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const searchInput = this.page.locator('#search').first();
      const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      if (useSearchInput && !hasSearch) {
        logger.warn(`⚠️ [${entityLabel}] Campo #search no visible en ${indexPath} (intento ${attempt}/${maxAttempts})`);
        continue;
      }

      if (transportistaFilterName) {
        await this.applyTransportistaFilter(transportistaFilterName).catch(() => {});
      }

      let validated = false;

      const loopCandidates = useSearchInput ? searchCandidates : ['<transportista-filter-only>'];

      for (const candidate of loopCandidates) {
        if (useSearchInput) {
          await searchInput.fill(candidate);
          await Promise.all([
            this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
            searchInput.press('Enter').catch(() => {}),
            this.clickViaJS('#buscar').catch(() => {}),
          ]);
          await this.page.waitForTimeout(1200);
        }

        const result = await this.page.evaluate(
          ({ tokensToMatch, expectedIdValue }) => {
            const normalize = (value: string) =>
              value
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

            const normalizedTokens = (tokensToMatch as string[])
              .map((token) => normalize(token))
              .filter((token) => token.length > 0);
            const normalizedExpectedId = normalize(expectedIdValue as string);

            const rows = Array.from(document.querySelectorAll('table tbody tr')) as HTMLTableRowElement[];
            const snapshot = rows
              .slice(0, 3)
              .map((row) => (row.innerText || '').trim())
              .filter((text) => text.length > 0)
              .join(' | ');

            const matchedRow = rows.find((row) => {
              const rowText = normalize(row.innerText || '');
              return normalizedTokens.every((token) => rowText.includes(token));
            });

            if (!matchedRow) {
              return { ok: false, snapshot };
            }

            const dataKey = matchedRow.getAttribute('data-key')?.trim() || '';
            const firstCellText = matchedRow.querySelector('td')?.textContent?.trim() || '';
            const actionLink = matchedRow.querySelector(
              'a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"], a[href*="/update/"]'
            ) as HTMLAnchorElement | null;
            const actionHref = actionLink?.getAttribute('href') || '';
            const actionMatch = actionHref.match(/\/(\d+)(?:\D|$)/);
            const actionId = actionMatch?.[1] || '';
            const selectedId = dataKey || firstCellText;
            const normalizedRowText = normalize(matchedRow.innerText || '');
            const idFromCell = normalize(firstCellText);
            const idFromDataKey = normalize(dataKey);
            const idFromAction = normalize(actionId);
            const idFromRowText = normalizedExpectedId.length > 0 && normalizedRowText.includes(normalizedExpectedId);
            const ok =
              idFromCell === normalizedExpectedId ||
              idFromDataKey === normalizedExpectedId ||
              idFromAction === normalizedExpectedId ||
              idFromRowText;

            return {
              ok,
              selectedId,
              rowText: (matchedRow.innerText || '').trim(),
              snapshot,
            };
          },
          { tokensToMatch: tokens, expectedIdValue: expectedId },
        );

        lastSnapshot = result.snapshot || lastSnapshot;
        if (result.ok) {
          logger.info(
            `✅ [${entityLabel}] Verificado en ${indexPath} intento ${attempt}/${maxAttempts} ` +
            `${useSearchInput ? `(busqueda="${candidate}")` : '(filtro transportista + buscar)'} ` +
            `ID=${result.selectedId}`,
          );
          validated = true;
          break;
        }
      }

      if (validated) {
        return;
      }

      logger.warn(
        `⚠️ [${entityLabel}] Sin verificación en ${indexPath} intento ${attempt}/${maxAttempts} ` +
        `${useSearchInput ? `(busquedas=${searchCandidates.join(', ')})` : '(filtro transportista + buscar)'} ` +
        `Snapshot: ${lastSnapshot || 'sin filas visibles'}`,
      );
    }

    throw new Error(
      `❌ ${entityLabel} no quedó verificado en index (${indexPath}) para "${searchValue}" con ID esperado ${expectedId}. ` +
      `Último snapshot: ${lastSnapshot || 'sin filas visibles'}`,
    );
  }

  private async applyTransportistaFilter(transportistaName: string): Promise<void> {
    const targetName = transportistaName.trim();
    if (!targetName) {
      return;
    }

    const appliedFromButton = await this.page.evaluate((target: string) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const normalizedTarget = normalize(target);
      const button = document.querySelector("button[data-id='transportista']") as HTMLElement | null;
      if (!button) {
        return false;
      }

      button.click();

      const openMenu = document.querySelector('.dropdown-menu.show') as HTMLElement | null;
      const searchInput = openMenu?.querySelector('.bs-searchbox input') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = target;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const options = Array.from(document.querySelectorAll('.dropdown-menu.show .dropdown-item')) as HTMLElement[];
      const match = options.find((option) => normalize(option.textContent || '').includes(normalizedTarget));
      if (!match) {
        return false;
      }

      match.click();
      const selectedText =
        button.querySelector("div.filter-option-inner-inner")?.textContent ||
        button.textContent ||
        '';

      return normalize(selectedText).includes(normalizedTarget);
    }, targetName);

    if (appliedFromButton) {
      logger.info(`✅ Filtro transportista aplicado desde button[data-id='transportista']: ${targetName}`);
      await Promise.all([
        this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
        this.clickViaJS('#buscar').catch(() => {}),
      ]);
      await this.page.waitForTimeout(800);
      return;
    }

    const applied = await this.page.evaluate((target: string) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const normalizedTarget = normalize(target);
      const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];

      const candidateSelects = selects.filter((select) => {
        const key = `${select.id} ${select.name} ${(select.closest('.form-group')?.textContent || '')}`.toLowerCase();
        return key.includes('transportista');
      });

      for (const select of candidateSelects) {
        const options = Array.from(select.options);
        const matched = options.find((option) => normalize(option.text).includes(normalizedTarget));
        if (!matched) {
          continue;
        }

        select.value = matched.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));

        // @ts-ignore
        const $ = window.jQuery;
        if ($ && $(select).selectpicker) {
          // @ts-ignore
          $(select).selectpicker('val', matched.value);
          // @ts-ignore
          $(select).selectpicker('refresh');
          // @ts-ignore
          $(select).trigger('change');
        }

        const selectedText = select.options[select.selectedIndex]?.text || '';
        return normalize(selectedText).includes(normalizedTarget);
      }

      return false;
    }, targetName);

    if (applied) {
      logger.info(`✅ Filtro transportista aplicado: ${targetName}`);
    } else {
      logger.warn(`⚠️ No se pudo aplicar filtro transportista automáticamente: ${targetName}`);
    }

    await Promise.all([
      this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
      this.clickViaJS('#buscar').catch(() => {}),
    ]);
    await this.page.waitForTimeout(800);
  }

  private formatRutForGrid(rutValue: string): string {
    const sanitized = rutValue.replace(/\./g, '').trim().toUpperCase();
    const [bodyRaw, dvRaw] = sanitized.includes('-')
      ? sanitized.split('-')
      : [sanitized.slice(0, -1), sanitized.slice(-1)];

    const body = bodyRaw.replace(/\D/g, '');
    const dv = (dvRaw || '').replace(/[^0-9K]/gi, '').toUpperCase();
    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withDots}-${dv}`;
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


    const patenteReal = generatePatente();
    const patente = NamingHelper.getVehiculoPatente(patenteReal);



    logger.info(`🚛 UI: Creando Vehículo [${patente}] para Transportista: ${transportistaNombre}`);



    await this.page.goto(`${this.baseUrl}/vehiculos/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.waitForSelector('input[name="Vehiculos[patente]"]', { state: 'visible', timeout: 15000 });



    await this.page.fill('input[name="Vehiculos[patente]"]', patente);



    await this.page.fill('input[name="Vehiculos[muestra]"]', patente);







    await this.selectBootstrapDropdownSimple(
      'button[data-id="vehiculos-transportista_id"]',
      transportistaNombre,
      'Transportista Vehiculo',
    );
    await this.forceSelectByText('vehiculos-transportista_id', transportistaNombre);
    await this.page.waitForTimeout(500);







    logger.info('🚛 Seleccionando Tipo Vehículo: TRACTO');



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







    logger.info('📦 Seleccionando Capacidad: 1 a 12 TON');



    const capacidadBtn = this.page.locator('button[data-id="vehiculos-capacidad_id"]');



    if (await capacidadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {



      await capacidadBtn.evaluate(el => (el as HTMLElement).click());



      await this.page.waitForTimeout(500);



      const capacidadMenu = this.page.locator('div.dropdown-menu.show').first();



      const capacidadSearchBox = capacidadMenu.locator('.bs-searchbox input');



      if (await capacidadSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {



        await capacidadSearchBox.fill('1 a 12 TON');



        await this.page.waitForTimeout(500);



      }



      await this.page.keyboard.press('ArrowDown');



      await this.page.keyboard.press('Enter');



      await this.page.waitForTimeout(500);



    } else {



      logger.warn('⚠️ Dropdown de capacidad no visible - omitiendo');



    }







    // FIX FIREFOX: Limpiar modal-backdrop antes de Guardar
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
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

    const vehiculoId = await this.extractIdAfterSave(patente, 'Vehiculo', {
      indexPath: '/vehiculos/index',
      transportistaFilterName: transportistaNombre,
    });

    await this.assertEntityIndexedInGrid({
      entityLabel: 'Vehiculo',
      indexPath: '/vehiculos/index',
      searchValue: transportistaNombre,
      transportistaFilterName: transportistaNombre,
      useSearchInput: false,
      expectedId: vehiculoId,
      expectedTokens: [patente, transportistaNombre],
    });

    logger.info(`✅ Vehículo creado: ${patente} | ID: ${vehiculoId}`);
    entityTracker.register({
      type: 'Vehiculo',
      name: patente,
      id: String(vehiculoId),
      patente: patente,
      asociado: transportistaNombre
    });
    return patente;

  }

  // --- 4. CONDUCTOR ---
  async createConductor(transportistaNombre: string): Promise<any> {
    const rawNames = { nombre: generateRandomName(), apellido: generateRandomLastName() };
    const conductorNames = NamingHelper.getConductorNames(rawNames);
    const nombre = conductorNames.nombre;
    const apellido = conductorNames.apellido; // Added for new register call
    const conductorDisplayName = `${nombre} ${apellido}`.trim();
    const email = generateEmail(conductorNames.nombre + conductorNames.apellido); // Added for new register call
    const telefono = generatePhone();

    const rut = generateValidChileanRUT();
    const rutGrid = this.formatRutForGrid(rut);

    const usuario = `user${Math.floor(Math.random() * 100000)}`;

    const clave = `pass${Math.floor(Math.random() * 100000)}`;

    logger.info(`👨‍✈️ UI: Creando Conductor [${nombre}] para Transportista: ${transportistaNombre}`);

    await this.page.goto(`${this.baseUrl}/conductores/crear`);

    await this.page.waitForLoadState('networkidle');

    await this.page.waitForSelector('input[name="Conductores[nombre]"]', { state: 'visible', timeout: 15000 });


    await this.page.fill('input[name="Conductores[usuario]"]', usuario);

    await this.page.fill('input[name="Conductores[clave]"]', clave);

    await this.page.fill('input[name="Conductores[nombre]"]', nombre);

    await this.page.fill('input[name="Conductores[apellido]"]', apellido);

    await this.typeRutSlowly('input[name="Conductores[documento]"]', rut);

    await this.page.fill('input[name="Conductores[telefono]"]', telefono);

    await this.page.fill('input[name="Conductores[email]"]', email);


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

    logger.info(`📅 Estableciendo fecha vencimiento licencia: ${fechaStr}`);


    const fechaInput = this.page.locator('#conductores-fecha_vencimiento_licencia, input[name="Conductores[fecha_vencimiento_licencia]"]').first();

    if (await fechaInput.isVisible({ timeout: 2000 }).catch(() => false)) {

      await fechaInput.click();

      await this.page.waitForTimeout(300);

      await fechaInput.fill(fechaStr);

      await this.page.keyboard.press('Tab');

      await this.page.waitForTimeout(500);

    }


    await this.selectBootstrapDropdownSimple(
      'button[data-id="conductores-transportista_id"]',
      transportistaNombre,
      'Transportista Conductor',
    );
    await this.forceSelectByText('conductores-transportista_id', transportistaNombre);
    await this.page.waitForTimeout(500);


    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
    });
    // FIX FIREFOX: waitForResponse puede no interceptarse en Firefox si la respuesta
    // llega antes de que el listener esté listo, o si el POST usa un patrón de redirect distinto.
    // Hacemos el waitForResponse opcional y verificamos el éxito por URL/loadState.
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded').catch(() => { }),
      this.page.waitForResponse(
        resp => resp.url().includes('/conductores/') && resp.status() < 400,
        { timeout: 15000 }
      ).catch(() => logger.warn('⚠️ waitForResponse /conductores/ timeout (Firefox) — verificando via URL')),
      this.page.evaluate(() => { const b = document.getElementById('btn_guardar') as HTMLElement; if (b) b.click(); })
    ]);

    await this.page.waitForTimeout(2000);

    const conductorId = await this.extractIdAfterSave(rutGrid, 'Conductor', {
      indexPath: '/conductores/index',
      transportistaFilterName: transportistaNombre,
    });

    logger.info(
      `✅ Conductor verificado por extracción de ID en index con filtro transportista. ` +
      `ID=${conductorId} Transportista=${transportistaNombre}`,
    );

    await this.assertEntityIndexedInGrid({
      entityLabel: 'Conductor',
      indexPath: '/conductores/index',
      searchValue: transportistaNombre,
      transportistaFilterName: transportistaNombre,
      useSearchInput: false,
      expectedId: conductorId,
      expectedTokens: [rutGrid],
    });

    const currentUrl = this.page.url();
    logger.info(`✅ Conductor guardado. URL actual: ${currentUrl}. ID: ${conductorId}`);
    entityTracker.register({
      type: 'Conductor',
      name: conductorDisplayName,
      id: String(conductorId),
      apellido: apellido,
      asociado: transportistaNombre
    });
    return conductorDisplayName;
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



  private async fillGenericContract(tipoVal: '1' | '2', entityName: string, selectId: string): Promise<string> {



    const nro = this.generateRandomId();



    logger.info(`📝 Creando contrato [${nro}] tipo=${tipoVal === '1' ? 'COSTO' : 'VENTA'} para: ${entityName}`);



    await this.page.goto(`${this.baseUrl}/contrato/crear`);



    await this.page.waitForLoadState('networkidle');



    await this.page.fill('#contrato-nro_contrato', nro);







    // 1. Set tipo using jQuery trigger (works with Bootstrap Select)



    logger.info(`📋 Estableciendo tipo de contrato a: ${tipoVal === '1' ? 'COSTO' : 'VENTA'}`);



    logger.info('⏳ Esperando que el formulario se reconfigure...');
    await Promise.all([
      this.page.waitForResponse(
        r => r.url().includes('rendersubview') && r.status() === 200,
        { timeout: 15000 }
      ).catch(() => {
        logger.warn('⚠️ Respuesta rendersubview no detectada, usando espera de respaldo');
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



      logger.info('📋 Estableciendo subtipo para contrato de VENTA...');



      await this.page.waitForSelector('select#tipo', { state: 'attached', timeout: 5000 }).catch(() => {



        logger.warn('⚠️ select#tipo no encontrado, omitiendo subtipo');



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
    let selectionResult: { success: boolean; value?: string; text?: string; msg?: string } = { success: false, msg: 'Not started' };
    const maxRetries = 5;

    for (let i = 0; i < maxRetries; i++) {
      logger.info(`📋 Intentando seleccionar ${tipoVal === '1' ? 'Transportista' : 'Cliente'}: "${entityName}" (intento ${i + 1}/${maxRetries})...`);

      selectionResult = await this.page.evaluate(({ selectIdFull, nombre }) => {
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

      if (selectionResult.success) break;

      logger.warn(`⚠️ Intento ${i + 1} fallido: ${selectionResult.msg}. Esperando recarga de dropdown...`);
      await this.page.waitForTimeout(2000); // Wait for potential AJAX reload
    }

    if (!selectionResult.success) {
      logger.error(`❌ Selección de entidad fallida después de ${maxRetries} intentos: ${selectionResult.msg}`);
      throw new Error(`Failed to select ${entityName} after ${maxRetries} attempts: ${selectionResult.msg}`);
    }



    logger.info(`✅ Seleccionado: ${selectionResult.text} (valor: ${selectionResult.value})`);







    await this.page.waitForTimeout(500);

    // 4.5 [DEMO ONLY] Set Fecha vencimiento + Unidad de negocio
    const isDemo = process.env.ENV === 'DEMO';
    if (isDemo) {
      logger.info('📅 [DEMO] Estableciendo Fecha vencimiento vía JS con Eventos...');
      await this.page.evaluate(() => {
        const dp = document.getElementById('contrato-fecha_vencimiento') as HTMLInputElement;
        if (dp) {
          dp.value = '31-12-2026';
          dp.dispatchEvent(new Event('input', { bubbles: true }));
          dp.dispatchEvent(new Event('change', { bubbles: true }));
          dp.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      });

      logger.info('🏢 [DEMO] Seleccionando Unidad de negocio: Defecto...');
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
    logger.info('💾 Guardando encabezado del contrato...');

    // FIX FIREFOX: Limpiar modal-backdrop residuales que bloquean page.click() en Firefox
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(300);

    await Promise.all([



      this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {



        logger.warn('⚠️ Tiempo de espera de navegación agotado, verificando URL...');



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

      logger.info(`✅ ¡Encabezado del contrato guardado! Añadiendo rutas...`);
      entityTracker.register({
        type: tipoVal === '1' ? 'Contrato Costo' : 'Contrato Venta',
        name: nro
      });
      await this.addRouteAndTarifas('20000', '50000');

    } else if (currentUrl.includes('/crear')) {
      logger.warn(`⚠️ Aún en la página de creación. URL: ${currentUrl}. Extrayendo campos con error...`);

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

      logger.error(`❌ Campos con error de validación: ${errorFields.join(', ')}`);
      await this.page.screenshot({ path: `reports/screenshots/stuck-contrato-${Date.now()}.png`, fullPage: true });

      if (errorFields.length > 0) {
        throw new Error(`Contract save failed. Invalid fields: ${errorFields.join(', ')}`);
      }
    } else {
      logger.info(`⚠️ Formulario de contrato enviado (URL: ${currentUrl})`);
    }



    await this.page.waitForTimeout(1000); // Brief DOM stabilization
    return nro;
  }

  private async addRouteAndTarifas(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    const isDemo = process.env.ENV === 'DEMO';
    let routeId = isDemo ? '47' : '1413';
    let routeCargoId = isDemo ? '47_6' : '1413_2';

    logger.info(`🛣️ Añadiendo Ruta ${routeId} y Carga ${routeCargoId} con entrada de tarifa LENTA...`);







    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body?.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(500);







    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();



    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });



    await btnAnadirRuta.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));



    await btnAnadirRuta.evaluate(el => (el as HTMLElement).click());







    try {



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });



    } catch {



      logger.warn('⚠️ El modal no se abrió, reintentando...');



      await this.page.waitForTimeout(500);



      await btnAnadirRuta.evaluate(el => (el as HTMLElement).click());



      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });



    }







    // --- FALLBACK: si el ID de ruta especificado no existe, usar la primera ruta disponible ---
    const specificRouteBtn = this.page.locator(`#btn_plus_${routeId}`);
    const specificRouteExists = await specificRouteBtn.count().then(c => c > 0).catch(() => false);
    if (!specificRouteExists) {
      logger.warn(`⚠️ Ruta específica #btn_plus_${routeId} no encontrada. Buscando primera ruta disponible en el modal...`);
      const firstRouteBtn = this.page.locator('#modalRutas [id^="btn_plus_"]').first();
      const firstRouteId = await firstRouteBtn.getAttribute('id').catch(() => null);
      if (firstRouteId) {
        routeId = firstRouteId.replace('btn_plus_', '');
        logger.info(`📌 Fallback: usando ruta ID=${routeId}`);
        // routeCargoId: use first cargo for this route
        const firstCargoBtnId = await this.page.locator(`#modalRutas [id^="btn_plus_ruta_${routeId}_"]`).first().getAttribute('id').catch(() => null);
        routeCargoId = firstCargoBtnId ? firstCargoBtnId.replace('btn_plus_ruta_', '') : `${routeId}_1`;
        logger.info(`📌 Fallback: usando routeCargoId=${routeCargoId}`);
      } else {
        logger.warn('⚠️ No se encontraron rutas en el modal. Omitiendo addRouteAndTarifas...');
        return;
      }
    }

    const btnPlusRoute = this.page.locator(`#btn_plus_${routeId}`);
    await btnPlusRoute.waitFor({ state: 'attached', timeout: 5000 });
    await btnPlusRoute.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await btnPlusRoute.evaluate(el => (el as HTMLElement).click());

    // Wait for loading modal to disappear (CRITICAL: blocks all clicks)
    logger.info('⏳ Esperando que el modal de carga desaparezca...');
    try {
      await this.page.waitForSelector('#modalCargando', { state: 'hidden', timeout: 15000 });
      logger.info('✅ Modal de carga oculto');
    } catch {
      // Fallback: force-hide via JS if still visible
      logger.warn('⚠️ Tiempo de espera del modal de carga agotado, forzando cierre vía JS...');
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
    logger.info('⏳ Esperando que el modal de carga desaparezca después de la tarifa de ruta...');
    try {
      await this.page.waitForSelector('#modalCargando', { state: 'hidden', timeout: 15000 });
    } catch {
      logger.warn('⚠️ Tiempo de espera del modal de carga agotado, forzando cierre...');
      await this.page.evaluate(() => {
        const m = document.getElementById('modalCargando');
        if (m) { m.classList.remove('show'); m.style.display = 'none'; }
      });
    }




    await this.page.evaluate(() => {



      // @ts-ignore



      if (typeof $ !== 'undefined') $('.modal').modal('hide');



      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());



      document.body?.classList.remove('modal-open');



    });



    await this.page.waitForTimeout(1000);







    logger.info(`💰 Llenando tarifa conductor LENTAMENTE: ${tarifaConductor}`);



    await this.fillSlowly(`#txt_tarifa_conductor_${routeId}`, tarifaConductor, 100);







    logger.info(`💰 Llenando tarifa viaje LENTAMENTE: ${tarifaViaje}`);



    await this.fillSlowly(`#txt_tarifa_extra_${routeId}`, tarifaViaje, 100);







    await this.page.waitForTimeout(2000);







    logger.info('💾 Guardando contrato con rutas...');



    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
    });
    await this.page.evaluate(() => { const b = document.getElementById('btn_guardar') as HTMLElement; if (b) b.click(); });



    await this.page.waitForTimeout(3000);







    const finalUrl = this.page.url();



    if (finalUrl.includes('/editar/') || finalUrl.includes('/index')) {
      logger.info('✅ Contrato con rutas guardado exitosamente');
    } else {
      logger.warn(`⚠️ Estado del guardado del contrato incierto (URL: ${finalUrl})`);
    }



  }

  async createContratoCosto(transportistaNombre: string): Promise<string> {
    return await this.fillGenericContract('1', transportistaNombre, 'contrato-transportista_id');
  }

  async createContratoVenta(clienteNombre: string): Promise<string> {
    return await this.fillGenericContract('2', clienteNombre, 'contrato-cliente_id');
  }

  // --- 6. PLANIFICAR VIAJE (FIX CARGA & AUTO-HEALING) ---
  async createViaje(clienteNombre: string, nroViaje: string) {
    logger.info(`🚚 UI: Creando Viaje [${nroViaje}] para Cliente [${clienteNombre}]`);

    await this.page.goto(`${this.baseUrl}/viajes/crear`);
    await this.page.waitForLoadState('networkidle');

    // --- FUNCIÓN HELPER: Llenar Formulario (Reutilizable para Auto-Healing) ---
    const fillForm = async (isRetry = false) => {
      logger.info(`📝 Llenando formulario (Reintento: ${isRetry})...`);

      // 1. Campos de Texto
      await this.page.fill('#viajes-nro_viaje', nroViaje);

      const isDemo = process.env.ENV === 'DEMO';
      const tipoOperacionText = isDemo ? 'Distribución' : 'defecto';
      const tipoServicioText = isDemo ? 'Lcl' : 'defecto';

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
      const codigoCargaText = isDemo ? 'CONTENEDOR DRY' : 'Test 1';

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
    // Revertido a evaluate.click() para abrir Bootstrap Select (funciona en ambos navegadores)
    await origenBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);

    // Esperar que el dropdown esté abierto via aria-expanded (Bootstrap Select lo setea en el button)
    await this.page.waitForFunction(
      () => document.querySelector('button[data-id="_origendestinoform-origen"]')?.getAttribute('aria-expanded') === 'true',
      { timeout: 8000 }
    ).catch(() => logger.warn('⚠️ Dropdown Origen no reportó aria-expanded=true en 8s'));

    // Setup dynamic environment variables for Origen/Destino
    const isDemoForCarga = process.env.ENV === 'DEMO';
    const origenText = isDemoForCarga ? '233_CD SuperZoo_Quilicura' : '405_LA FARFANA_Pudahuel';
    const destinoSearchText = isDemoForCarga ? 'Divisa' : 'CXP ANTOFAGASTA';
    const destinoText = isDemoForCarga ? 'Divisa' : 'CXP ANTOFAGASTA';

    // Buscar en el searchbox si existe (accedemos desde el contenedor del dropdown abierto)
    const origenContainer = this.page.locator('button[data-id="_origendestinoform-origen"]').locator('xpath=ancestor::div[contains(@class,"bootstrap-select")]');
    const origenSearchBox = origenContainer.locator('.bs-searchbox input');
    if (await origenSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await origenSearchBox.fill(origenText);
      await this.page.waitForTimeout(500);
    }

    // PASO 2: Seleccionar opción Origen (con fallback a primera opción disponible)
    logger.info(`📍 PASO 2: Seleccionando Origen "${origenText}"...`);
    const origenList = origenContainer.locator('ul.dropdown-menu.inner');
    const origenOption = origenList.locator('li:not(.disabled) a').filter({ hasText: origenText }).first();
    const origenFound = await origenOption.isVisible({ timeout: 4000 }).catch(() => false);
    if (origenFound) {
      await origenOption.evaluate(el => (el as HTMLElement).click());
      logger.info(`✅ Origen seleccionado: ${origenText}`);
    } else {
      logger.warn(`⚠️ Origen "${origenText}" no encontrado. Aplicando FALLBACK: primera opción disponible...`);
      if (await origenSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await origenSearchBox.fill('');
        await this.page.waitForTimeout(400);
      }
      const firstOrigenOption = origenList.locator('li:not(.disabled) a').first();
      await firstOrigenOption.waitFor({ state: 'attached', timeout: 5000 });
      const fallbackOrigenText = await firstOrigenOption.textContent().catch(() => 'primera opción');
      await firstOrigenOption.evaluate(el => (el as HTMLElement).click());
      logger.info(`✅ Origen Fallback seleccionado: ${fallbackOrigenText?.trim()}`);
    }
    await this.page.waitForTimeout(1000);

    // PASO 3: DESTINO
    logger.info('📍 PASO 3: Abriendo dropdown Destino...');
    const destinoBtn = this.page.locator('button[data-id="_origendestinoform-destino"]').first();
    await destinoBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Revertido a evaluate.click() para abrir Bootstrap Select
    await destinoBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);

    // Esperar apertura via aria-expanded
    await this.page.waitForFunction(
      () => document.querySelector('button[data-id="_origendestinoform-destino"]')?.getAttribute('aria-expanded') === 'true',
      { timeout: 8000 }
    ).catch(() => logger.warn('⚠️ Dropdown Destino no reportó aria-expanded=true en 8s'));

    // Buscar en el searchbox si existe
    const destinoContainer = this.page.locator('button[data-id="_origendestinoform-destino"]').locator('xpath=ancestor::div[contains(@class,"bootstrap-select")]');
    const destinoSearchBox = destinoContainer.locator('.bs-searchbox input');
    if (await destinoSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await destinoSearchBox.fill(destinoSearchText);
      await this.page.waitForTimeout(500);
    }

    // PASO 4: Seleccionar opción Destino (con fallback a primera opción disponible)
    logger.info(`📍 PASO 4: Seleccionando Destino "${destinoText}"...`);
    const destinoList = destinoContainer.locator('ul.dropdown-menu.inner');
    const destinoOptionItem = destinoList.locator('li:not(.disabled) a span.text, li:not(.disabled) a').filter({ hasText: destinoText }).first();
    const destinoFound = await destinoOptionItem.isVisible({ timeout: 4000 }).catch(() => false);
    if (destinoFound) {
      await destinoOptionItem.evaluate(el => (el as HTMLElement).click());
      logger.info(`✅ Destino seleccionado: ${destinoText}`);
    } else {
      logger.warn(`⚠️ Destino "${destinoText}" no encontrado. Aplicando FALLBACK: primera opción disponible...`);
      if (await destinoSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await destinoSearchBox.fill('');
        await this.page.waitForTimeout(400);
      }
      const firstDestinoOption = destinoList.locator('li:not(.disabled) a span.text, li:not(.disabled) a').first();
      await firstDestinoOption.waitFor({ state: 'attached', timeout: 5000 });
      const fallbackDestinoText = await firstDestinoOption.textContent().catch(() => 'primera opción');
      await firstDestinoOption.evaluate(el => (el as HTMLElement).click());
      logger.info(`✅ Destino Fallback seleccionado: ${fallbackDestinoText?.trim()}`);
    }
    await this.page.waitForTimeout(1000);
    logger.info(`✅ Origen/Destino configurados correctamente`);

    // Esperar estabilización (sin networkidle que puede causar problemas)
    await this.page.waitForTimeout(2000);

    // =======================================================================
    // 3. SELECCIÓN DE CARGA (POST ORIGEN/DESTINO)
    // Se movió aquí porque elegir origen/destino puede gatillar AJAX
    // y limpiar las opciones de carga (quedando EMPTY) en Demo.
    // =======================================================================
    const codigoCargaTextFinal = isDemoForCarga ? 'CONTENEDOR DRY' : 'Test 1';
    // FIX QA: Both QA and Demo use 'viajes-carga_id' (not 'viajes-codigo_carga_id')
    const cargaSelectIdFinal = 'viajes-carga_id';

    logger.info(`📦 SELECCIONANDO CARGA AL FINAL (Sondeando el DOM para que ${cargaSelectIdFinal} tenga la opción ${codigoCargaTextFinal})...`);

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
    logger.info(`📋 Estado del formulario antes de guardar: ${formDiag}`);

    // 14. PRE-GUARDAR: Limpiar modales/backdrops residuales que puedan interceptar el clic
    await this.page.evaluate(() => {
      const $ = (window as any).jQuery;
      if ($) {
        $('.modal').modal('hide');
        $('.bootbox').modal('hide');
      }
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body?.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(500);

    // 15. GUARDAR - con verificación de que el botón existe y es clickeable
    logger.info('💾 Haciendo clic en Guardar...');
    const guardarBtn = this.page.locator('#btn_guardar_form');
    await guardarBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll al botón para asegurar visibilidad
    await guardarBtn.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await this.page.waitForTimeout(300);

    // FIX FIREFOX: Limpiar modal-backdrop antes de Guardar
    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
    });

    // FIX FIREFOX: usar click nativo de Playwright para el botón Guardar.
    // evaluate(el.click()) no dispara los handlers jQuery de validación/submit en Firefox.
    // .click() normal puede quedar colgado en Firefox si la navegación interrumpe la promesa.
    await Promise.all([
      this.page.waitForResponse(
        (resp: any) => resp.url().includes('/viajes/') && resp.status() < 400,
        { timeout: 20000 }
      ).catch(() => logger.warn('⚠️ No se capturó respuesta después de hacer clic en Guardar')),
      guardarBtn.dispatchEvent('click'),
    ]);

    await this.page.waitForLoadState('domcontentloaded').catch(() => { });
    await this.page.waitForTimeout(2000);

    // 16. VERIFICACIÓN POST-GUARDAR (3 estrategias en orden de fiabilidad)
    logger.info('⏳ Verificando creación del viaje...');

    // Estrategia 1: Toast exacto "Viaje Creado con éxito"
    const toastExacto = this.page.getByText('Viaje Creado con éxito', { exact: true });
    if (await toastExacto.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info(`✅ Viaje [${nroViaje}] creado exitosamente (toast exacto)`);
      entityTracker.register({
        type: 'Viaje',
        name: nroViaje,
        asociado: clienteNombre,
        estado: 'PLANIFICADO'
      });
      return nroViaje;
    }

    // Estrategia 2: Toast o alerta parcial
    const toastAlt = this.page.locator('.toast-success, .alert-success').first();
    if (await toastAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await toastAlt.textContent().catch(() => '');
      logger.info(`✅ Viaje [${nroViaje}] creado exitosamente (toast alt: "${text?.trim().substring(0, 60)}")`);
      entityTracker.register({ type: 'Viaje', name: nroViaje });
      return nroViaje;
    }

    // Verificar si hay error visible ANTES de ir a la grilla
    const errors = await this.page.locator('.alert-danger, .has-error').allTextContents();
    const filteredErrors = errors.filter(e => e.trim().length > 0);
    if (filteredErrors.length > 0) {
      throw new Error(`❌ Error al guardar viaje: ${filteredErrors.join(' | ')}`);
    }

    // Estrategia 3: Verificar si redirigió (éxito silencioso) o buscar en grilla
    // FIX FIREFOX: Esperar a que la URL se estabilice antes de leerla (Firefox es más lento para redirigir)
    await Promise.race([
      this.page.waitForURL('**/viajes/asignar**', { timeout: 10000 }),
      this.page.waitForURL('**/viajes/index**', { timeout: 10000 })
    ]).catch(() => { });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    logger.info(`⚠️ No se detectó toast. URL actual: ${currentUrl}`);

    // Si la URL cambió a /viajes/asignar, el viaje se creó correctamente
    if (currentUrl.includes('/viajes/asignar') || currentUrl.includes('/viajes/index')) {
      logger.info(`✅ Viaje [${nroViaje}] creado (redirect a ${currentUrl})`);
      entityTracker.register({
        type: 'Viaje',
        name: nroViaje,
        asociado: clienteNombre,
        estado: 'PLANIFICADO'
      });
      return nroViaje;
    }

    // Fallback: navegar a grilla y buscar (con retry loop para Firefox)
    logger.info('⚠️ Fallback: verificando en grilla de asignación con retry loop (Firefox-safe)...');

    const maxSearchRetries = 8;
    for (let attempt = 1; attempt <= maxSearchRetries; attempt++) {
      // Tiempo de espera incremental antes de cada intento (da tiempo al backend para indexar)
      const waitMs = attempt * 2000; // 2s, 4s, 6s...
      logger.info(`🔄 Intento ${attempt}/${maxSearchRetries}: esperando ${waitMs}ms antes de buscar...`);
      await this.page.waitForTimeout(waitMs);

      await this.page.goto(`${this.baseUrl}/viajes/asignar`);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
      await this.page.waitForTimeout(1000);

      const searchInput = this.page.locator('#search');
      await searchInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });

      // Limpiar y escribir lentamente (Firefox necesita eventos key-by-key)
      await searchInput.fill('');
      await searchInput.pressSequentially(nroViaje, { delay: 80 });
      await Promise.all([
        this.page.waitForLoadState('domcontentloaded').catch(() => { }),
        searchInput.press('Enter').catch(() => { }),
        this.clickViaJS('#buscar').catch(() => { })
      ]);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
      await this.page.waitForTimeout(2000);

      // Verificar por texto exacto
      const viajeRow = this.page.locator(`text="${nroViaje}"`);
      if (await viajeRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        logger.info(`✅ Viaje [${nroViaje}] encontrado en grilla (intento ${attempt}, texto exacto)`);
        entityTracker.register({ type: 'Viaje', name: nroViaje, asociado: clienteNombre, estado: 'PLANIFICADO' });
        return nroViaje;
      }

      // Verificar por contenido de fila
      const allRows = this.page.locator('table tbody tr');
      const rowCount = await allRows.count().catch(() => 0);
      if (rowCount >= 1) {
        let foundExact = false;
        for (let i = 0; i < rowCount; i++) {
          const text = await allRows.nth(i).innerText().catch(() => '');
          if (text.includes(nroViaje)) { foundExact = true; break; }
        }
        if (foundExact) {
          logger.info(`✅ Viaje [${nroViaje}] confirmado en grilla (intento ${attempt}, ${rowCount} filas)`);
          entityTracker.register({ type: 'Viaje', name: nroViaje, asociado: clienteNombre, estado: 'PLANIFICADO' });
          return nroViaje;
        }
      }

      logger.warn(`⚠️ Intento ${attempt}/${maxSearchRetries}: viaje [${nroViaje}] no encontrado aún (${rowCount} filas)`);
    }

    throw new Error(`❌ Viaje [${nroViaje}] no encontrado tras ${maxSearchRetries} intentos. El backend puede no haberlo indexado. URL final: ${this.page.url()}`);

  }

  // --- ASEGÚRATE DE TENER ESTE HELPER (Lo usamos para la Carga) ---


  // --- 7. ASIGNAR VIAJE (ORDENADO: Selección -> Espera -> Healer -> Vehículo) ---
  async assignViaje(nroViaje: string, transportistaNombre: string, patenteVehiculo: string, nombreConductor: string) {

    logger.info(`🚚 UI: Asignando Viaje [${nroViaje}]`);



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

    logger.info('⏳ Esperando 4s para la estabilización de la cascada de vehículos...');

    await this.page.locator('body').click(); // Blur para asegurar evento

    await this.page.waitForTimeout(4000);



    // A.3 Auto-Curación (Healer)

    // Verificamos si el sistema reseteó el campo. Si es así, lo corregimos ANTES de seguir.

    const currentTrans = await this.page.locator('#s2id_Viajes_transportista_id .select2-chosen').textContent();



    if (!currentTrans?.toUpperCase().includes(transportistaNombre.toUpperCase())) {

      logger.warn(`⚠️ ¡Se detectó un reseteo del transportista! Reaplicando valor...`);



      // Re-seleccionamos

      await this.selectTransportistaRobust(transportistaNombre);

      await this.page.locator('body').click();



      // Esperamos un poco más para asegurar que esta segunda selección pegue

      await this.page.waitForTimeout(3000);

    } else {

      logger.info('✅ El transportista está estable.');

    }



    // ---------------------------------------------------------

    // PASO B: SELECCIÓN DE VEHÍCULO (AHORA SEGURO)

    // ---------------------------------------------------------



    // B.1 Esperar a que los datos existan (usando el ID correcto)

    logger.info(`⏳ Esperando datos del vehículo en #viajes-vehiculo_uno_id...`);

    try {

      await this.page.waitForFunction(() => {

        const select = document.querySelector('#viajes-vehiculo_uno_id') as HTMLSelectElement;

        // Opción 0 es "Seleccione...", esperamos que haya más

        return select && select.options.length > 1;

      }, null, { timeout: 15000 });

      logger.info('✅ ¡Datos del vehículo cargados!');

    } catch (e) {

      logger.warn('⚠️ Tiempo de espera agotado esperando los datos del vehículo. Intentando selección de todas formas...');

    }



    // B.2 Selección por Inyección JS (ID Corregido)

    logger.info(`🚛 Seleccionando vehículo vía JS: ${patenteVehiculo}`);

    await this.forceSelectByText('viajes-vehiculo_uno_id', patenteVehiculo);



    await this.page.waitForTimeout(1000); // Esperar eventos onchange del vehículo



    // ---------------------------------------------------------

    // PASO C: CONDUCTOR Y GUARDADO

    // ---------------------------------------------------------



    // C.1 Selección Conductor

    logger.info(`👨‍✈️ Seleccionando Conductor: ${nombreConductor}`);

    await this.forceSelectByText('viajes-conductor_id', nombreConductor);

    await this.page.waitForTimeout(500);



    // C.2 Guardar

    logger.info('💾 Haciendo clic en Guardar...');

    await this.page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body?.classList.remove('modal-open');
    });
    await this.page.evaluate(() => { const b = document.getElementById('btn_guardar_form') as HTMLElement; if (b) b.click(); });



    // C.3 Manejo Modal Confirmación

    const modal = this.page.locator('text=Confirmación');

    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {

      logger.info('⚠️ Aceptando modal de confirmación...');

      await this.page.locator('button:has-text("Aceptar")').first().evaluate(el => (el as HTMLElement).click());

    }



    // ── FIX: Verificación por búsqueda en grid de /viajes/asignar ──
    logger.info('🔍 Verificando asignación: esperando redirección a /viajes/asignar...');
    await this.verifyAssignmentInGrid(nroViaje);
    logger.info(`✅ Viaje [${nroViaje}] asignado exitosamente`);

  }

  /**
   * Verificación determinista: espera la redirección a /viajes/asignar,
   * busca el nroViaje en el filtro #search, y verifica que exista en el grid.
   */
  private async verifyAssignmentInGrid(nroViaje: string): Promise<void> {
    // 1. Esperar redirect a /viajes/asignar
    await this.page.waitForURL('**/viajes/asignar**', { timeout: 20000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      logger.warn('⚠️ Tiempo de espera networkidle agotado post-redirección, continuando...');
    });
    logger.info(`📍 Redirigido a: ${this.page.url()}`);

    // 2. Buscar el viaje en el filtro
    const searchInput = this.page.locator('#search');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(nroViaje);
    await searchInput.press('Enter');
    logger.info(`🔎 Buscando viaje: ${nroViaje}`);

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



      logger.warn('⚠️ Fallo en la selección de la interfaz de usuario, asegurando con JS...');



    }







    // INTENTO 2: Inyección de JS (Siempre ejecuta para asegurar)



    logger.info('💉 Asegurando valor con inyección JS...');







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



    logger.info(`📋 Seleccionando ${fieldName}: "${textToSelect}"`);



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



    logger.info(`✅ ${fieldName} seleccionado`);



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
