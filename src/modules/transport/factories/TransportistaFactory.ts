import type { Page } from 'playwright';
import { TransportistaFormPage } from '../pages/TransportistaPage.js';
import { createLogger } from '../../../utils/logger.js';
import {
  generateValidChileanRUT,
  generateStreetNumber,
  generateCompanyName,
} from '../../../utils/rutGenerator.js';

const logger = createLogger('TransportistaFactory');

export interface TransportistaData {
  nombre: string;
  razonSocial?: string;
  documento: string; // RUT
  calle?: string;
  altura?: string;
  otros?: string;
  formaPago?: string; // made optional
  tercerizar?: string; // made optional
}

export class TransportistaFactory {
  constructor(private page: Page) {}

  generateDefaultData(): TransportistaData {
    const companyName = generateCompanyName();
    return {
      nombre: companyName,
      razonSocial: `${companyName} SpA`,
      documento: generateValidChileanRUT(),
      calle: 'Av. Apoquindo',
      altura: generateStreetNumber(),
      otros: 'Las Condes, Santiago',
      formaPago: 'Contado',
      tercerizar: 'NO'
    };
  }

  async create(data?: Partial<TransportistaData>): Promise<TransportistaData> {
    const transportistaData = { ...this.generateDefaultData(), ...data };
    const transportistaPage = new TransportistaFormPage(this.page);

    try {
      logger.info(`Creando transportista: ${transportistaData.nombre}`);
      await transportistaPage.navigate();
      await this.page.waitForTimeout(1000);

      // MANDATORY FIELDS
      await transportistaPage.fillNombre(transportistaData.nombre);
      await transportistaPage.fillDocumento(transportistaData.documento);

      if (transportistaData.razonSocial) {
        await transportistaPage.fillRazonSocial(transportistaData.razonSocial);
      }

      // REQUIRED: Select Tipo Transportista (HARDCODED for now as in original)
      // Ideally this should be data driven too
      await transportistaPage.selectTipoTransportista('Propio Con Flota No Genera Contrato');
      await this.page.waitForTimeout(500);

      // OPTIONAL FIELDS
      if (transportistaData.calle) await transportistaPage.fillCalle(transportistaData.calle);
      if (transportistaData.altura) await transportistaPage.fillAltura(transportistaData.altura);
      if (transportistaData.otros) await transportistaPage.fillOtros(transportistaData.otros);

      // Optional dropdowns with try/catch fallback (as in original)
      if (transportistaData.formaPago) {
        try {
          await transportistaPage.selectFormaPago(transportistaData.formaPago);
          await this.page.waitForTimeout(300);
        } catch (error) {
          logger.warn('El campo de forma de pago no está disponible o ya está configurado');
        }
      }

      if (transportistaData.tercerizar) {
        try {
          await transportistaPage.selectTercerizar(transportistaData.tercerizar);
          await this.page.waitForTimeout(300);
        } catch (error) {
          logger.warn('El campo de tercerizar no está disponible o ya está configurado');
        }
      }

      await transportistaPage.clickGuardar();
      await this.page.waitForTimeout(3000);

      // Navigate to index to confirm and cache
      // Use config if possible, but for now hardcoded URL from original
      await this.page.goto('https://moveontruckqa.bermanntms.cl/transportistas/index');
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Transportista creado: ${transportistaData.nombre}`);
      
      // Wait for cache refresh
      logger.info('⏳ Esperando 5 segundos para la actualización de la caché...');
      await this.page.waitForTimeout(5000);

      return transportistaData;

    } catch (error) {
      logger.error('Fallo al crear transportista', error);
      await this.page.screenshot({ 
        path: `./reports/screenshots/create-transportista-error-${Date.now()}.png`, 
        fullPage: true 
      });
      throw error;
    }
  }
}
