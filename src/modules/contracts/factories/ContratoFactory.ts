import type { Page } from 'playwright';
import { ContratosFormPage } from '../pages/ContratosPage.js';
import { createLogger } from '../../../utils/logger.js';
import { generateUniqueId } from '../../../utils/rutGenerator.js';
import { config } from '../../../config/environment.js';

const logger = createLogger('ContratoFactory');

export interface ContratoData {
  nroContrato: string;
  tipo: string;
  transportistaNombre: string;
  valorHora: string;
  fechaVencimiento?: string;
}

export class ContratoFactory {
  constructor(private page: Page) { }

  generateDefaultData(transportistaNombre: string): ContratoData {
    return {
      nroContrato: generateUniqueId(),
      tipo: 'Costo',
      transportistaNombre,
      valorHora: '25000',
      fechaVencimiento: '31/12/2025',
    };
  }

  async create(data?: Partial<ContratoData>): Promise<ContratoData> {
    if (!data?.transportistaNombre) {
      throw new Error('transportistaNombre is required for creating contrato');
    }

    const defaultData = this.generateDefaultData(data.transportistaNombre);
    const contratoData = { ...defaultData, ...data };

    const contratoPage = new ContratosFormPage(this.page);

    try {
      logger.info(`Creating contrato: ${contratoData.nroContrato} for ${contratoData.transportistaNombre}`);

      // Navigate to create page
      await contratoPage.navigateToCreate();
      await this.page.waitForTimeout(1000);

      // Use the existing fillBasicContractInfo method which handles:
      // - Filling nroContrato
      // - Selecting tipo = "Costo"
      // - Selecting transportista
      // - Saving and extracting contract ID
      const contractId = await contratoPage.fillBasicContractInfo(
        contratoData.nroContrato,
        contratoData.transportistaNombre
      );

      logger.info(`✅ Contrato created with ID: ${contractId}`);

      // Navigate to index to confirm
      await this.page.goto(`${config.get().baseUrl}/contrato/index`);
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Verified contrato: ${contratoData.nroContrato}`);
      return contratoData;

    } catch (error) {
      logger.error('Failed to create contrato', error);
      await this.page.screenshot({
        path: `./reports/screenshots/create-contrato-error-${Date.now()}.png`,
        fullPage: true
      });
      throw error;
    }
  }
}
