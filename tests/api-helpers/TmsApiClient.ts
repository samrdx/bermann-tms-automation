import { Page } from '@playwright/test';
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
  // toma la variable de entorno, o usa la default si estás en local
  this.baseUrl = process.env.BASE_URL || 'https://moveontruckqa.bermanntms.cl';
}

  async initialize(): Promise<void> {
    logger.info(`✅ TmsApiClient initialized`);
  }

  private generateRandomId(): string {
    return String(Math.floor(10000 + Math.random() * 90000));
  }

  /**
   * Helper para escribir texto lentamente simulando escritura humana.
   * Evita problemas con Bootstrap input masks que pierden caracteres con escritura rápida.
   * Especialmente importante para RUTs con dígito verificador "K".
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
   * Verifica si hay un error de RUT inválido visible en la página.
   */
  private async checkForRutError(): Promise<boolean> {
    const hasError = await this.page.getByText('El rut ingresado no es valido', { exact: true })
      .isVisible({ timeout: 1000 }).catch(() => false);
    if (hasError) {
      logger.error('RUT validation error detected!');
      return true;
    }
    return false;
  }

  // --- 1. TRANSPORTISTA ---
  async createTransportista(nombre: string): Promise<string> {
    const rut = generateValidChileanRUT(); // Formato sin puntos: "12345678-9"
    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/transportistas/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.fillSlowly('input[name="Transportistas[documento]"]', rut, 50); // Escritura lenta para evitar pérdida de caracteres
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

    // Extraer ID de la URL o buscar en el index
    let id = '0';
    const currentUrl = this.page.url();
    const idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
    } else if (currentUrl.includes('/index')) {
      // Buscar en la tabla por nombre
      const row = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();
      if (await row.count() > 0) {
        const dataKey = await row.getAttribute('data-key');
        if (dataKey) {
          id = dataKey;
        } else {
          const link = row.locator('a[href*="/ver/"], a[href*="/editar/"]').first();
          const href = await link.getAttribute('href');
          const match = href?.match(/\/(\d+)/);
          if (match) id = match[1];
        }
      }
    }
    logger.info(`✅ Transportista created with ID: ${id}`);
    return id;
  }

  // --- 2. CLIENTE ---
  async createCliente(nombre: string): Promise<string> {
    const rut = generateValidChileanRUT(); // Formato sin puntos: "12345678-9"
    logger.info(`🚀 UI: Creating Cliente [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/clientes/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('#clientes-nombre', { state: 'visible', timeout: 15000 });

    // Campos obligatorios
    await this.page.fill('#clientes-nombre', nombre);
    await this.fillSlowly('#clientes-rut', rut, 50); // Escritura lenta para evitar pérdida de caracteres
    await this.page.fill('#clientes-nombre_fantasia', nombre);

    // Dirección
    await this.page.fill('#clientes-calle', generateChileanStreet());

    // Seleccionar Tipo Cliente (obligatorio) - usando teclado
    await this.page.click('button[data-id="clientes-tipo_cliente_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Seleccionar Region (obligatorio) - usando teclado
    await this.page.click('button[data-id="clientes-region_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000); // Esperar cascade de ciudades

    // Seleccionar Ciudad (obligatorio) - usando teclado
    await this.page.click('button[data-id="clientes-ciudad_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000); // Esperar cascade de comunas

    // Seleccionar Comuna (obligatorio) - usando teclado
    await this.page.click('button[data-id="clientes-comuna_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Seleccionar Polígonos - dropdown multi-select Bootstrap
    logger.info('📍 Selecting Polígonos...');
    // Buscar el botón del Bootstrap Select que tenga data-id relacionado con poligonos
    const poligonosBtn = this.page.locator('button[data-id*="poligono"], button[data-id*="Poligono"]').first();

    if (await poligonosBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await poligonosBtn.click();
      await this.page.waitForTimeout(500);

      // Click en "Seleccionar todos" dentro del dropdown visible
      const selectAllBtn = this.page.locator('.dropdown-menu.show button.actions-btn.bs-select-all');
      if (await selectAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selectAllBtn.click();
        logger.info('✅ Polígonos: Seleccionar todos clicked');
      } else {
        // Fallback: hacer click en la primera opción disponible
        const firstOption = this.page.locator('.dropdown-menu.show .dropdown-item, .dropdown-menu.show li a').first();
        if (await firstOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await firstOption.click();
          logger.info('✅ Polígonos: Primera opción seleccionada');
        }
      }

      // Cerrar dropdown
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } else {
      // Fallback: buscar por label text
      logger.info('🔎 Trying fallback selector for Polígonos...');
      const labelDiv = this.page.locator('label:has-text("Polígonos")').first();
      if (await labelDiv.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Buscar el dropdown button hermano o cercano
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

    // Extraer ID de la URL o buscar en el index
    let id = '0';
    let currentUrl = this.page.url();
    logger.info(`📍 URL after save: ${currentUrl}`);

    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
      logger.info(`✅ Cliente ID extracted from URL: ${id}`);
    } else {
      // Ya estamos en el index después de guardar - usar el filtro de búsqueda
      logger.info(`🔍 Using search filter to find Cliente: ${nombre}`);
      await this.page.waitForTimeout(1000);

      // Usar el campo de búsqueda #search en la sección Filtros
      const searchInput = this.page.locator('#search');
      await searchInput.fill(nombre);
      logger.info(`🔎 Filled search with: ${nombre}`);

      // Hacer click en link Buscar (es un <a>, no un button)
      await this.page.getByRole('link', { name: 'Buscar' }).click();
      await this.page.waitForLoadState('networkidle');
      logger.info(`🔎 Clicked Buscar link`);
      await this.page.waitForTimeout(2000);

      // Buscar en la tabla por nombre
      const row = this.page.locator('table tbody tr[data-key]').filter({ hasText: nombre }).first();

      if (await row.count() > 0) {
        const dataKey = await row.getAttribute('data-key');
        if (dataKey) {
          id = dataKey;
          logger.info(`✅ Cliente ID from data-key: ${id}`);
        }
      } else {
        // Fallback: buscar cualquier fila que contenga el nombre
        logger.info(`🔎 Trying alternative search in table...`);
        const anyRow = this.page.locator('table tbody tr').filter({ hasText: nombre }).first();
        if (await anyRow.count() > 0) {
          const dataKey = await anyRow.getAttribute('data-key');
          if (dataKey) {
            id = dataKey;
            logger.info(`✅ Cliente ID from fallback data-key: ${id}`);
          } else {
            // Buscar link con ID en la fila
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

  // --- 3. VEHÍCULO (Asociado al transportista por NOMBRE) ---
  async createVehiculo(transportistaNombre: string): Promise<string> {
    const patente = generatePatente();
    logger.info(`🚛 UI: Creating Vehículo [${patente}] for Transportista: ${transportistaNombre}`);
    await this.page.goto(`${this.baseUrl}/vehiculos/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('input[name="Vehiculos[patente]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Vehiculos[patente]"]', patente);
    await this.page.fill('input[name="Vehiculos[muestra]"]', patente); // Muestra = Patente

    // Seleccionar transportista por NOMBRE usando Bootstrap Select
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

    // Seleccionar Tipo Vehículo: TRACTO
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
    await this.page.waitForTimeout(1000); // Esperar carga AJAX de Capacidad

    // Seleccionar Capacidad: 3 KG (se carga vía AJAX después de seleccionar tipo)
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

  // --- 4. CONDUCTOR (Asociado al transportista por NOMBRE) ---
  async createConductor(transportistaNombre: string): Promise<string> {
    const nombre = generateRandomName();
    const rut = generateValidChileanRUT(); // Formato sin puntos: "12345678-9"
    const usuario = `user${Math.floor(Math.random() * 100000)}`;
    const clave = `pass${Math.floor(Math.random() * 100000)}`;
    logger.info(`👨‍✈️ UI: Creating Conductor [${nombre}] for Transportista: ${transportistaNombre}`);
    await this.page.goto(`${this.baseUrl}/conductores/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('input[name="Conductores[nombre]"]', { state: 'visible', timeout: 15000 });

    // Campos obligatorios
    await this.page.fill('input[name="Conductores[usuario]"]', usuario);
    await this.page.fill('input[name="Conductores[clave]"]', clave);
    await this.page.fill('input[name="Conductores[nombre]"]', nombre);
    await this.page.fill('input[name="Conductores[apellido]"]', generateRandomLastName());
    await this.fillSlowly('input[name="Conductores[documento]"]', rut, 50); // Escritura lenta para evitar pérdida de caracteres

    // Seleccionar Licencia (obligatorio)
    await this.page.click('button[data-id="conductores-licencia"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Fecha de vencimiento licencia: Hoy + 1 año
    const fechaVencimiento = new Date();
    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
    const dia = String(fechaVencimiento.getDate()).padStart(2, '0');
    const mes = String(fechaVencimiento.getMonth() + 1).padStart(2, '0');
    const anio = fechaVencimiento.getFullYear();
    const fechaStr = `${dia}-${mes}-${anio}`; // Formato: DD-MM-YYYY
    logger.info(`📅 Setting fecha vencimiento licencia: ${fechaStr}`);

    const fechaInput = this.page.locator('#conductores-fecha_vencimiento_licencia, input[name="Conductores[fecha_vencimiento_licencia]"]').first();
    if (await fechaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fechaInput.click();
      await this.page.waitForTimeout(300);
      await fechaInput.fill(fechaStr);
      await this.page.keyboard.press('Tab'); // Cerrar datepicker si existe
      await this.page.waitForTimeout(500);
    }

    // Seleccionar transportista por NOMBRE usando Bootstrap Select
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

    // Guardar - sin esperar navegación (puede usar AJAX)
    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);

    // Verificar si guardó exitosamente (URL cambió o se cerró modal)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/index') || currentUrl.includes('/ver') || currentUrl.includes('/editar')) {
      logger.info(`✅ Conductor created: ${nombre}`);
    } else {
      logger.info(`⚠️ Conductor form submitted (URL: ${currentUrl})`);
    }
    return nombre; // Devolver nombre para facilitar asociación
  }

  // --- 5. LÓGICA DE CONTRATOS ---
  private async fillGenericContract(tipoVal: '1'|'2', entityName: string, selectId: string) {
    const nro = this.generateRandomId();
    logger.info(`📝 Creating contract [${nro}] tipo=${tipoVal} for: ${entityName}`);
    await this.page.goto(`${this.baseUrl}/contrato/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.fill('#contrato-nro_contrato', nro);

    // Seleccionar tipo (Costo o Venta) y esperar carga
    await this.page.evaluate((val) => {
      const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
      if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, tipoVal);
    await this.page.waitForTimeout(3000); // Esperar carga AJAX

    if (tipoVal === '2') { // Si es venta, seleccionar subtipo Clientes
      const tipoSelect = this.page.locator('select#tipo');
      if (await tipoSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.page.selectOption('select#tipo', '1');
        await this.page.waitForTimeout(1000);
      }
    }

    // Seleccionar la entidad usando Bootstrap Select con searchbox
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

    // Guardar contrato
    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);

    // Verificar si estamos en edición
    const currentUrl = this.page.url();
    if (currentUrl.includes('/editar/')) {
      logger.info(`✅ Contract saved, adding routes...`);
      // Fase 2: Agregar Ruta 715 y Tarifas - directamente en TmsApiClient
      await this.addRouteAndTarifas('20000', '50000');
    } else {
      logger.info(`⚠️ Contract form submitted (URL: ${currentUrl})`);
    }
  }

  /**
   * Agrega Ruta 715 y Cargo 715_19 con tarifas llenadas lentamente.
   * Usado internamente por fillGenericContract.
   */
  private async addRouteAndTarifas(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding Route 715 and Cargo with SLOW tarifa entry...');

    // Cerrar cualquier modal abierto primero
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') $('.modal').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(500);

    // Abrir modal de rutas
    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();
    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });
    await btnAnadirRuta.scrollIntoViewIfNeeded();
    await btnAnadirRuta.click();

    // Esperar modal con retry
    try {
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });
    } catch {
      logger.warn('⚠️ Modal did not open, retrying...');
      await this.page.waitForTimeout(500);
      await btnAnadirRuta.click();
      await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 10000 });
    }

    // Seleccionar Ruta 715
    await this.page.click('a#btn_plus_715');
    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    // Expandir ruta para ver cargos
    await this.page.click('#btn_click_715');
    await this.page.waitForTimeout(1000);

    // Seleccionar Cargo 715_19
    await this.page.click('a#btn_plus_ruta_715_19');

    // Cerrar modales
    await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof $ !== 'undefined') $('.modal').modal('hide');
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await this.page.waitForTimeout(1000);

    // Llenar tarifas LENTAMENTE para que el sistema procese correctamente
    logger.info(`💰 Filling tarifa conductor SLOWLY: ${tarifaConductor}`);
    await this.fillSlowly('#txt_tarifa_conductor_715', tarifaConductor, 100);

    logger.info(`💰 Filling tarifa viaje SLOWLY: ${tarifaViaje}`);
    await this.fillSlowly('#txt_tarifa_extra_715', tarifaViaje, 100);

    // Esperar a que el formulario procese las tarifas
    await this.page.waitForTimeout(2000);

    // Guardar contrato con rutas
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
  /**
   * Crea un viaje usando la UI de planificación.
   * Basado en PlanificarPage y viajes-planificar.test.ts
   */
  async createViaje(clienteNombre: string, nroViaje: string) {
    logger.info(`🚚 UI: Creating Viaje [${nroViaje}] for Cliente [${clienteNombre}]`);
    await this.page.goto(`${this.baseUrl}/viajes/crear`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    // 1. Nro Viaje
    await this.page.fill('#viajes-nro_viaje', nroViaje);
    logger.info(`✅ Filled Nro Viaje: ${nroViaje}`);

    // 2. Tipo Operación (tclp2210)
    await this.selectBootstrapDropdownSimple('button[data-id="tipo_operacion_form"]', 'tclp2210', 'Tipo Operación');

    // 3. Tipo Servicio (tclp2210)
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_servicio_id"]', 'tclp2210', 'Tipo Servicio');

    // 4. Cliente - Trigger cascade
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-cliente_id"]', clienteNombre, 'Cliente');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);

    // 5. Tipo Viaje (Normal)
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_viaje_id"]', 'Normal', 'Tipo Viaje');

    // 6. Unidad Negocio (Defecto)
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-unidad_negocio_id"]', 'Defecto', 'Unidad Negocio');
    await this.page.waitForLoadState('networkidle');

    // 7. Código Carga (Pallet_Furgon_Frio_10ton) - trigger route calculation
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-carga_id"]', 'Pallet_Furgon_Frio_10ton', 'Código Carga');
    await this.page.keyboard.press('Tab');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // 8. Agregar Ruta
    logger.info('📍 Adding Route...');
    const btnAgregarRuta = this.page.locator('button:has-text("Agregar Ruta")').first();
    await btnAgregarRuta.waitFor({ state: 'visible', timeout: 15000 });
    await btnAgregarRuta.click();
    await this.page.waitForTimeout(1000);

    // Seleccionar primera ruta disponible
    const primeraRuta = this.page.locator('#tabla-rutas tbody tr .btn-success').first();
    if (await primeraRuta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await primeraRuta.click();
      logger.info('✅ Route selected');
    } else {
      logger.warn('⚠️ No route found in modal');
    }
    await this.page.waitForTimeout(1000);

    // 9. Guardar
    logger.info('💾 Clicking Guardar...');
    await this.page.click('#btn_guardar_form');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Verificar éxito (toast o form cleared)
    const successToast = this.page.locator('text="Viaje Creado con éxito"');
    const nroViajeVal = await this.page.locator('#viajes-nro_viaje').inputValue().catch(() => '');

    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false) || nroViajeVal === '') {
      logger.info(`✅ Viaje [${nroViaje}] created successfully via UI`);
    } else {
      logger.warn(`⚠️ Could not confirm viaje creation, continuing...`);
    }
  }

  /**
   * Helper para seleccionar en dropdown Bootstrap con scoped selector
   */
  private async selectBootstrapDropdownSimple(buttonSelector: string, textToSelect: string, fieldName: string): Promise<void> {
    logger.info(`📋 Selecting ${fieldName}: "${textToSelect}"`);
    const btn = this.page.locator(buttonSelector);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // Buscar menú dentro del contenedor padre
    const parent = btn.locator('xpath=..');
    const dropdownMenu = parent.locator('div.dropdown-menu.show').first();
    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    // Buscar searchbox si existe
    const searchBox = dropdownMenu.locator('.bs-searchbox input');
    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBox.fill(textToSelect);
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
    } else {
      // Sin buscador: click directo en opción
      const option = dropdownMenu.locator('li a').filter({ hasText: textToSelect }).first();
      await option.click();
    }

    // Cerrar si quedó abierto
    if (await dropdownMenu.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(300);
    logger.info(`✅ ${fieldName} selected`);
  }
}