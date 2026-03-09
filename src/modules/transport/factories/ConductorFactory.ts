import type { Page } from 'playwright';
import { ConductorFormPage } from '../pages/ConductorPage.js';
import { createLogger } from '../../../utils/logger.js';
import {
  generateRandomName,
  generateRandomLastName,
  generateUsername,
  generatePassword,
  generateValidChileanRUT,
  generatePhone,
  generateEmail,
} from '../../../utils/rutGenerator.js';

const logger = createLogger('ConductorFactory');

export interface ConductorData {
  usuario: string;
  clave: string;
  nombre: string;
  apellido: string;
  documento: string; // RUT
  telefono?: string;
  email?: string;
  transportistaNombre: string;
  licencia?: string;
  vencimientoLicencia?: string;
}

export class ConductorFactory {
  constructor(private page: Page) {}

  generateDefaultData(transportistaNombre: string = 'Transportepadre'): ConductorData {
    const nombre = generateRandomName();
    const apellido = generateRandomLastName();
    return {
      usuario: generateUsername(),
      clave: generatePassword(),
      nombre,
      apellido,
      documento: generateValidChileanRUT(),
      telefono: generatePhone(),
      email: generateEmail(`${nombre}${apellido}`),
      transportistaNombre,
      licencia: 'A1',
      vencimientoLicencia: '31-12-2026'
    };
  }

  async create(data?: Partial<ConductorData>): Promise<ConductorData> {
    const defaultData = this.generateDefaultData(data?.transportistaNombre);
    const conductorData = { ...defaultData, ...data };
    
    const conductorPage = new ConductorFormPage(this.page);

    try {
      logger.info(`Creando conductor: ${conductorData.nombre} ${conductorData.apellido}`);
      await conductorPage.navigate();
      await this.page.waitForTimeout(1000);

      // CRITICAL: Select transportista first
      await conductorPage.selectTransportista(conductorData.transportistaNombre);
      await this.page.waitForTimeout(1500);

      // MANDATORY FIELDS
      await conductorPage.fillUsuario(conductorData.usuario);
      await conductorPage.fillClave(conductorData.clave);
      await conductorPage.fillNombre(conductorData.nombre);
      await conductorPage.fillApellido(conductorData.apellido);
      await conductorPage.fillDocumento(conductorData.documento);

      if (conductorData.telefono) await conductorPage.fillTelefono(conductorData.telefono);
      if (conductorData.email) await conductorPage.fillEmail(conductorData.email);

      // OPTIONAL / AUTO-FILLED
      if (conductorData.licencia) {
        try {
          await conductorPage.selectLicencia(conductorData.licencia);
          await this.page.waitForTimeout(300);
        } catch (error) {
          logger.warn('El campo de licencia no está disponible');
        }
      }

      if (conductorData.vencimientoLicencia) {
        try {
          await conductorPage.setVencimientoLicencia(conductorData.vencimientoLicencia);
          await this.page.waitForTimeout(300);
        } catch (error) {
          logger.warn('El campo de vencimiento de licencia no está disponible');
        }
      }

      await conductorPage.clickGuardar();
      await this.page.waitForTimeout(3000);

      // Navigate to index to confirm
      await this.page.goto('https://moveontruckqa.bermanntms.cl/conductores/index');
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Conductor creado: ${conductorData.usuario}`);
      return conductorData;

    } catch (error) {
      logger.error('Fallo al crear conductor', error);
      await this.page.screenshot({ 
        path: `./reports/screenshots/create-conductor-error-${Date.now()}.png`,
        fullPage: true 
      });
      throw error;
    }
  }
}
