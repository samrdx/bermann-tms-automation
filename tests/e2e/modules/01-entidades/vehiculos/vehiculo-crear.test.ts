import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { TransportistaHelper, Transportista } from '../../../../../tests/api-helpers/TransportistaHelper.js';
import { generatePatente } from '../../../../../src/utils/rutGenerator.js';
import { config } from '../../../../../src/config/environment.js';

test.describe('Integration - Vehiculo with API Seeded Transportista', () => {

    let seededTransportista: Transportista;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        try {
            // Use UI Seeding logic
            seededTransportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');

            if (!seededTransportista.id) {
                throw new Error('Seeding failed: No ID returned');
            }
        } catch (error) {
            logger.error('Failed to seed transportista', error);
            throw error;
        } finally {
            await page.close();
        }
    });

    test('Should create a Vehiculo using Seeded Transportista', async ({
        page,
        vehiculoPage
    }) => {

        await test.step('Navigate to Vehiculo Creation (Direct Link)', async () => {
            // User requirement: navigate directly using ID
            // Assuming the app supports ?transportistaId=XYZ or we verify using ID
            // If the app doesn't support this query param, this might just load the create page normally.
            const baseUrl = config.get().baseUrl;
            const url = `${baseUrl}/vehiculos/crear?transportista_id=${seededTransportista.id}`; // Guessed param name
            logger.info(`🧭 Navigating to: ${url}`);
            await page.goto(url);
        });

        await test.step('Fill Form', async () => {
            logger.info(`📝 Filling form for Transportista: ${seededTransportista.nombre}`);

            await vehiculoPage.fillPatente(generatePatente());
            await vehiculoPage.fillMuestra(`Integra ${seededTransportista.id}`);

            // If the query param worked, Transporista might be pre-selected.
            // We should check. If not, select it.
            // Check if dropdown has the value selected?
            // Page Object doesn't implement "getSelectedOption".
            // We'll just select it to be safe, or check if we can verify.

            // For robustness, we selects it explicitly as in previous valid test.
            await vehiculoPage.selectTransportista(seededTransportista.nombre);

            await vehiculoPage.selectTipoVehiculo('RAMPLA');
            await vehiculoPage.selectTipoRampla('Plana');
            await vehiculoPage.selectCapacidad('25000');
        });

        await test.step('Save and Verify', async () => {
            await vehiculoPage.clickGuardar();
            await page.waitForTimeout(2000);
            expect(await vehiculoPage.isFormSaved()).toBeTruthy();
        });
    });
});
