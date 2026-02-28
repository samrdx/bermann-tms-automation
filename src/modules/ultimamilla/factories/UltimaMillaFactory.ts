import type { Page } from 'playwright';
import { UltimaMillaFormPage } from '../pages/UltimaMillaPage.js';
import { createLogger } from '../../../utils/logger.js';
import {
  generateRandomName,
  generateRandomLastName,
  generatePhone,
  generateEmail,
  generateFullChileanAddress,
} from '../../../utils/rutGenerator.js';

const logger = createLogger('UltimaMillaFactory');

export interface UltimaMillaOrderData {
  codigoPedido: string; // 6 dígitos
  nombreCliente: string;
  correo: string;
  telefono: string; // 8 dígitos
  fechaEntrega?: string;
  direccionBusqueda: string;
  clienteDropdown?: string;
  peso: string;
  dimensiones?: {
    ancho: string; // max 5 digits
    largo: string; // max 5 digits
    alto: string; // max 5 digits
  };
}

export class UltimaMillaFactory {
  constructor(private page: Page) { }

  generateDefaultData(): UltimaMillaOrderData {
    // Generate a random 6-digit order code
    const codigoPedido = Math.floor(100000 + Math.random() * 900000).toString();
    const nombre = generateRandomName();
    const apellido = generateRandomLastName();
    // generatePhone returns +569XXXXXXXX, but we need 8 digits (the XXXXXXXX part) for some specific fields if requested, 
    // but the prompt says "Teléfono de 8 dígitos". So we'll grab the last 8 digits of a timestamp or random number
    const telefono8Digitos = Math.floor(10000000 + Math.random() * 90000000).toString();

    return {
      codigoPedido,
      nombreCliente: `${nombre} ${apellido}`,
      correo: generateEmail(`${nombre}${apellido}`),
      telefono: telefono8Digitos,
      fechaEntrega: '31-12-2026',
      direccionBusqueda: generateFullChileanAddress(),
      peso: '150',
      dimensiones: {
        ancho: '10',
        largo: '20',
        alto: '15'
      }
    };
  }

  async create(data?: Partial<UltimaMillaOrderData>): Promise<UltimaMillaOrderData> {
    const orderData = { ...this.generateDefaultData(), ...data };
    const orderPage = new UltimaMillaFormPage(this.page);

    try {
      logger.info(`Creating Ultima Milla order: ${orderData.codigoPedido}`);
      await orderPage.navigate();
      await this.page.waitForTimeout(1000);

      await orderPage.fillCompleteForm(orderData);
      await orderPage.clickGuardar();
      await this.page.waitForTimeout(3000);

      // Verify the form is saved
      const isSaved = await orderPage.isFormSaved();
      if (!isSaved) {
        throw new Error('Form was not saved successfully (URL did not stay or toast missing)');
      }

      logger.info(`✅ Ultima Milla Order created: ${orderData.codigoPedido}`);
      return orderData;

    } catch (error) {
      logger.error('Failed to create Ultima Milla order', error);
      await this.page.screenshot({
        path: `./reports/screenshots/create-ultimamilla-error-${Date.now()}.png`,
        fullPage: true
      });
      throw error;
    }
  }
}
