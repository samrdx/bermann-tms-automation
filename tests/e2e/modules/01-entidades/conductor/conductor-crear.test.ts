import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
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
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import * as fs from 'fs';
import { Transportista } from '../../../../api-helpers/TransportistaHelper.js';

test.describe('Transport - Conductor Creation', () => {

    let transportistaName: string;
    let seededTransportista: Transportista;

    test.beforeAll(async ({ }, testInfo) => {
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found: ${dataPath}. Make sure transportistas-crear.test.ts runs first.`);
        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        seededTransportista = data.seededTransportista;

        if (!seededTransportista || !seededTransportista.id) {
            throw new Error('seededTransportista not found in data file. Make sure transportistas-crear.test.ts runs first and successfully seeds a Transportista.');
        }
        transportistaName = seededTransportista.nombre;
        logger.info(`✅ Loaded seededTransportista: ${transportistaName} (ID: ${seededTransportista.id})`);
    });

    test('Should create a new Conductor and link to Transportista', async ({
        page,
        conductorPage
    }, testInfo) => {

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
            await page.waitForTimeout(2000);
            const isSaved = await conductorPage.isFormSaved();
            expect(isSaved).toBeTruthy();

            if (isSaved) {
                const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                data.seededConductor = {
                    nombre: testData.nombre,
                    apellido: testData.apellido,
                    rut: testData.rut,
                    email: testData.email,
                    transportistaNombre: transportistaName
                };
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                logger.info(`✅ seededConductor saved: ${testData.nombre} ${testData.apellido}`);
            }
            logger.info('✅ Conductor Created and Saved Successfully');
        });

    });
});
