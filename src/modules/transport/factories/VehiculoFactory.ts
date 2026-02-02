import type { Page } from 'playwright';
import { VehiculoFormPage } from '../pages/VehiculoPage.js';
import { createLogger } from '../../../utils/logger.js';
import { generatePatente } from '../../../utils/rutGenerator.js';

const logger = createLogger('VehiculoFactory');

export interface VehiculoData {
  patente: string;
  transportistaNombre: string;
  tipoVehiculo?: string;
  capacidad?: string;
}

export class VehiculoFactory {
  constructor(private page: Page) {}

  generateDefaultData(transportistaNombre: string = 'Transportepadre'): VehiculoData {
    return {
      patente: generatePatente(),
      transportistaNombre,
      tipoVehiculo: 'TRACTO',
      capacidad: '3kg'
    };
  }

  async create(data?: Partial<VehiculoData>): Promise<VehiculoData> {
    const defaultData = this.generateDefaultData(data?.transportistaNombre);
    const vehiculoData = { ...defaultData, ...data };
    
    const vehiculoPage = new VehiculoFormPage(this.page);

    try {
      logger.info(`Creating vehículo: ${vehiculoData.patente} for ${vehiculoData.transportistaNombre}`);
      await vehiculoPage.navigate();
      await this.page.waitForTimeout(1000);

      // CRITICAL: Select transportista first (cascading dropdown)
      await vehiculoPage.selectTransportista(vehiculoData.transportistaNombre);
      await this.page.waitForTimeout(1500); // Wait for cascade

      // MANDATORY FIELDS
      await vehiculoPage.fillPatente(vehiculoData.patente);
      
      // REQUIRED: Fill Muestra (MUST be EXACT SAME as Patente)
      await vehiculoPage.fillMuestra(vehiculoData.patente);
      await this.page.waitForTimeout(300);

      // REQUIRED: Select Tipo Vehiculo
      if (vehiculoData.tipoVehiculo) {
        await vehiculoPage.selectTipoVehiculo(vehiculoData.tipoVehiculo);
        await this.page.waitForTimeout(500);
      }

      // REQUIRED: Select Capacidad
      if (vehiculoData.capacidad) {
        try {
          await vehiculoPage.selectCapacidad(vehiculoData.capacidad);
          await this.page.waitForTimeout(300);
        } catch (error) {
          logger.warn('Capacidad field not available or already set');
        }
      }

      await vehiculoPage.clickGuardar();
      await this.page.waitForTimeout(3000);

      // Navigate to index to confirm
      await this.page.goto('https://moveontruckqa.bermanntms.cl/vehiculos/index');
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Vehículo created: ${vehiculoData.patente}`);
      return vehiculoData;

    } catch (error) {
      logger.error('Failed to create vehículo', error);
      await this.page.screenshot({ 
        path: `./reports/screenshots/create-vehiculo-error-${Date.now()}.png`,
        fullPage: true 
      });
      throw error;
    }
  }
}
