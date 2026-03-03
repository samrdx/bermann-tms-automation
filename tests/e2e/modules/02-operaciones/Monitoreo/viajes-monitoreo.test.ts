import { test, expect } from '../../../../../src/fixtures/base.js';
import { MonitoreoPage } from '../../../../../src/modules/monitoring/pages/MonitoreoPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * Operaciones - Monitoreo - Finalizar Viaje (Legacy)
 * 
 * Prerequisites:
 *   1. npm run test:legacy:setup
 *   2. npm run test:legacy:planificar
 *   3. npm run test:legacy:asignar
 */
test.describe('Operaciones - Monitoreo - Finalizar Viaje (Legacy)', () => {
    test.setTimeout(120000);

    test('Should finalize an assigned trip using data from worker JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();

        logger.info('='.repeat(80));
        logger.info('Starting Monitoreo: Finalizar Viaje (Legacy from JSON)');
        logger.info('='.repeat(80));

        // PHASE 1: Load Data
        logger.info('PHASE 1: Loading worker-specific JSON data...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}. Please run prerequisites.`);
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const nroViaje = operationalData.viaje?.nroViaje;

        if (!nroViaje) {
            throw new Error('❌ Missing: viaje.nroViaje in JSON. Run: npm run test:legacy:planificar/asignar');
        }

        logger.info(`✅ Loaded Viaje: ${nroViaje}`);

        // PHASE 2: Navigation to Monitoreo
        const monitoreo = new MonitoreoPage(page);
        await test.step('Phase 2: Navigate to Monitoreo', async () => {
            logger.info('PHASE 2: Navigating to Monitoreo...');
            await monitoreo.navigate();
            logger.info('✅ Monitoreo page loaded');
        });

        // PHASE 3: Search and Finalize
        await test.step(`Phase 3: Finalizing Viaje ${nroViaje}`, async () => {
            logger.info(`🔍 Searching and finalizing voyage: ${nroViaje}`);
            await monitoreo.finalizarViaje(nroViaje);
            logger.info('✅ Finalization command executed');
        });

        // PHASE 4: Update JSON
        operationalData.viaje.status = 'FINALIZADO';
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info('✅ JSON updated: viaje.status = FINALIZADO');

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info(`MONITOREO COMPLETE! Duration: ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});
