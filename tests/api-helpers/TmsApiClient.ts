import { Page } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import { TransportistaData } from '../../src/modules/transport/factories/TransportistaFactory.js';
import { ClienteData } from '../../src/modules/commercial/factories/ClienteFactory.js';

/**
 * TmsApiClient - TRUE API Automation (HTTP requests, no UI)
 *
 * This class makes direct HTTP calls to TMS REST endpoints,
 * bypassing the UI entirely for faster test setup.
 *
 * Performance:
 * - UI Automation: ~15s per entity (TransportistaHelper)
 * - API Automation: ~1s per entity (TmsApiClient)
 *
 * Usage:
 * ```typescript
 * const apiClient = new TmsApiClient(page);
 * const transportistaId = await apiClient.createTransportista(data);
 * ```
 */
export class TmsApiClient {
  private baseUrl: string;
  private cookies: Map<string, string>;

  constructor(private page: Page) {
    this.baseUrl = 'https://moveontruckqa.bermanntms.cl';
    this.cookies = new Map();
  }

  /**
   * Initialize API client by extracting session cookies from authenticated page
   *
   * IMPORTANT: Call this AFTER login (page must have valid session)
   */
  async initialize(): Promise<void> {
    const cookies = await this.page.context().cookies();

    for (const cookie of cookies) {
      this.cookies.set(cookie.name, cookie.value);
    }

    logger.info(`✅ TmsApiClient initialized with ${cookies.length} cookies`);
  }

  /**
   * Create Transportista via direct API call (bypasses UI)
   *
   * TODO: Implement this by capturing real endpoint from Chrome DevTools
   *
   * Steps to implement:
   * 1. Open https://moveontruckqa.bermanntms.cl/transportistas/crear
   * 2. Fill form manually and click "Guardar"
   * 3. In Chrome DevTools → Network tab → Find POST request
   * 4. Right-click → Copy → Copy as fetch (Node.js)
   * 5. Paste here and adapt to TypeScript
   *
   * @param data Transportista data from factory
   * @returns Created transportista ID
   */
  async createTransportista(data: TransportistaData): Promise<string> {
    logger.info(`🚀 API: Creating Transportista [${data.nombre}]...`);

    // TODO: Replace with actual endpoint
    // Example structure (to be verified):
    /*
    const response = await this.page.request.post(`${this.baseUrl}/transportistas/crear`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.getCookieHeader()
      },
      form: {
        'Transportista[nombre]': data.nombre,
        'Transportista[rut]': data.documento,
        'Transportista[razon_social]': data.razonSocial,
        'Transportista[tipo_id]': data.tipo === 'Terceros Con Flota Si Genera Contrato' ? 3 : 1,
        'Transportista[forma_pago_id]': data.formaPago === 'Contado' ? 1 : 2,
        'Transportista[direccion][calle]': data.calle,
        'Transportista[direccion][altura]': data.altura,
        // ... other fields
      }
    });

    const responseData = await response.json();
    const transportistaId = responseData.id || responseData.transportistaId;

    logger.info(`✅ API: Transportista created with ID: ${transportistaId}`);
    return transportistaId;
    */

    throw new Error('TmsApiClient.createTransportista() not yet implemented. See TODO comments.');
  }

  /**
   * Create Cliente via direct API call
   *
   * TODO: Implement using same approach as createTransportista()
   */
  async createCliente(data: ClienteData): Promise<string> {
    logger.info(`🚀 API: Creating Cliente [${data.nombre}]...`);

    // TODO: Implement
    throw new Error('TmsApiClient.createCliente() not yet implemented.');
  }

  /**
   * Create Vehiculo via direct API call
   *
   * TODO: Implement
   */
  async createVehiculo(data: any): Promise<string> {
    logger.info(`🚀 API: Creating Vehiculo [${data.patente}]...`);

    // TODO: Implement
    throw new Error('TmsApiClient.createVehiculo() not yet implemented.');
  }

  /**
   * Create Conductor via direct API call
   *
   * TODO: Implement
   */
  async createConductor(data: any): Promise<string> {
    logger.info(`🚀 API: Creating Conductor [${data.nombre} ${data.apellido}]...`);

    // TODO: Implement
    throw new Error('TmsApiClient.createConductor() not yet implemented.');
  }

  /**
   * Helper: Convert cookies Map to Cookie header string
   */
  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Helper: Make authenticated POST request
   */
  private async post(endpoint: string, body: any): Promise<any> {
    const response = await this.page.request.post(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.getCookieHeader(),
        'X-Requested-With': 'XMLHttpRequest', // May be required for AJAX endpoints
      },
      form: body
    });

    if (!response.ok()) {
      throw new Error(`API request failed: ${response.status()} ${response.statusText()}`);
    }

    return await response.json();
  }

  /**
   * Helper: Make authenticated GET request
   */
  private async get(endpoint: string): Promise<any> {
    const response = await this.page.request.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
      }
    });

    if (!response.ok()) {
      throw new Error(`API request failed: ${response.status()} ${response.statusText()}`);
    }

    return await response.json();
  }
}
