import { Page } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import { generatePatente } from '../../src/utils/rutGenerator.js';
import { VehiculoFormPage } from '../../src/modules/transport/pages/VehiculoPage.js';
import { NamingHelper } from '../../src/utils/NamingHelper.js';

export interface Vehiculo {
    patente: string;
    muestra: string;
    transportistaName: string;
}

export class VehiculoHelper {

    /**
     * Creates a Vehiculo via UI Interactions using the Page Object.
     * 
     * @param page Playwright Page object
     * @param transportistaName The exact name of the Transportista to link this Vehiculo to
     */
    static async createVehiculoViaUI(
        page: Page,
        transportistaName: string
    ): Promise<Vehiculo> {
        const vehiculoPage = new VehiculoFormPage(page);

        // Data Generation
        const rawPatente = generatePatente();
        const patente = NamingHelper.getVehiculoPatente(rawPatente);
        const muestra = patente; // Usa la misma patente estandarizada como muestra

        logger.info(`🌱 Sembrado UI Vehículo: Patente [${patente}] para Transportista: ${transportistaName}`);

        // 1. Navigate
        await vehiculoPage.navigate();

        // 2. Fill Form
        await vehiculoPage.fillPatente(patente);
        await vehiculoPage.fillMuestra(muestra);

        // 3. Select Transportista (Critical: Name based selection)
        await vehiculoPage.selectTransportista(transportistaName);

        // 4. Select Vehicle Type and Configuration
        // Using RAMPLA as a standard type for integration tests
        await vehiculoPage.selectTipoVehiculo('RAMPLA');

        // Wait for cascading dropdown
        await page.waitForTimeout(1500);

        // Select Tipo Rampla (conditional field)
        await vehiculoPage.selectTipoRampla('Plana');

        // 5. Select Capacity
        // Using '1 a 12 TON' as requested for the new QA standards
        await vehiculoPage.selectCapacidad('1 a 12 TON');

        // 6. Save
        await vehiculoPage.clickGuardar();

        // Verify success via URL redirection
        await page.waitForTimeout(2000);
        if (!await vehiculoPage.isFormSaved()) {
            logger.warn('⚠️ Es posible que el guardado del vehículo haya fallado o la redirección sea lenta.');
        } else {
            logger.info('✅ Vehículo creado exitosamente');
        }

        return {
            patente,
            muestra,
            transportistaName
        };
    }
}
