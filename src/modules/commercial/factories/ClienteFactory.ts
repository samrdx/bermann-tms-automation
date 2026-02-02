import type { Page } from 'playwright';
import { ClienteFormPage } from '../pages/ClientePage.js';
import { createLogger } from '../../../utils/logger.js';
import {
  generateValidChileanRUT,
  generateStreetNumber,
  generateApartmentNumber,
  generateCompanyName,
} from '../../../utils/rutGenerator.js';

const logger = createLogger('ClienteFactory');

export interface ClienteData {
  nombre: string; // Razón social
  rut: string;
  nombreFantasia?: string;
  calle?: string;
  altura?: string;
  otros?: string;
}

export class ClienteFactory {
  constructor(private page: Page) {}

  generateDefaultData(): ClienteData {
    const companyName = generateCompanyName();
    return {
      nombre: `${companyName} Ltda`,
      rut: generateValidChileanRUT(),
      nombreFantasia: companyName,
      calle: 'Av. Providencia',
      altura: generateStreetNumber(),
      otros: 'Providencia, Santiago',
    };
  }

  async create(data?: Partial<ClienteData>): Promise<ClienteData> {
    const clienteData = { ...this.generateDefaultData(), ...data };
    const clientePage = new ClienteFormPage(this.page);

    try {
      logger.info(`Creating cliente: ${clienteData.nombre}`);
      await clientePage.navigate();
      await this.page.waitForTimeout(1000);

      await clientePage.fillNombre(clienteData.nombre);
      await clientePage.fillRut(clienteData.rut);

      if (clienteData.nombreFantasia) await clientePage.fillNombreFantasia(clienteData.nombreFantasia);
      if (clienteData.calle) await clientePage.fillCalle(clienteData.calle);
      if (clienteData.altura) await clientePage.fillAltura(clienteData.altura);
      if (clienteData.otros) await clientePage.fillOtros(clienteData.otros);

      await clientePage.clickGuardar();
      await this.page.waitForTimeout(3000);

      // Navigate to index to confirm
      await this.page.goto('https://moveontruckqa.bermanntms.cl/clientes/index');
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Cliente created: ${clienteData.nombre}`);
      return clienteData;

    } catch (error) {
      logger.error('Failed to create cliente', error);
      await this.page.screenshot({ 
        path: `./reports/screenshots/create-cliente-error-${Date.now()}.png`,
        fullPage: true 
      });
      throw error;
    }
  }
}
