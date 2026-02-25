import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { Transportista } from '../../../../../tests/api-helpers/TransportistaHelper.js';
import { generatePatente } from '../../../../../src/utils/rutGenerator.js';
import { config } from '../../../../../src/config/environment.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import * as fs from 'fs';

test.describe('Integration - Vehiculo with Seeded Transportista', () => {

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
        logger.info(`✅ Loaded seededTransportista: ${seededTransportista.nombre} (ID: ${seededTransportista.id})`);
    });

    test('Should create a Vehiculo using Seeded Transportista', async ({
        page,
        vehiculoPage
    }, testInfo) => {

        await test.step('Navigate to Vehiculo Creation (Direct Link)', async () => {
            // User requirement: navigate directly without ID param
            const baseUrl = config.get().baseUrl;
            const url = `${baseUrl}/vehiculos/crear`;
            logger.info(`🧭 Navigating to: ${url}`);
            await page.goto(url);
        });

        await test.step('Fill Form', async () => {
            logger.info(`📝 Filling form for Transportista: ${seededTransportista.nombre}`);

            const patente = generatePatente();
            await vehiculoPage.fillPatente(patente);
            await vehiculoPage.fillMuestra(patente);

            await page.waitForTimeout(1000); // Resilience: Wait for dropdown interactivity
            await vehiculoPage.selectTransportista(seededTransportista.nombre);

            await vehiculoPage.selectTipoVehiculo('TRACTO');

            // Verify TRACTO is selected
            expect(await vehiculoPage.getSelectedTipoVehiculo()).toContain('TRACTO');

            await page.waitForTimeout(1000);

            await vehiculoPage.selectCapacidad('3 KG');
        });

        await test.step('Save and Verify', async () => {
            await vehiculoPage.clickGuardar();
            await page.waitForTimeout(2000);
            const isSaved = await vehiculoPage.isFormSaved();
            expect(isSaved).toBeTruthy();

            if (isSaved) {
                const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                data.seededVehiculo = {
                    patente: await page.locator('#vehiculos-patente').inputValue().catch(() => ''),
                    muestra: await page.locator('#vehiculos-muestra').inputValue().catch(() => ''),
                    transportistaNombre: seededTransportista.nombre
                };
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                logger.info(`✅ seededVehiculo saved: ${data.seededVehiculo.patente}`);
            }
        });
    });
});
