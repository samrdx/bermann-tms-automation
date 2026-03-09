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
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';

test.describe('[E04] Entidades - Crear Conductor', () => {
    test.setTimeout(120000);


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
        logger.info(`✅ Cargado seededTransportista: ${transportistaName} (ID: ${seededTransportista.id})`);
    });

    test('Debe crear un Conductor correctamente y asociarlo a un transportista', async ({
        page,
        conductorPage
    }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('01-Entidades');
        await allure.story('Crear Conductor');
        await allure.parameter('Transportista (Seeded)', transportistaName);
        await allure.parameter('Transportista ID', String(seededTransportista.id));

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

        await test.step('Fase 1: Navegar hasta creación de conductor', async () => {
            await conductorPage.navigate();
        });

        await test.step('Fase 2: Completar formulario', async () => {
            logger.info(`📝 Completando formulario de conductor para: ${testData.nombre} ${testData.apellido}`);

            await conductorPage.fillUsuario(testData.usuario);
            await conductorPage.fillClave(testData.clave);
            await conductorPage.fillNombre(testData.nombre);
            await conductorPage.fillApellido(testData.apellido);
            await conductorPage.fillDocumento(testData.rut);
            await conductorPage.fillTelefono(testData.telefono);
            await conductorPage.fillEmail(testData.email);

            // Optional Fields
            // License info
            await conductorPage.selectLicencia('A1');
            await conductorPage.setVencimientoLicencia('2026-12-31');

            // Link Transportista
            await conductorPage.selectTransportista(transportistaName);
        });

        await test.step('Fase 3: Guardar y verificar', async () => {
            // Capture values BEFORE saving since form will navigate away
            const expectedNombre = await page.locator('#conductores-nombre').inputValue().catch(() => '');
            const expectedApellido = await page.locator('#conductores-apellido').inputValue().catch(() => '');
            const expectedRut = await page.locator('#conductores-documento').inputValue().catch(() => '');
            const expectedEmail = await page.locator('#conductores-email').inputValue().catch(() => '');

            await conductorPage.clickGuardar();
            await page.waitForTimeout(2000);
            const isSaved = await conductorPage.isFormSaved();
            expect(isSaved).toBeTruthy();

            if (isSaved) {
                logger.info(`✅ Conductor [${expectedNombre} ${expectedApellido}] guardado exitosamente`);
                
                entityTracker.register({ 
                    type: 'Conductor', 
                    name: expectedNombre, 
                    apellido: expectedApellido, 
                    asociado: transportistaName 
                });

                const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                data.seededConductor = {
                    nombre: expectedNombre,
                    apellido: expectedApellido,
                    rut: expectedRut,
                    email: expectedEmail,
                    transportistaNombre: transportistaName
                };
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                logger.info(`✅ seededConductor guardado: ${expectedNombre} ${expectedApellido}`);

                await allure.parameter('Conductor', `${expectedNombre} ${expectedApellido}`.trim());
                await allure.parameter('RUT Conductor', expectedRut);
            }
            logger.info('✅ Conductor creado y guardado exitosamente');
        });

    });
});
