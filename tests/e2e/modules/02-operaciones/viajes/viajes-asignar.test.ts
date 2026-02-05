import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

test.describe('Viajes - Asignar (Dynamic)', () => {
    let lastRunData: any;

    test.beforeAll(async () => {
        try {
            const dataPath = path.resolve('last-run-data.json');
            if (fs.existsSync(dataPath)) {
                logger.info(`Reading data from ${dataPath}`);
                const rawData = fs.readFileSync(dataPath, 'utf-8');
                lastRunData = JSON.parse(rawData);
            } else {
                logger.warn('last-run-data.json not found in root');
            }
        } catch (error) {
            logger.error('Error reading last-run-data.json', error);
        }
    });

    test('Should assign Trip 46221 to Transportista/Resources from JSON', async ({
        viajesAsignarPage,
        loginPage,
        dashboardPage
    }) => {
        // 1. Data Validation
        if (!lastRunData?.viaje?.nroViaje) {
            test.skip(true, 'Skipping: No Nro Viaje found in last-run-data.json');
            return;
        }

        const nroViaje = lastRunData.viaje.nroViaje;
        // Use full name as per user instruction and JSON data
        const transportistaName = lastRunData.transportista.nombre;

        const patente = lastRunData.vehiculo.patente;
        const conductorName = `${lastRunData.conductor.nombre} ${lastRunData.conductor.apellido}`;

        logger.info(`📋 Test Params: Viaje=${nroViaje}, Trans=${transportistaName}, Patente=${patente}, Cond=${conductorName}`);

        // 2. Login
        const user = getTestUser('regular');
        await test.step('Phase 1: Login', async () => {
            await loginPage.loginAndWaitForDashboard(user.username, user.password);
            expect(await dashboardPage.isOnDashboard()).toBe(true);
        });

        // 3. Navigate
        await test.step('Phase 2: Navigate to Asignar', async () => {
            await viajesAsignarPage.navigate();
            await viajesAsignarPage.waitForTableLoad();
        });

        // 4. Assign
        await test.step('Phase 3: Assign Resources', async () => {
            await viajesAsignarPage.assignViaje(nroViaje, {
                transportista: transportistaName,
                vehiculoPrincipal: patente,
                conductor: conductorName
            });
        });

        // 5. Verify
        await test.step('Phase 4: Verify Status', async () => {
             const isAssigned = await viajesAsignarPage.verifyViajeAsignado(nroViaje);
             expect(isAssigned).toBeTruthy();
             
             const status = await viajesAsignarPage.getViajeStatus(nroViaje);
             logger.info(`Final Status: ${status}`);
             expect(status.toUpperCase()).toContain('ASIGNADO');
        });
    });
});
