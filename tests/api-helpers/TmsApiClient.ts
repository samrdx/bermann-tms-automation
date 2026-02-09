import { Page, APIRequestContext, expect } from '@playwright/test';
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

  private async getCsrfToken(url: string): Promise<string> {
    const response = await this.page.request.get(url);
    const html = await response.text();
    const matchMeta = html.match(/<meta name="csrf-token" content="(.*?)">/);
    if (matchMeta) return matchMeta[1];
    const matchInput = html.match(/name="_csrf" value="(.*?)"/);
    if (matchInput) return matchInput[1];
    throw new Error(`Could not extract CSRF token from ${url}`);
  }

  private getTodayDate(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private getDateTime(): string {
    const d = new Date();
    const date = this.getTodayDate();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${date} ${time}`;
  }

  // ===========================================================================
  // 1. CREAR TRANSPORTISTA (CLONACIÓN USUARIO REAL)
  // ===========================================================================
  async createTransportista(nombre: string, rut: string): Promise<string> {
    logger.info(`🚀 API: Creating Transportista [${nombre}] RUT: ${rut}...`);
    const createUrl = `${this.baseUrl}/transportistas/crear`;
    const csrfToken = await this.getCsrfToken(createUrl);

    // ESTRATEGIA: Payload minimalista (Sin archivo adjunto si no es estricto)
    // Si falla por falta de archivo, descomentar la sección de abajo.
    const multipartPayload: any = { 
        '_csrf': csrfToken,
        'Transportistas[nombre]': nombre,
        'Transportistas[razon_social]': nombre,
        'Transportistas[documento]': rut,
        'Transportistas[tipo_transportista_id]': '1', 
        'Transportistas[region_id]': '1',
        'Transportistas[ciudad_id]': '1',
        'Transportistas[comuna_id]': '2', 
        'Transportistas[calle]': 'Av API Test',
        'Transportistas[altura]': '123',
        'Transportistas[terceariza]': '0',
        'Transportistas[otros]': '', // Cadena vacía explícita
        'Transportistas[forma_pago]': '',
        'Transportistas[forma_pago_detalle]': ''
    };

    // OPCIONAL: Si el sistema EXIGE archivo, usa esto. Si no, mejor omitirlo para evitar validaciones de tipo.
    // multipartPayload['arrayResourceDocument'] = { 
    //     name: 'dummy.txt', 
    //     mimeType: 'text/plain', 
    //     buffer: Buffer.from('Contenido') 
    // };

    const response = await this.page.request.post(createUrl, {
      maxRedirects: 0, 
      multipart: multipartPayload
    });

    if (response.status() === 302) {
        const location = response.headers()['location'];
        logger.info(`📍 Server redirected to: ${location}`);
        
        // Si hay ID en la URL, genial
        const idMatch = location.match(/\/(?:ver|view|editar|update)\/(\d+)/);
        if (idMatch) {
            logger.info(`✅ API: Transportista Created (ID from Header: ${idMatch[1]})`);
            return idMatch[1];
        }
    } else {
        // Si no es 302, imprimimos el HTML de error para ver qué dice el validador
        const html = await response.text();
        fs.writeFileSync('error_create_validation.html', html); // <--- REVISA ESTE ARCHIVO SI FALLA
        throw new Error(`Create Failed: Status ${response.status()}. Check error_create_validation.html`);
    }

    // PASO 2: RECUPERACIÓN VÍA UI (LA MÁS SEGURA AHORA MISMO)
    logger.info(`🔎 Fallback: Switching to UI to find ID for "${nombre}"...`);
    
    await this.page.goto(`${this.baseUrl}/transportistas/index`);
    
    // Esperamos input search
    const searchInput = this.page.locator('#search');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(nombre);
    
    // Interceptamos la respuesta de la búsqueda para depurar
    const searchResponsePromise = this.page.waitForResponse(resp => 
        resp.url().includes('/buscartransportistas') && resp.status() === 200
    );
    
    await this.page.click('#buscar');
    const searchResp = await searchResponsePromise;
    const searchData = await searchResp.json();
    
    // Debug: Ver qué devolvió realmente el servidor al frontend
    logger.info(`🔍 UI Search API Response: ${JSON.stringify(searchData)}`);

    // Intentamos leer de la grilla visualmente
    await this.page.waitForTimeout(1000);
    const editLink = this.page.locator('#tabla_transportistas tbody tr:first-child a[href*="editar"]');
    
    if (await editLink.count() > 0) {
        const href = await editLink.getAttribute('href');
        if (href) {
            const id = href.split('/').pop();
            logger.info(`✅ UI: Transportista ID recovered: ${id}`);
            return id!;
        }
    }

    throw new Error(`Transportista "${nombre}" NOT found. The record was NOT saved in DB despite 302 redirect.`);
  }

  // ===========================================================================
  // 2. HELPER CONTRATOS
  // ===========================================================================
  private async createContratoHeader(
    nroContrato: string, 
    tipo: 'venta' | 'costo', 
    entityId: string, 
    csrfToken: string,
    today: string
  ): Promise<string> {
      const formData: any = {
        '_csrf': csrfToken,
        'rutas[]': ' ', 'cargas[]': ' ', 'servicio[]': ' ', 'documento[]': ' ',
        'txt_totalPropiedades': ' ', 'extra_costos': ' ', 'txt_totalServicios': ' ',
        'rutaCarga': '[]',
        'Contrato[nro_contrato]': nroContrato,
        'Contrato[tipo_tarifa_contrato_id]': '1', 
        'Contrato[fecha_vencimiento]': today,
        'Contrato[valor_hora]': ' ',
        'Contrato[modalidad_contrato]': '1',
        'Contrato[paradas_intermedias]': ' ',
        'Contrato[valor_toque]': '0,00',
        'tabla_rutas_nuevas_length': '100',
        'contrato_ruta_id': ' ',
        'contrato_id': ' ',
        'adjuntos[]': { name: 'dummy.txt', mimeType: 'text/plain', buffer: Buffer.from(' ') }
      };

      if (tipo === 'venta') {
          formData['Contrato[cliente_id]'] = entityId;
          formData['Contrato[transportista_id]'] = ' ';
          formData['transportistaTerceroId'] = ' ';
      } else {
          formData['Contrato[transportista_id]'] = entityId;
          formData['transportistaTerceroId'] = ' '; 
          formData['Contrato[cliente_id]'] = ' ';
      }

      const response = await this.page.request.post(`${this.baseUrl}/contrato/crear`, {
          multipart: formData,
          maxRedirects: 0
      });
      
      if (response.status() === 302) {
          const location = response.headers()['location'];
          const idMatch = location.match(/\/(?:view|ver|update|editar)\/(\d+)/);
          if (idMatch) return idMatch[1];
      }

      const html = await response.text();
      fs.writeFileSync(`error_contrato_${tipo}.html`, html);
      throw new Error(`Contract ${tipo} creation failed. Status: ${response.status()}. See error_contrato_${tipo}.html`);
  }

  // --- 2A. CONTRATO CLIENTE (VENTA) ---
  async createContratoVenta(clienteId: string, nroContrato: string): Promise<string> {
    logger.info(`🚀 API: Creating Contrato VENTA [${nroContrato}]...`);
    const csrfToken = await this.getCsrfToken(`${this.baseUrl}/contrato/crear`);
    const today = this.getTodayDate();
    const contratoId = await this.createContratoHeader(nroContrato, 'venta', clienteId, csrfToken, today);

    const updateUrl = `${this.baseUrl}/contrato/editar/${contratoId}`;
    const csrfToken2 = await this.getCsrfToken(updateUrl);
    const rutaJson = JSON.stringify([{ "ruta": 715, "carga": [19], "fecha_tarifa": today, "extra_costo": [] }]);

    await this.page.request.post(updateUrl, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        form: {
            '_csrf': csrfToken2,
            'rutaCarga': rutaJson,
            'Contrato[nro_contrato]': nroContrato,
            'Contrato[estado]': '1',
            'Contrato[fecha_vencimiento]': today,
            'txt_tarifa_cliente_715': '150.000,00', 
            'contrato_id': contratoId
        }
    });

    logger.info(`✅ API: Contrato VENTA Created (ID: ${contratoId})`);
    return contratoId;
  }

  // --- 2B. CONTRATO TRANSPORTISTA (COSTO) ---
  async createContratoCosto(transportistaId: string, nroContrato: string): Promise<string> {
    logger.info(`🚀 API: Creating Contrato COSTO [${nroContrato}]...`);
    const csrfToken = await this.getCsrfToken(`${this.baseUrl}/contrato/crear`);
    const today = this.getTodayDate();
    const contratoId = await this.createContratoHeader(nroContrato, 'costo', transportistaId, csrfToken, today);

    const updateUrl = `${this.baseUrl}/contrato/editar/${contratoId}`;
    const csrfToken2 = await this.getCsrfToken(updateUrl);
    const rutaJson = JSON.stringify([{ "ruta": 715, "carga": [19], "fecha_tarifa": today, "extra_costo": [] }]);

    await this.page.request.post(updateUrl, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        form: {
            '_csrf': csrfToken2,
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
      logger.info(`🚀 API: Planning Viaje [${nroViaje}]...`);
      const planificarUrl = `${this.baseUrl}/viajes/planificar`;
      const csrfToken = await this.getCsrfToken(planificarUrl);
      const dateTime = this.getDateTime();

      const response = await this.page.request.post(planificarUrl, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          form: {
              '_csrf': csrfToken,
              'txt_tipo_operacion_id': ' ', 'txt_cantidad_paradas': '0',
              'Viajes[nro_viaje]': nroViaje,
              'tipo_operacion': '4',
              'Viajes[tipo_servicio_id]': '18',
              'Viajes[cliente_id]': clienteId,
              'Viajes[numero_planilla]': ' ',
              'Viajes[tipo_viaje_id]': '1',
              'Viajes[unidad_negocio_id]': '1',
              'factor_multiplicador': '1',
              'Viajes[valor_flete]': ' ',
              'Viajes[carga_id]': '3', 
              'Viajes[kg]': '10',
              'Viajes[numero_contenedor]': ' ',
              '_OrigenDestinoForm[origen]': '81269',
              '_OrigenDestinoForm[fechaEntradaOrigen]': dateTime,
              '_OrigenDestinoForm[fechaSalidaOrigen]': dateTime,
              '_OrigenDestinoForm[kgOrigen]': ' ',
              '_OrigenDestinoForm[destino]': '83349',
              '_OrigenDestinoForm[fechaEntradaDestino]': dateTime,
              '_OrigenDestinoForm[fechaSalidaDestino]': dateTime,
              '_OrigenDestinoForm[kgDestino]': ' ',
              'txt_campo_opcional_1': ' ', 'txt_campo_opcional_2': ' '
          }
      });

      if (!response.ok() || response.url().includes('planificar')) {
          const html = await response.text();
          fs.writeFileSync('error_viaje.html', html);
          throw new Error(`Viaje API Validation Failed. See error_viaje.html`);
      }

      logger.info(`✅ API: Viaje ${nroViaje} Created Successfully`);
      return nroViaje;
  }
}