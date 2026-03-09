import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { Transportista } from '../../../../../tests/api-helpers/TransportistaHelper.js';
import { generatePatente } from '../../../../../src/utils/rutGenerator.js';
import { isDemoMode } from '../../../../../src/utils/env-helper.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import * as fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';
import { NamingHelper } from '../../../../../src/utils/NamingHelper.js';

test.describe('[E03] Entidades - Crear Vehículo', () => {
    test.setTimeout(120000);


    let seededTransportista: Transportista;

    test.beforeAll(async ({ }, testInfo) => {
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Archivo con data no encontrado: ${dataPath}. Asegurate de que transportistas-crear.test.ts se haya ejecutado primero.`);
        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        seededTransportista = data.seededTransportista;

        if (!seededTransportista || !seededTransportista.id) {
            throw new Error('seededTransportista no encontrado en el archivo de datos. Asegurate de que transportistas-crear.test.ts se haya ejecutado primero y haya creado un Transportista exitosamente.');
        }
        logger.info(`✅ Transportista seeded cargado: ${seededTransportista.nombre} (ID: ${seededTransportista.id})`);
    });

    test('Deberia crear un Vehiculo correctamente y asociarlo a un transportista', async ({
        page,
        vehiculoPage
    }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('01-Entidades');
        await allure.story('Crear Vehículo');
        await allure.parameter('Transportista (Seeded)', seededTransportista.nombre);
        await allure.parameter('Transportista ID', String(seededTransportista.id));

        await test.step('Navegar a la creación de vehículo', async () => {
            await vehiculoPage.navigate();
        });

        await test.step('Completar formulario', async () => {
            logger.info(`📝 Completando formulario para Transportista: ${seededTransportista.nombre}`);

            const patenteReal = generatePatente();
            const patente = NamingHelper.getVehiculoPatente(patenteReal);
            await vehiculoPage.fillPatente(patente);
            await vehiculoPage.fillMuestra(patente);

            await page.waitForTimeout(1000); // Resilience: Wait for dropdown interactivity
            await vehiculoPage.selectTransportista(seededTransportista.nombre);

            await vehiculoPage.selectTipoVehiculo('TRACTO');

            // Verify TRACTO is selected
            expect(await vehiculoPage.getSelectedTipoVehiculo()).toContain('TRACTO');

            await page.waitForTimeout(1000);

            const capacidad = isDemoMode() ? '28 TON' : '3 KG';
            await vehiculoPage.selectCapacidad(capacidad);
        });

        await test.step('Guardar y verificar', async () => {
            // Capture values BEFORE saving since form will navigate away
            const expectedPatente = await page.locator('#vehiculos-patente').inputValue().catch(() => '');
            const expectedMuestra = await page.locator('#vehiculos-muestra').inputValue().catch(() => '');

            await vehiculoPage.clickGuardar();
            await page.waitForTimeout(2000);
            const isSaved = await vehiculoPage.isFormSaved();
            expect(isSaved).toBeTruthy();

            if (isSaved) {
                logger.info(`✅ Vehículo [${expectedPatente}] guardado exitosamente`);

                entityTracker.register({
                    type: 'Vehiculo',
                    name: expectedPatente,
                    patente: expectedPatente,
                    asociado: seededTransportista.nombre
                });
                const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                data.seededVehiculo = {
                    patente: expectedPatente,
                    muestra: expectedMuestra,
                    transportistaNombre: seededTransportista.nombre
                };
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                logger.info(`✅ Vehículo seeded guardado: ${data.seededVehiculo.patente}`);

                await allure.parameter('Patente', expectedPatente);
                await allure.parameter('Muestra', expectedMuestra);
            }
        });
    });
});
