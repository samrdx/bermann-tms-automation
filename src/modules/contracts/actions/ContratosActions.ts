import type { Page } from 'playwright';
import { ContratosFormPage } from '../pages/ContratosPage.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ContratosActions');

export interface ContratoData {
  nroContrato: string;
  tipo: string;
  transportista: string;
  valorHora: string;
}

export class ContratosActions {
  constructor(private contratosPage: ContratosFormPage) {}

  async navigateToCreateContract(): Promise<void> {
    await this.contratosPage.navigate();
  }

  async createContractRequiredFields(data: ContratoData): Promise<void> {
    logger.info(`Action: Creating contract ${data.nroContrato}`);
    
    await this.contratosPage.navigate();
    await this.contratosPage.fillNroContrato(data.nroContrato);
    await this.contratosPage.selectTipoContrato(data.tipo);
    await this.contratosPage.selectTransportista(data.transportista);
    await this.contratosPage.fillValorHora(data.valorHora);
    await this.contratosPage.clickGuardar();
  }

  /**
   * Completes the full contract flow including the 'outline success' steps
   * typically found after initial save.
   */
  async completeEditFlow(tarifaViaje: string, tarifaConductor: string): Promise<void> {
    logger.info('Action: Completing edit flow');
    
    // Wait for redirect to happen implicitly by checking URL or similar in the test/flow
    // But here we just execute the steps
    
    await this.contratosPage.clickOutlineSuccessButton();
    await this.contratosPage.clickPlus715Button();
    await this.contratosPage.clickCerrarModal();
    await this.contratosPage.clickAddCarga();
    await this.contratosPage.clickAddRuta();
    await this.contratosPage.clickCerrarModal();
    
    await this.contratosPage.fillTarifaViaje(tarifaViaje);
    await this.contratosPage.fillTarifaConductor(tarifaConductor);
    
    await this.contratosPage.clickGuardar();
  }

  async isEditPage(): Promise<boolean> {
    const url = await this.contratosPage.getCurrentUrl();
    return url.includes('/contrato/editar/');
  }

  async hasValidationErrors(): Promise<boolean> {
    return this.contratosPage.hasValidationErrors();
  }
}
