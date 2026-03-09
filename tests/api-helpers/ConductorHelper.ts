import { Page, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import {
    generateValidChileanRUT,
    generateRandomName,
    generateRandomLastName,
    generateChileanStreet,
    generateStreetNumber,
    generatePhone,
    generateEmail,
    generateGenericUser,
    generatePassword,
    generateDocument,
    generateLicenseType
} from '../../src/utils/rutGenerator.js';
import { ConductorFormPage } from '../../src/modules/transport/pages/ConductorPage.js';
import { config } from '../../src/config/environment.js';
import { NamingHelper } from '../../src/utils/NamingHelper.js';

export interface Conductor {
    nombre: string;
    apellido: string;
    rut: string;
    telefono: string;
    email: string;
    transportistaName: string;
}

export class ConductorHelper {

    /**
     * Creates a Conductor via UI Interactions using the Page Object.
     * 
     * @param page Playwright Page object
     * @param transportistaName The exact name of the Transportista to link this Conductor to.
     */
    /**
     * Creates a Conductor via UI Interactions using the Page Object.
     * 
     * @param page Playwright Page object
     * @param transportistaName The exact name of the Transportista to link this Conductor to.
     */
    static async createConductorViaUI(
        page: Page,
        transportistaName: string
    ): Promise<Conductor> {
        const conductorPage = new ConductorFormPage(page);
        
        // Data Generation
        const nombresReales = { nombre: generateRandomName(), apellido: generateRandomLastName() };
        const { nombre, apellido } = NamingHelper.getConductorNames(nombresReales);
        
        const cleanName = nombresReales.nombre.toLowerCase().replace(/\s+/g, '').substring(0, 5);
        const cleanLast = nombresReales.apellido.toLowerCase().replace(/\s+/g, '').substring(0, 5);
        const randNum = Math.floor(Math.random() * 90 + 10);
        const usuario = `qa${cleanName}${cleanLast}${randNum}`.substring(0, 15);
        
        const clave = generatePassword();
        
        // Decide Document Type (mostly RUT for now as per consistency, but helper allows expansion)
        const rut = generateDocument('RUT'); 
        
        const telefono = generatePhone();
        const email = generateEmail(nombresReales.nombre + nombresReales.apellido);
        const licencia = generateLicenseType();
        
        // Vencimiento defaults to 31-12-2026 as per plan
        const vencimiento = '2026-12-31';

        logger.info(`🌱 Sembrado UI Conductor: [${nombre} ${apellido}] RUT: ${rut} vinculado a: ${transportistaName}`);

        // 1. Navigate
        await conductorPage.navigate();
        
        // 2. Fill Form
        await conductorPage.fillUsuario(usuario);
        await conductorPage.fillClave(clave);
        await conductorPage.fillNombre(nombre);
        await conductorPage.fillApellido(apellido);
        await conductorPage.fillDocumento(rut);
        await conductorPage.fillTelefono(telefono);
        await conductorPage.fillEmail(email);
        
        // Optional Fields
        await conductorPage.selectLicencia(licencia);
        await conductorPage.setVencimientoLicencia(vencimiento);

        // 3. Link Transportista (Critical: Name based selection)
        // Using Page Object method for robustness
        await conductorPage.selectTransportista(transportistaName);
        
        // 4. Save
        await conductorPage.clickGuardar();
        
        // Verify success via URL redirection or success message
        await page.waitForTimeout(2000);
        if (!await conductorPage.isFormSaved()) {
             logger.warn('⚠️ Es posible que el guardado del conductor haya fallado o la redirección sea lenta.');
        } else {
             logger.info('✅ Conductor creado exitosamente');
        }

        return {
            nombre,
            apellido,
            rut,
            telefono,
            email,
            transportistaName
        };
    }
}
