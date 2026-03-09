import { test, expect } from '../../../../../src/fixtures/base.js';
import { MonitoreoPage } from '../../../../../src/modules/monitoring/pages/MonitoreoPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

/**
 * Operaciones - Monitoreo - Finalizar Viaje (Legacy)
 * 
 * Prerequisites:
 *   1. npm run test:legacy:setup
 *   2. npm run test:legacy:planificar
 *   3. npm run test:legacy:asignar
 */
test.describe('[V03] Viajes - Finalizar (Monitoreo)', () => {
    test.setTimeout(120000);

    test('Debe finalizar un viaje asignado usando datos del JSON', async ({ page }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('03-Viajes');
        await allure.story('Finalizar Viaje');

        const startTime = Date.now();

        logger.info('='.repeat(80));
        logger.info('Iniciando Paso 7: Monitoreo/Finalización de Viaje (LEGACY)');
        logger.info('='.repeat(80));

        // PHASE 1: Load Data
        logger.info('Fase 1: Cargando datos del JSON del trabajador...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(`Archivo de datos no encontrado en ${dataPath}. Por favor, ejecute los prerrequisitos.`);
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const nroViaje = operationalData.viaje?.nroViaje;

        if (!nroViaje) {
            throw new Error('❌ Missing: viaje.nroViaje in JSON. Run: npm run test:legacy:planificar/asignar');
        }

        logger.info(`✅ Viaje cargado: ${nroViaje}`);

        await allure.parameter('Nro Viaje', String(nroViaje));
        await allure.parameter('Ambiente', process.env.ENV || 'QA');
        await allure.attachment('Monitoreo Data', JSON.stringify({
            NroViaje: nroViaje,
        }, null, 2), 'application/json');

        // PHASE 2: Navigation to Monitoreo
        const monitoreo = new MonitoreoPage(page);
        await test.step('Fase 2: Navegando al Monitoreo', async () => {
            logger.info('Fase 2: Navegando al Monitoreo...');
            await monitoreo.navigate();
            logger.info('✅ Pagina Monitoreo cargada');
        });

        // PHASE 3: Search and Finalize
        await test.step(`Fase 3: Finalizando Viaje ${nroViaje}`, async () => {
            logger.info(`🔍 Buscando y finalizando viaje: ${nroViaje}`);
            await monitoreo.finalizarViaje(nroViaje);
            logger.info('✅ Comando de finalización ejecutado');
        });

        // PHASE 4: Update JSON
        operationalData.viaje.status = 'FINALIZADO';
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info('✅ JSON updated: viaje.status = FINALIZADO');
        await allure.parameter('Estado Viaje', 'FINALIZADO');

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('PASO 7: ¡MONITOREO/FINALIZACIÓN DE VIAJE (LEGACY) COMPLETADO!');
        logger.info('='.repeat(80));
    });
});
