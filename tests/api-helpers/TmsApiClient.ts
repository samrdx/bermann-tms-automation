import { Page } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import { ContratosFormPage } from '../../src/modules/contracts/pages/ContratosPage.js';
import {
  generateDocument,
  generateChileanStreet,
  generateStreetNumber,
  generatePatente,
  generateRandomName,
  generateRandomLastName,
  generateValidChileanRUT,
  generateShortCompanyName
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

  // --- 1. TRANSPORTISTA ---
  async createTransportista(nombre: string): Promise<string> {
    const rut = generateDocument('RUT');
    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/transportistas/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('input[name="Transportistas[nombre]"]', { state: 'visible', timeout: 15000 });
    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.page.fill('input[name="Transportistas[documento]"]', rut);
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
    const rut = generateDocument('RUT');
    logger.info(`🚀 UI: Creating Cliente [${nombre}] RUT: [${rut}]`);
    await this.page.goto(`${this.baseUrl}/clientes/crear`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('#clientes-nombre', { state: 'visible', timeout: 15000 });

    // Campos obligatorios
    await this.page.fill('#clientes-nombre', nombre);
    await this.page.fill('#clientes-rut', rut);
    await this.page.fill('#clientes-nombre_fantasia', nombre);

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

    // Guardar
    await this.page.click('#btn_guardar');
    await this.page.waitForTimeout(3000);

    // Extraer ID de la URL o buscar en el index
    let id = '0';
    let currentUrl = this.page.url();
    let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) {
      id = idMatch[1];
    } else {
      // Navegar al index para buscar el cliente
      await this.page.goto(`${this.baseUrl}/clientes/index`);
      await this.page.waitForLoadState('networkidle');

      // Buscar en la tabla por nombre
      const searchInput = this.page.locator('input[type="search"], .dataTables_filter input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(nombre);
        await this.page.waitForTimeout(2000);
      }

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

    // Seleccionar Tipo Vehículo
    await this.page.click('button[data-id="vehiculos-tipo_vehiculo_id"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

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
    const rut = generateDocument('RUT');
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
    await this.page.fill('input[name="Conductores[documento]"]', rut);

    // Seleccionar Licencia (obligatorio)
    await this.page.click('button[data-id="conductores-licencia"]');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

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
      // Fase 2: Agregar Ruta 715 y Tarifas
      const contratosPage = new ContratosFormPage(this.page);
      await contratosPage.addSpecificRouteAndCargo('20000', '50000');
      await contratosPage.saveAndExtractId();
    } else {
      logger.info(`⚠️ Contract form submitted (URL: ${currentUrl})`);
    }
  }

  async createContratoCosto(transportistaNombre: string) {
    await this.fillGenericContract('1', transportistaNombre, 'contrato-transportista_id');
  }

  async createContratoVenta(clienteNombre: string) {
    await this.fillGenericContract('2', clienteNombre, 'contrato-cliente_id');
  }

  // --- 6. PLANIFICAR VIAJE ---
  async createViaje(clienteId: string, nroViaje: string) {
    logger.info(`🚚 API: Creating Viaje [${nroViaje}] for Cliente ID [${clienteId}]`);
    await this.page.goto(`${this.baseUrl}/viajes/crear`);
    const csrfToken = await this.page.locator('meta[name="csrf-token"]').getAttribute('content') || '';
    const response = await this.page.request.post(`${this.baseUrl}/viajes/crear`, {
      form: {
        '_csrf': csrfToken, 'Viajes[nro_viaje]': nroViaje, 'Viajes[cliente_id]': clienteId,
        'tipo_operacion': '4', 'Viajes[tipo_servicio_id]': '18', 'Viajes[carga_id]': '3',
        '_OrigenDestinoForm[origen]': '81269', '_OrigenDestinoForm[destino]': '83349',
        '_OrigenDestinoForm[fechaEntradaOrigen]': '10/02/2026 12:00', '_OrigenDestinoForm[fechaEntradaDestino]': '10/02/2026 14:00'
      }
    });
    if (!response.ok()) throw new Error(`Fallo creando viaje: ${response.status()}`);
    logger.info(`✅ Viaje [${nroViaje}] created successfully`);
  }
}