import { Page, expect } from '@playwright/test'; // Agregado 'expect'
import { logger } from '../../src/utils/logger.js';
import {
  generateChileanStreet,
  generateStreetNumber,
  generatePatente,
  generateRandomName,
  generateRandomLastName,
  generateValidChileanRUT,
  generateDocument
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
    return String(Math.floor(Date.now() / 1000) % 1000000); // Timestamp corto para unicidad
  }

  /**
   * Helper para escribir texto lentamente simulando escritura humana.
   */
  private async fillSlowly(selector: string, value: string, delay: number = 80): Promise<void> {
    const locator = this.page.locator(selector);
    await locator.click();
    await locator.clear();
    await this.page.waitForTimeout(200);
    await locator.pressSequentially(value, { delay });
    await this.page.waitForTimeout(300);

    const currentValue = await locator.inputValue();
    const normalizedCurrent = currentValue.replace(/[^0-9Kk]/g, '').toUpperCase();
    const normalizedExpected = value.replace(/[^0-9Kk]/g, '').toUpperCase();

    if (normalizedCurrent !== normalizedExpected) {
      logger.warn(`⚠️ RUT value mismatch - trying to fix. Got: ${currentValue}, Expected: ${value}`);
      const lastChar = normalizedExpected.slice(-1);
      if (!normalizedCurrent.endsWith(lastChar)) {
        await locator.press(lastChar);
        await this.page.waitForTimeout(200);
      }
    }
  }

  // --- 1. TRANSPORTISTA ---
  async createTransportista(baseName: string): Promise<string> {
    const rut = generateValidChileanRUT();
    const nombre = `${baseName} ${this.generateRandomId()}`;
    
    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/transportistas/crear`);
    await this.page.waitForLoadState('networkidle');
    
    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.fillSlowly('input[name="Transportistas[documento]"]', rut, 50);
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

    // USANDO NUEVA LÓGICA DE RESCATE ROBUSTA
    const id = await this.rescueEntityId('Transportista', rut, `${this.baseUrl}/transportistas/index`);
    if (id === '0') throw new Error('Critical: Transportista ID is 0');
    return id;
  }

  // --- 2. CLIENTE ---
  async createCliente(baseName: string): Promise<string> {
    const rut = generateValidChileanRUT();
    const nombre = `${baseName} ${this.generateRandomId()}`;
    
    logger.info(`🚀 UI: Creating Cliente [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/clientes/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('#clientes-nombre', { state: 'visible', timeout: 15000 });

    await this.page.fill('#clientes-nombre', nombre);
    await this.fillSlowly('#clientes-rut', rut, 50);
    await this.page.fill('#clientes-nombre_fantasia', nombre);
    await this.page.fill('#clientes-calle', generateChileanStreet());

    // Dropdowns obligatorios con teclado
    await this.selectWithKeyboard('button[data-id="clientes-tipo_cliente_id"]');
    await this.selectWithKeyboard('button[data-id="clientes-region_id"]', 2000); // Wait for cascade
    await this.selectWithKeyboard('button[data-id="clientes-ciudad_id"]', 2000); // Wait for cascade
    await this.selectWithKeyboard('button[data-id="clientes-comuna_id"]');

    // Polígonos (Manejo robusto)
    await this.handlePoligonos();

    // Guardar
    await Promise.all([ 
      this.page.waitForNavigation({ waitUntil: 'networkidle' }), 
      this.page.locator('button:has-text("Guardar"), #btn_guardar').first().click() 
    ]);

    // USANDO NUEVA LÓGICA DE RESCATE ROBUSTA
    const id = await this.rescueEntityId('Cliente', rut, `${this.baseUrl}/clientes/index`);
    if (id === '0') throw new Error('Critical: Cliente ID is 0');
    
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
    await this.selectBootstrapDropdownSimple('button[data-id="vehiculos-transportista_id"]', transportistaNombre, 'Transportista');

    // Seleccionar Tipo Vehículo: TRACTO
    await this.selectBootstrapDropdownSimple('button[data-id="vehiculos-tipo_vehiculo_id"]', 'TRACTO', 'Tipo Vehículo');
    await this.page.waitForTimeout(1000); // Esperar carga AJAX

    // Seleccionar Capacidad: 3 KG
    const capacidadBtn = this.page.locator('button[data-id="vehiculos-capacidad_id"]');
    if (await capacidadBtn.isVisible({ timeout: 3000 })) {
        await this.selectBootstrapDropdownSimple('button[data-id="vehiculos-capacidad_id"]', '3 KG', 'Capacidad');
    }

    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.page.locator('button:has-text("Guardar")').click()
    ]);
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
    await this.fillSlowly('input[name="Conductores[documento]"]', rut, 50);

    await this.selectWithKeyboard('button[data-id="conductores-licencia"]');

    // Fecha Futura
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const dateStr = `${String(futureDate.getDate()).padStart(2, '0')}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${futureDate.getFullYear()}`;
    const fechaInput = this.page.locator('#conductores-fecha_vencimiento_licencia, input[name*="fecha_vencimiento_licencia"]');
    if (await fechaInput.isVisible()) {
        await fechaInput.fill(dateStr);
        await this.page.keyboard.press('Tab');
    }

    await this.selectBootstrapDropdownSimple('button[data-id="conductores-transportista_id"]', transportistaNombre, 'Transportista');

    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);
    return nombre;
  }

  // --- 5. CONTRATOS ---
  private async fillGenericContract(tipoVal: '1'|'2', entityName: string, selectId: string) {
    const nro = this.generateRandomId();
    logger.info(`📝 Creating contract [${nro}] tipo=${tipoVal} for: ${entityName}`);
    await this.page.goto(`${this.baseUrl}/contrato/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.fill('#contrato-nro_contrato', nro);

    // AJAX Wait
    const ajaxPromise = this.page.waitForResponse(r => r.url().includes('rendersubview') && r.status() === 200, { timeout: 15000 }).catch(()=>null);
    await this.page.evaluate((val) => {
      const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
      if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, tipoVal);
    await ajaxPromise;
    await this.page.waitForTimeout(1000);

    if (tipoVal === '2') {
      const tipoSelect = this.page.locator('select#tipo');
      if (await tipoSelect.isVisible({ timeout: 3000 })) {
        await this.page.selectOption('select#tipo', '1');
        await this.page.waitForTimeout(1000);
      }
    }

    // Selección robusta de entidad
    const buttonSelector = `button[data-id="${selectId}"]`;
    await this.selectBootstrapDropdownSimple(buttonSelector, entityName, 'Entidad Contrato');

    await this.page.click('#btn_guardar');
    await this.page.waitForNavigation({ waitUntil: 'networkidle' });

    const currentUrl = this.page.url();
    if (currentUrl.includes('/editar/')) {
      logger.info(`✅ Contract saved, adding routes...`);
      await this.addRouteAndTarifas('20000', '50000');
    }
  }

  // Método auxiliar para agregar rutas (Mantenido de tu código)
  private async addRouteAndTarifas(tarifaConductor: string, tarifaViaje: string): Promise<void> {
    logger.info('🛣️ Adding Route 715 and Cargo with SLOW tarifa entry...');
    
    // Limpieza de modales previos
    await this.page.evaluate(() => {
        document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
        document.body.classList.remove('modal-open');
    });

    const btnAnadirRuta = this.page.locator('button:has-text("Añadir Ruta")').first();
    await btnAnadirRuta.waitFor({ state: 'visible', timeout: 10000 });
    await btnAnadirRuta.scrollIntoViewIfNeeded();
    await btnAnadirRuta.click();

    await this.page.waitForSelector('#modalRutas', { state: 'visible', timeout: 15000 });
    
    // Ruta y Cargo
    await this.page.click('a#btn_plus_715');
    const closeBtn = this.page.locator('#modalRutas .btn-secondary').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    
    await this.page.click('#btn_click_715');
    await this.page.waitForTimeout(500);
    await this.page.click('a#btn_plus_ruta_715_19');

    await this.page.waitForTimeout(1000); // Esperar que se agregue la fila

    // Tarifas
    await this.fillSlowly('#txt_tarifa_conductor_715', tarifaConductor, 50);
    await this.fillSlowly('#txt_tarifa_extra_715', tarifaViaje, 50);
    await this.page.waitForTimeout(1000);

    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);
  }

  async createContratoCosto(transportistaNombre: string) {
    await this.fillGenericContract('1', transportistaNombre, 'contrato-transportista_id');
  }

  async createContratoVenta(clienteNombre: string) {
    await this.fillGenericContract('2', clienteNombre, 'contrato-cliente_id');
  }

  // --- 6. PLANIFICAR VIAJE (FIXED 🔧) ---
  async createViaje(clienteNombre: string, nroViaje: string) {
    logger.info(`🚚 UI: Creating Viaje [${nroViaje}] for Cliente [${clienteNombre}]`);
    
    // FIX 1: Esperar estabilidad total antes de navegar (evita "interrupted by another navigation")
    await this.page.waitForLoadState('networkidle');
    
    await this.page.goto(`${this.baseUrl}/viajes/crear`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    await this.page.fill('#viajes-nro_viaje', nroViaje);

    // Dropdowns
    await this.selectBootstrapDropdownSimple('button[data-id="tipo_operacion_form"]', 'tclp2210', 'Tipo Operación');
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_servicio_id"]', 'tclp2210', 'Tipo Servicio');
    
    // Cliente (Cascade)
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-cliente_id"]', clienteNombre, 'Cliente');
    await this.page.waitForLoadState('networkidle'); // Esperar carga de datos del cliente
    
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-tipo_viaje_id"]', 'Normal', 'Tipo Viaje');
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-unidad_negocio_id"]', 'Defecto', 'Unidad Negocio');
    await this.page.waitForLoadState('networkidle');

    // Carga (Trigger route calc)
    await this.selectBootstrapDropdownSimple('button[data-id="viajes-carga_id"]', 'Pallet_Furgon_Frio_10ton', 'Código Carga');
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(2000);

    // FIX 2: Agregar Ruta Robustecido
    logger.info('📍 Adding Route...');
    const btnAgregarRuta = this.page.locator('button:has-text("Agregar Ruta")').first();
    
    // Esperamos explícitamente a que el botón NO esté deshabilitado (clave para CI)
    await expect(btnAgregarRuta).not.toBeDisabled({ timeout: 20000 });
    
    await btnAgregarRuta.click();
    await this.page.waitForTimeout(1000);

    // Seleccionar ruta en modal
    const primeraRuta = this.page.locator('#tabla-rutas tbody tr .btn-success').first();
    if (await primeraRuta.isVisible({ timeout: 5000 })) {
      await primeraRuta.click();
      logger.info('✅ Route selected');
    } else {
      logger.warn('⚠️ No route found in modal');
    }
    
    await this.page.click('#btn_guardar_form');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // --- UTILS ---

  // Helper para select simple con teclado
  private async selectWithKeyboard(selector: string, waitAfter: number = 500) {
    await this.page.click(selector);
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(waitAfter);
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
  }

  private async handlePoligonos() {
    const poligonosBtn = this.page.locator('button[data-id*="poligono"], button[data-id*="Poligono"]').first();
    if (await poligonosBtn.isVisible({ timeout: 2000 }).catch(()=>false)) {
        await poligonosBtn.click();
        const selectAll = this.page.locator('.bs-select-all');
        if (await selectAll.isVisible()) await selectAll.click();
        await this.page.keyboard.press('Escape');
    }
  }

  // --- FIX 3: RESCUE ID ROBUSTO (#search) ---
  private async rescueEntityId(entityName: string, uniqueRut: string, indexUrl: string): Promise<string> {
    const urlMatch = this.page.url().match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (urlMatch && urlMatch[1]) return urlMatch[1];

    logger.warn(`⚠️ ID rescue needed for ${entityName}. Searching in Index...`);
    await this.page.goto(indexUrl);
    
    // Selector combinado: busca #search OR input[type=search]
    const searchInput = this.page.locator('#search, input[type="search"]').first();
    
    await searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await searchInput.fill(uniqueRut);
    
    // Click en botón Buscar (si existe) o Enter
    const btnBuscar = this.page.getByRole('link', { name: 'Buscar' });
    if (await btnBuscar.isVisible()) {
        await btnBuscar.click();
    } else {
        await this.page.keyboard.press('Enter');
    }
    
    try {
      await this.page.waitForResponse(r => r.url().includes('index') && r.status() === 200, { timeout: 10000 });
      const link = this.page.locator('table tbody tr:first-child a[href*="editar"]').first();
      const href = await link.getAttribute('href') || '';
      const match = href.match(/\/(?:editar|update|ver|view)\/(\d+)/);
      if (match) return match[1];
    } catch (e) {
      logger.error(`❌ Failed to rescue ID for ${entityName}`);
    }
    return '0';
  }
}