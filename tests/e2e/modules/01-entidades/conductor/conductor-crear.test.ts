import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { TransportistaHelper } from '../../../../../tests/api-helpers/TransportistaHelper.js';
import { 
    generateRandomName, 
    generateRandomLastName, 
    generateGenericUser, 
    generatePassword, 
    generateDocument, 
    generatePhone, 
    generateEmail, 
    generateLicenseType 
} from '../../../../../src/utils/rutGenerator.js';

test.describe('Transport - Conductor Creation', () => {

    let transportistaName: string;

    test.beforeAll(async ({ browser }) => {
        // 1. Seed Transportista (Prerequisite)
        // Use newContext with storageState to ensure authentication
        const context = await browser.newContext({
            storageState: 'playwright/.auth/user.json'
        });
        const page = await context.newPage();
        try {
            logger.info('🏗️ Seeding Transportista for Conductor Test...');
            const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');
            transportistaName = transportista.nombre;
            logger.info(`✅ Seeded Transportista: ${transportistaName}`);
        } catch (e) {
            logger.error('Failed to seed Transportista', e);
            throw e;
        } finally {
            await page.close();
            await context.close();
        }
    });

    test('Should create a new Conductor and link to Transportista', async ({
        page,
        conductorPage
    }) => {

        const testData = {
            usuario: generateGenericUser(),
            clave: generatePassword(),
            nombre: generateRandomName(),
            apellido: generateRandomLastName(),
            rut: generateDocument('RUT'),
            telefono: generatePhone(),
            email: generateEmail(generateRandomName() + generateRandomLastName()),
            licencia: generateLicenseType(),
            vencimiento: '2026-12-31'
        };

        // Note: Already authenticated via storageState from setup project

        await test.step('Phase 1: Navigate to Conductor Creation', async () => {
            await conductorPage.navigate();
        });

        await test.step('Phase 2: Fill Form', async () => {
            logger.info(`📝 Filling Conductor Form for: ${testData.nombre} ${testData.apellido}`);
            
            await conductorPage.fillUsuario(testData.usuario);
            await conductorPage.fillClave(testData.clave);
            await conductorPage.fillNombre(testData.nombre);
            await conductorPage.fillApellido(testData.apellido);
            await conductorPage.fillDocumento(testData.rut);
            await conductorPage.fillTelefono(testData.telefono);
            await conductorPage.fillEmail(testData.email);
            
            // Optional Fields
            await conductorPage.selectLicencia(testData.licencia);
            await conductorPage.setVencimientoLicencia(testData.vencimiento);
            
            // Link Transportista
            await conductorPage.selectTransportista(transportistaName);
        });

        await test.step('Phase 3: Save and Verify', async () => {
            await conductorPage.clickGuardar();
            expect(await conductorPage.isFormSaved()).toBeTruthy();
            logger.info('✅ Conductor Created and Saved Successfully');
        });

    });
});
