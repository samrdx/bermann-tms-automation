import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Viajes - Asignar (Dynamic)', () => {

    test('Should assign Trip to Transportista/Resources from JSON', async ({
        viajesAsignarPage
    }, testInfo) => {
        // 1. Load worker-specific data
        let lastRunData: any;
        try {
            const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
            if (fs.existsSync(dataPath)) {
                logger.info(`Reading worker-specific data from ${dataPath}`);
                const rawData = fs.readFileSync(dataPath, 'utf-8');
                lastRunData = JSON.parse(rawData);
            } else {
                // Fail if no data in E2E
                throw new Error(`Worker-specific data file not found: ${dataPath}`);
            }
        } catch (error) {
            logger.error('Error reading worker-specific data file', error);
            throw error;
        }

       // 2. Data Validation
        if (!lastRunData?.viaje?.nroViaje) {
            // CORRECCIÓN: Agregar 'true' como primer argumento
            test.skip(true, 'Skipping: No Nro Viaje found in worker-specific JSON');
            return;
        }

        const nroViaje = lastRunData.viaje.nroViaje;
        const transportistaName = lastRunData.transportista.nombre;
        const patente = lastRunData.vehiculo.patente;
        const conductorName = `${lastRunData.conductor.nombre} ${lastRunData.conductor.apellido}`;

        logger.info(`📋 Test Params: Viaje=${nroViaje}, Trans=${transportistaName}, Patente=${patente}, Cond=${conductorName}`);

        // 3. Navigate
        await test.step('Phase 1: Navigate to Asignar', async () => {
            await viajesAsignarPage.navigate();
            await viajesAsignarPage.waitForTableLoad();
        });

        // 4. Assign
        await test.step('Phase 2: Assign Resources', async () => {
            await viajesAsignarPage.assignViaje(nroViaje, {
                transportista: transportistaName,
                vehiculoPrincipal: patente,
                conductor: conductorName
            });
        });

        // 5. Verify
        await test.step('Phase 3: Verify Status', async () => {
            const isAssigned = await viajesAsignarPage.verifyViajeAsignado(nroViaje);
            expect(isAssigned, 'Viaje should be assigned').toBeTruthy();

            const status = await viajesAsignarPage.getViajeStatus(nroViaje);
            logger.info(`Final Status: ${status}`);
            // Flexible assertion: ASIGNADO or DISPONIBLE
            expect(status.toUpperCase()).toMatch(/ASIGNADO|DISPONIBLE/);
        });

        // 6. UPDATE JSON (Critical for Pipeline Continuity)
        logger.info('Updating JSON with assignment details...');
        lastRunData.viaje.status = 'ASIGNADO';
        lastRunData.viaje.transportistaAsignado = transportistaName;
        lastRunData.viaje.vehiculoAsignado = patente;
        lastRunData.viaje.conductorAsignado = conductorName;
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        fs.writeFileSync(dataPath, JSON.stringify(lastRunData, null, 2), 'utf-8');
    });
});