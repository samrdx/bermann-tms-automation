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
    this.baseUrl = 'https://moveontruckqa.bermanntms.cl';
  }

  async initialize(): Promise<void> {
    logger.info(`✅ TmsApiClient initialized`);
  }

  private generateRandomId(): string {
    return String(Math.floor(10000 + Math.random() * 90000));
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
   * Usa escritura lenta humanizada con validación post-escritura y fallbacks.
   *
   * @param selector - CSS selector del campo RUT
   * @param rutValue - RUT en formato crudo con guión (ej: "12345678-K")
   */
  private async typeRutSlowly(selector: string, rutValue: string): Promise<void> {
    logger.info(`🔑 typeRutSlowly: Writing RUT [${rutValue}] on ${selector}`);
    const locator = this.page.locator(selector);

    // Normalizar: quitar puntos, uppercase, extraer body y DV
    const normalize = (val: string) => val.toUpperCase().replace(/[^0-9K]/g, '');
    const normalizedExpected = normalize(rutValue);
    const verificationDigit = normalizedExpected.slice(-1); // 'K' o dígito
    const rutBody = normalizedExpected.slice(0, -1);
    const rawWithHyphen = `${rutBody}-${verificationDigit}`;

    // Formatear como TMS: XX.XXX.XXX-V (para fallback JS)
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

    // Si DV es 'K', intentar con minúscula en el segundo intento
    const retryRut = verificationDigit === 'K'
      ? `${rutBody}-k`
      : rawWithHyphen;

    await locator.pressSequentially(retryRut, { delay: 150 });
    await this.page.waitForTimeout(500);

    currentValue = await locator.inputValue();
    normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT verified (attempt 2): ${currentValue}`);
      return;
    }

    // --- Intento 3: Fallback JavaScript (inyección directa) ---
    logger.warn(`⚠️ RUT mismatch (attempt 2). Got: [${currentValue}] (${normalizedCurrent}). Using JS fallback...`);

    const tmsFormatted = formatTmsRut(rutBody, verificationDigit);

    await this.page.evaluate(
      ({ sel, formattedValue }) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (input) {
          // Desactivar handlers del input mask temporalmente
          const savedOnInput = input.oninput;
          const savedOnChange = input.onchange;
          const savedOnKeydown = input.onkeydown;

          input.oninput = null;
          input.onchange = null;
          input.onkeydown = null;

          input.value = formattedValue;

          // Restaurar handlers
          input.oninput = savedOnInput;
          input.onchange = savedOnChange;
          input.onkeydown = savedOnKeydown;

          // Disparar eventos para que el formulario reconozca el valor
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

    // Si el body coincide pero falta el DV, log warning pero continuar
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

    // Extraer ID de la URL o buscar en el index (Lógica Robusta portada de Cliente)
    let id = '0';
    let currentUrl = this.page.url();
    logger.info(`📍 URL after save: ${currentUrl}`);

    // 1. Intentar sacar ID directo de la URL (si redirigió a /ver o /editar)
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ Transportista ID extracted from URL: ${id}`);
    } else {
      // 2. Si no redirigió, estamos en el index: USAR FILTRO DE BÚSQUEDA
      logger.info(`🔍 Using search filter to find Transportista: ${nombre}`);
      await this.page.waitForTimeout(1000);

      // Usar el campo de búsqueda #search
      const searchInput = this.page.locator('#search');
      await searchInput.fill(nombre);
      logger.info(`🔎 Filled search with: ${nombre}`);

      // Hacer click en link Buscar
      await this.page.getByRole('link', { name: 'Buscar' }).click();
      await this.page.waitForLoadState('networkidle');
      logger.info(`🔎 Clicked Buscar link`);
      await this.page.waitForTimeout(2000); // Espera vital para refresco de tabla AJAX

      // Buscar en la tabla por nombre (Fila con data-key)
      const row = this.page.locator('table tbody tr[data-key]').filter({ hasText: nombre }).first();

      if (await row.count() > 0) {
        const dataKey = await row.getAttribute('data-key');
        if (dataKey) {
          id = dataKey;
          logger.info(`✅ Transportista ID from data-key: ${id}`);
        }
      } else {
        // Fallback: buscar cualquier fila que contenga el nombre
        logger.info(`🔎 Trying alternative search in table...`);
        const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();
        if (await anyRow.count() > 0) {
          const dataKey = await anyRow.getAttribute('data-key');
          if (dataKey) {
            id = dataKey;
            logger.info(`✅ Transportista ID from fallback data-key: ${id}`);
          } else {
            // Buscar link con ID en la fila (ajustado para transportistas)
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

    // Campos obligatorios
    await this.page.fill('#clientes-nombre', nombre);
    await this.typeRutSlowly('#clientes-rut', rut);
    await this.page.fill('#clientes-nombre_fantasia', nombre);

    // Dirección
    await this.page.fill('#clientes-calle', generateChileanStreet());

    // Seleccionar Tipo Cliente (obligatorio)
    await this.page.click('button[data-id="clientes-tipo_cliente_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Seleccionar Region (obligatorio)
    await this.page.click('button[data-id="clientes-region_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Seleccionar Ciudad (obligatorio)
    await this.page.click('button[data-id="clientes-ciudad_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Seleccionar Comuna (obligatorio)
    await this.page.click('button[data-id="clientes-comuna_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Seleccionar Polígonos
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

    // Guardar
    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);

    // Extraer ID
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

    // Seleccionar transportista
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

    // Tipo Vehículo
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

    // Capacidad
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

    // Guardar
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

    // Licencia
    await this.page.click('button[data-id="conductores-licencia"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Fecha
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

    // Transportista
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

    // Guardar
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
  private async fillGenericContract(tipoVal: '1' | '2', entityName: string, selectId: string) {
    const nro = this.generateRandomId();
    logger.info(`📝 Creating contract [${nro}] tipo=${tipoVal} for: ${entityName}`);
    await this.page.goto(`${this.baseUrl}/contrato/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.fill('#contrato-nro_contrato', nro);

    // CORRECCIÓN AQUÍ: Agregado el tipo explícito ': string' a 'val'
    await this.page.evaluate((val: string) => {
      const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
      if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, tipoVal);

    await this.page.waitForTimeout(3000);

    if (tipoVal === '2') {
      const tipoSelect = this.page.locator('select#tipo');
      if (await tipoSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.page.selectOption('select#tipo', '1');
        await this.page.waitForTimeout(1000);
      }
    }

    const buttonSelector = `button[data-id="${selectId}"]`;
    await this.page.click(buttonSelector);
    await this.page.waitForTimeout(500);
    const searchBox = this.page.locator('.dropdown-menu.show .bs-searchbox input');
    if (await searchBox.isVisible()) {
      await searchBox.fill(entityName);
      await this.page.waitForTimeout(1000);
    }
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);

    const currentUrl = this.page.url();
    if (currentUrl.includes('/editar/')) {
      logger.info(`✅ Contract saved, adding routes...`);
      await this.addRouteAndTarifas('20000', '50000');
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

    // Selectores Dropdown
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
    await this.page.waitForTimeout(2000); // Esperar cálculo de rutas

    // Abrir Modal de Rutas
    logger.info('📍 Adding Route...');
    const btnAgregarRuta = this.page.locator('button:has-text("Agregar Ruta")').first();
    await btnAgregarRuta.waitFor({ state: 'visible', timeout: 15000 });
    await btnAgregarRuta.click();
    await this.page.waitForTimeout(1000); // Esperar animación del modal

    // --- FIX: SELECCIÓN DE RUTA 715 ---
    // Usamos el selector XPath específico que me diste para asegurar el click en el ícono correcto
    const ruta715Selector = this.page.locator(`//tr[td[contains(., '715')]]//i`).first();

    // Fallback: Si no existe la 715, intentamos la primera verde disponible (por robustez)
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

    // Guardar
    logger.info('💾 Clicking Guardar...');
    await this.page.click('#btn_guardar_form');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Validación
    const successToast = this.page.locator('text="Viaje Creado con éxito"');
    const nroViajeVal = await this.page.locator('#viajes-nro_viaje').inputValue().catch(() => '');

    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false) || nroViajeVal === '') {
      logger.info(`✅ Viaje [${nroViaje}] created successfully via UI`);
    } else {
      logger.warn(`⚠️ Could not confirm viaje creation, continuing...`);
    }
  }
  // --- 7. ASIGNAR VIAJE --
  async assignViaje(nroViaje: string, transportistaNombre: string, patenteVehiculo: string, nombreConductor: string) {
    logger.info(`🚚 UI: Assigning Viaje [${nroViaje}] via JS Injection strategy`);

    // 1. Navegar y Buscar (Igual que antes)
    await this.page.goto(`${this.baseUrl}/viajes/asignar`);
    await this.page.waitForLoadState('networkidle');

    const searchInput = this.page.locator('#search, input[type="search"]').first();
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(nroViaje);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // 2. Abrir Formulario
    const row = this.page.locator('table tbody tr').filter({ hasText: nroViaje }).first();
    await expect(row).toBeVisible();
    const btnAsignar = row.locator('a[href*="asignar"], a[href*="update"], .btn-primary').first();
    await btnAsignar.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    // 3. SELECCIONAR TRANSPORTISTA (Disparador de Cascada)
    // Usamos la inyección también aquí para asegurar que los eventos se disparen
    await this.forceSelectByText('viajes-transportista_id', transportistaNombre);

    // CRÍTICO: Esperar que el AJAX responda y llene los otros selects
    logger.info('⏳ Waiting for AJAX cascade (Vehicles/Drivers loading)...');
    await this.page.waitForTimeout(3000);

    // 4. SELECCIONAR VEHÍCULO (Directo al código, sin clicks visuales)
    // El ID real suele ser el mismo que el data-id del botón pero con guiones o guiones bajos
    // Probamos con el estándar de Yii2: 'viajes-vehiculo_id'
    await this.forceSelectByText('viajes-vehiculo_id', patenteVehiculo);

    // 5. SELECCIONAR CONDUCTOR (Directo al código)
    await this.forceSelectByText('viajes-conductor_id', nombreConductor);

    // Verificación visual rápida (Opcional: toma una captura si falla)
    await this.page.waitForTimeout(500);

    // 6. GUARDAR
    logger.info('💾 Clicking Guardar...');
    const btnGuardar = this.page.locator('#btn_guardar_form, #btn_guardar, button:has-text("Guardar")').first();
    await btnGuardar.click();

    await this.page.waitForLoadState('networkidle');

    // Validar éxito
    await expect(this.page.locator('body')).toContainText('éxito', { timeout: 5000 });
    logger.info(`✅ Viaje [${nroViaje}] assigned successfully!`);
  }
  // --- UTILS ---
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
  /**
   * FUERZA BRUTA: Selecciona una opción en un <select> oculto basándose en su TEXTO visible.
   * Útil cuando los dropdowns visuales (div/span) no responden a los clics.
   */
  private async forceSelectByText(selectId: string, textToSelect: string): Promise<void> {
    logger.info(`💉 JS Injection: Forcing selection in #${selectId} -> "${textToSelect}"`);

    const result = await this.page.evaluate(({ id, text }) => {
      // 1. Encontrar el elemento select real (aunque esté oculto)
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) return { success: false, msg: 'Select element not found' };

      // 2. Buscar la opción que contenga el texto (Patente o Nombre)
      const option = Array.from(select.options).find(opt =>
        opt.text.toUpperCase().includes(text.toUpperCase())
      );

      if (!option) return { success: false, msg: `Option containing "${text}" not found in #${id}` };

      // 3. CAMBIAR EL VALOR
      select.value = option.value;

      // 4. DISPARAR EVENTOS (Vital para que Yii2/Angular/React detecten el cambio)
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));

      // 5. Actualizar Bootstrap-Select (si existe en la página)
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
      // Opcional: Lanzar error si es crítico
      // throw new Error(result.msg);
    } else {
      logger.info(`✅ JS Injection Success: Selected value [${result.value}] for text "${result.text}"`);
    }
  }
}