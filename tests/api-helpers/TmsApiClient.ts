import { Page, APIRequestContext } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import fs from 'fs';

export class TmsApiClient {
  private baseUrl: string;
  private apiContext: APIRequestContext | undefined;

  constructor(private page: Page) {
    this.baseUrl = 'https://moveontruckqa.bermanntms.cl';
  }

  async initialize(): Promise<void> {
    this.apiContext = this.page.request;
    logger.info(`✅ TmsApiClient initialized using Page Request Context`);
  }

  // --- Helpers ---
  private async getCsrfToken(url: string): Promise<string> {
    const response = await this.page.request.get(url);
    const html = await response.text();
    const matchMeta = html.match(/<meta name="csrf-token" content="(.*?)">/);
    if (matchMeta) return matchMeta[1];
    throw new Error(`Could not extract CSRF token from ${url}`);
  }

  private getTodayDate(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private generateRandomContractId(): string {
    return Math.floor(Math.random() * 90000 + 10000).toString();
  }

  /**
   * 🖱️ SELECTOR VISUAL PARA BOOTSTRAP DROPDOWNS
   * En lugar de inyectar JS, hacemos clic en el botón y buscamos la opción.
   * Esto evita crashes de JS en sitios legacy sensibles.
   */
  private async selectBootstrapDropdown(originalSelectId: string, valueToSelect: string) {
    logger.info(`🖱️ UI Select: Selecting value "${valueToSelect}" in dropdown "${originalSelectId}"`);

    // 1. Identificar el botón que abre el dropdown
    // Bootstrap select crea un botón con data-id igual al ID del select original
    const buttonSelector = `button[data-id="${originalSelectId}"]`;

    // Esperar a que el botón sea interactuable
    await this.page.waitForSelector(buttonSelector, { state: 'visible', timeout: 10000 });

    // 2. Hacer clic para abrir
    await this.page.click(buttonSelector);

    // 3. Esperar a que aparezca el menú desplegable (.dropdown-menu)
    const dropdownMenu = this.page.locator(`div.dropdown-menu.show, div.dropdown-menu.open`);
    await dropdownMenu.first().waitFor({ state: 'visible', timeout: 5000 });

    // 4. Buscar la opción correcta
    // Las opciones suelen ser <li><a ...><span class="text">TEXTO</span></a></li>
    // O a veces tienen data-original-index. 
    // Si valueToSelect es el ID (ej: 229), es difícil encontrarlo visualmente si el texto es el nombre.
    // ESTRATEGIA: Usaremos JS para encontrar el índice correcto en el select oculto y hacer clic en el LI correspondiente.

    await this.page.evaluate(({ id, val }) => {
      // Buscamos el select original oculto
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) throw new Error(`Select #${id} not found`);

      // Buscamos qué índice tiene el valor que queremos (ej: 229 es el index 5)
      let indexToClick = -1;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value == val) {
          indexToClick = i;
          break;
        }
      }

      if (indexToClick === -1) throw new Error(`Value ${val} not found in select #${id}`);

      // En Bootstrap Select, los <li> tienen un atributo data-original-index que coincide con el select
      // Buscamos el <li> visible y le hacemos clic nativo
      const li = document.querySelector(`div.dropdown-menu.open li[data-original-index="${indexToClick}"] a`) as HTMLElement;
      if (li) {
        li.click();
      } else {
        // Fallback para versiones más nuevas de bootstrap-select
        const liNew = document.querySelector(`div.dropdown-menu.show li:nth-child(${indexToClick + 1}) a`) as HTMLElement;
        if (liNew) liNew.click();
      }
    }, { id: originalSelectId, val: valueToSelect });

    // Esperar a que el menú se cierre (indicador de que se seleccionó)
    await this.page.waitForTimeout(1000);
  }

  // ===========================================================================
  // 1. CREAR TRANSPORTISTA
  // ===========================================================================
  async createTransportista(nombre: string, rut: string): Promise<string> {
    logger.info(`🚀 UI: Creating Transportista [${nombre}] RUT: ${rut}...`);
    await this.page.goto(`${this.baseUrl}/transportistas/crear`);

    await this.page.fill('input[name="Transportistas[nombre]"]', nombre);
    await this.page.fill('input[name="Transportistas[razon_social]"]', nombre);
    await this.page.fill('input[name="Transportistas[documento]"]', rut);
    await this.page.fill('input[name="Transportistas[calle]"]', 'Av API Test');
    await this.page.fill('input[name="Transportistas[altura]"]', '123');

    // Aquí usamos selectOption normal porque estos dropdowns parecen nativos o no han dado problemas
    await this.page.selectOption('select[name="Transportistas[tipo_transportista_id]"]', '1');
    await this.page.waitForTimeout(500);
    await this.page.selectOption('select[name="Transportistas[region_id]"]', '1');
    await this.page.waitForTimeout(500);
    await this.page.selectOption('select[name="Transportistas[ciudad_id]"]', '1');
    await this.page.waitForTimeout(500);
    await this.page.selectOption('select[name="Transportistas[comuna_id]"]', '2');

    const saveButton = this.page.locator('button:has-text("Guardar"), input[type="submit"]').first();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      saveButton.click()
    ]);

    const currentUrl = this.page.url();
    const idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) return idMatch[1];

    if (currentUrl.includes('index')) {
      const searchInput = this.page.locator('#search');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(nombre);
      await this.page.click('#buscar');
      await this.page.waitForTimeout(2000);
      const editLink = this.page.locator('#tabla_transportistas tbody tr:first-child a[href*="editar"]');
      if (await editLink.count() > 0) {
        const href = await editLink.getAttribute('href');
        const id = href?.split('/').pop();
        if (id) return id!;
      }
    }
    throw new Error(`Transportista UI Creation Failed. URL: ${currentUrl}`);
  }

  // ===========================================================================
  // 2. HELPER CONTRATOS (MODO VISUAL / HUMAN)
  // ===========================================================================
  private async createContratoHeaderUI(
    nroContrato: string,
    tipo: 'venta' | 'costo',
    entityId: string
  ): Promise<string> {
    logger.info(`🚀 UI: Creating Contrato ${tipo.toUpperCase()} [${nroContrato}] via Form...`);

    await this.page.goto(`${this.baseUrl}/contrato/crear`);
    await this.page.fill('input[name="Contrato[nro_contrato]"]', nroContrato);

    // --- PASO 1: TIPO (Dropdown Simple) ---
    // Este suele ser un select normal o no problemático. Lo dejamos nativo.
    // Si falla, cámbialo a selectBootstrapDropdown.
    await this.page.selectOption('select[name="Contrato[tipo_tarifa_contrato_id]"]', '1');
    await this.page.waitForTimeout(1000);

    // --- PASO 2: MODALIDAD ---
    try {
      await this.page.selectOption('select[name="Contrato[modalidad_contrato]"]', '1');
      await this.page.waitForTimeout(1000);
    } catch (e) {
      logger.warn('Modalidad select skipped.');
    }

    // --- PASO 3: ENTIDAD (El Conflictivo) ---
    // Usamos los IDs del HTML que me diste: 'contrato-cliente_id'
    const entitySelectId = tipo === 'venta' ? 'contrato-cliente_id' : 'contrato-transportista_id';

    // Esperamos que el select oculto tenga datos (señal de que AJAX terminó)
    await this.page.waitForFunction((id) => {
      const el = document.getElementById(id) as HTMLSelectElement;
      return el && el.options.length > 1;
    }, entitySelectId, { timeout: 15000 });

    // Usamos el método visual para evitar el crash de JS
    await this.selectBootstrapDropdown(entitySelectId, entityId);

    logger.info('💤 Waiting 2s for Safety...');
    await this.page.waitForTimeout(2000); // Pausa de seguridad

    // --- PASO 4: GUARDAR ---
    logger.info('💾 Clicking Save Contrato...');
    const saveButton = this.page.locator('button:has-text("Guardar"), input[type="submit"]').first();

    try {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        saveButton.click()
      ]);
    } catch (e) {
      logger.error('❌ Save Timeout.');
      await this.page.screenshot({ path: 'error_contrato_save_timeout.png', fullPage: true });
      throw new Error('Contrato Save Failed (Timeout).');
    }

    const currentUrl = this.page.url();
    const idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
    if (idMatch) return idMatch[1];

    if (currentUrl.includes('index')) {
      const searchInput = this.page.locator('#search');
      if (await searchInput.isVisible()) {
        await searchInput.fill(nroContrato);
        await this.page.click('#buscar');
        await this.page.waitForTimeout(2000);
        const link = this.page.locator(`a[href*="/contrato/"][href*="editar"]`).first();
        if (await link.count() > 0) {
          const href = await link.getAttribute('href');
          const id = href?.split('/').pop();
          if (id) return id;
        }
      }
    }

    throw new Error(`Contrato UI Creation Failed. URL: ${currentUrl}`);
  }

  // --- 2A. CONTRATO CLIENTE (VENTA) ---
  async createContratoVenta(clienteId: string, nroContratoRef?: string): Promise<string> {
    const nroContrato = this.generateRandomContractId();
    const contratoId = await this.createContratoHeaderUI(nroContrato, 'venta', clienteId);

    const updateUrl = `${this.baseUrl}/contrato/editar/${contratoId}`;
    const csrfToken = await this.getCsrfToken(updateUrl);
    const today = this.getTodayDate();
    const rutaJson = JSON.stringify([{ "ruta": 715, "carga": [19], "fecha_tarifa": today, "extra_costo": [] }]);

    await this.page.request.post(updateUrl, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        '_csrf': csrfToken,
        'rutaCarga': rutaJson,
        'Contrato[nro_contrato]': nroContrato,
        'Contrato[estado]': '1',
        'Contrato[fecha_vencimiento]': today,
        'txt_tarifa_cliente_715': '150.000,00',
        'contrato_id': contratoId
      }
    });
    return contratoId;
  }

  // --- 2B. CONTRATO TRANSPORTISTA (COSTO) ---
  async createContratoCosto(transportistaId: string, nroContratoRef?: string): Promise<string> {
    const nroContrato = this.generateRandomContractId();
    const contratoId = await this.createContratoHeaderUI(nroContrato, 'costo', transportistaId);

    const updateUrl = `${this.baseUrl}/contrato/editar/${contratoId}`;
    const csrfToken = await this.getCsrfToken(updateUrl);
    const today = this.getTodayDate();
    const rutaJson = JSON.stringify([{ "ruta": 715, "carga": [19], "fecha_tarifa": today, "extra_costo": [] }]);

    await this.page.request.post(updateUrl, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        '_csrf': csrfToken,
        'rutaCarga': rutaJson,
        'Contrato[nro_contrato]': nroContrato,
        'Contrato[estado]': '1',
        'Contrato[fecha_vencimiento]': today,
        'txt_tarifa_cliente_715': '0,00',
        'txt_tarifa_conductor_715': '60.000',
        'contrato_id': contratoId
      }
    });
    return contratoId;
  }

  // ===========================================================================
  // 3. PLANIFICAR VIAJE
  // ===========================================================================
  async createViaje(clienteId: string, nroViaje: string): Promise<string> {
    const planificarUrl = `${this.baseUrl}/viajes/planificar`;
    const csrfToken = await this.getCsrfToken(planificarUrl);
    const response = await this.page.request.post(planificarUrl, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        '_csrf': csrfToken,
        'txt_tipo_operacion_id': '', 'txt_cantidad_paradas': '0',
        'Viajes[nro_viaje]': nroViaje,
        'tipo_operacion': '4', 'Viajes[tipo_servicio_id]': '18',
        'Viajes[cliente_id]': clienteId, 'Viajes[numero_planilla]': '',
        'Viajes[tipo_viaje_id]': '1', 'Viajes[unidad_negocio_id]': '1',
        'factor_multiplicador': '1', 'Viajes[valor_flete]': '',
        'Viajes[carga_id]': '3', 'Viajes[kg]': '10', 'Viajes[numero_contenedor]': '',
        '_OrigenDestinoForm[origen]': '81269', '_OrigenDestinoForm[fechaEntradaOrigen]': '10/02/2026 12:00',
        '_OrigenDestinoForm[fechaSalidaOrigen]': '10/02/2026 12:00', '_OrigenDestinoForm[kgOrigen]': '',
        '_OrigenDestinoForm[destino]': '83349', '_OrigenDestinoForm[fechaEntradaDestino]': '10/02/2026 12:00',
        '_OrigenDestinoForm[fechaSalidaDestino]': '10/02/2026 12:00', '_OrigenDestinoForm[kgDestino]': '',
        'txt_campo_opcional_1': '', 'txt_campo_opcional_2': ''
      }
    });
    if (!response.ok() || response.url().includes('planificar')) {
      fs.writeFileSync('error_viaje.html', await response.text());
      throw new Error(`Viaje API Validation Failed.`);
    }
    return nroViaje;
  }
}