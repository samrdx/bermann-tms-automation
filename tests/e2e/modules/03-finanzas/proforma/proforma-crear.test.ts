import { test, expect } from '../../../../../src/fixtures/base.js';
import { PrefacturaPage } from '../../../../../src/modules/finanzas/PrefacturaPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { OperationalDataLoader } from '../../../../api-helpers/OperationalDataLoader.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

/**
 * Finanzas - Proforma (Legacy)
 * 
 * Prerequisites:
 *   1. LEGACY_DATA_SOURCE=entities: correr `npm run qa:regression:entities` / `npm run demo:regression:entities`
 *      o LEGACY_DATA_SOURCE=base: correr `npm run qa:seed:legacy` / `npm run demo:seed:legacy`
 *   2. Correr la cadena previa del mismo source hasta prefactura: smoke:01 al 10
 */
test.describe('[V04] Finanzas - Proformar Viaje (Legacy)', () => {
    test.setTimeout(120000);

    test('Debe proformar un viaje finalizado usando datos del JSON', async ({ page }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('04-Finanzas');
        await allure.story('Crear Proforma de Viaje Finalizado');

        const startTime = Date.now();

        logger.info('='.repeat(80));
        logger.info('Iniciando Paso 9: Creación de Proforma (LEGACY)');
        logger.info('='.repeat(80));

        // PHASE 1: Load Data
        logger.info('Fase 1: Cargando datos del JSON del trabajador...');
        const { data: operationalData, candidate, usedFallback } = OperationalDataLoader.loadOrThrow<Record<string, any>>(testInfo, {
            logger,
            purpose: 'proformar viaje'
        });
        const dataPath = candidate.path;
        logger.info(`📦 Data operacional seleccionada: ${dataPath} (source=${candidate.source}; fallback=${usedFallback})`);
        
        const viaje = operationalData.viaje as Record<string, any> | undefined;
        const seededTransportista = operationalData.seededTransportista as Record<string, any> | undefined;
        const transportista = operationalData.transportista as Record<string, any> | undefined;
        const nroViaje = viaje?.nroViaje;
        
        // Prioritize seeded transportista from JSON
        const nombreTransportista = viaje?.transportista || seededTransportista?.nombre || transportista?.nombre;

        if (!nroViaje || !nombreTransportista) {
            throw new Error('❌ Missing: viaje.nroViaje o transportista.nombre in JSON. Ensure previous steps ran successfully.');
        }

        if (viaje?.status !== 'FINALIZADO') {
            logger.warn(`El viaje ${nroViaje} no figura como FINALIZADO en el JSON. Status actual: ${viaje?.status}. Intentando de todas formas...`);
        } else {
            logger.info(`✅ Viaje finalizado cargado: ${nroViaje} para transportista ${nombreTransportista}`);
        }

        await allure.parameter('Nro Viaje', String(nroViaje));
        await allure.parameter('Transportista', String(nombreTransportista));
        await allure.parameter('Ambiente', process.env.ENV || 'QA');
        await allure.attachment('Proforma Data', JSON.stringify({
            NroViaje: nroViaje,
            Transportista: nombreTransportista
        }, null, 2), 'application/json');

        // PHASE 2: Navigation to Proforma Crear
        const prefacturaPage = new PrefacturaPage(page);
        await test.step('Fase 2: Navegando a Crear Proforma', async () => {
            logger.info('Fase 2: Navegando a /proforma/crear...');
            await prefacturaPage.navigateToProformaCrear();
            logger.info('✅ Pagina Crear Proforma cargada');
        });

        // PHASE 3: Filtrar Viajes y Generar Proforma
        await test.step(`Fase 3: Filtrando viajes para el transportista ${nombreTransportista}`, async () => {
            await prefacturaPage.filtrarViajesPorTransportista(nombreTransportista);
            logger.info('✅ Viajes filtrados en grilla de transportistas');
            
            await prefacturaPage.generarProforma();
            logger.info('✅ Comando de generación de proforma ejecutado exitosamente');
        });
        
        // PHASE 4: Validar en Index (El spec indica redirección a index automática)
        await test.step(`Fase 4: Validando creación en Index usando el filtro`, async () => {
            await prefacturaPage.buscarProformaEnIndexPorTransportista(nombreTransportista);
            logger.info('✅ Proforma visualizada correctamente en /proforma/index');
        });

        // PHASE 5: Update JSON
        operationalData.viaje = {
            ...(viaje || {}),
            proformado: true
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info('✅ JSON updated: viaje.proformado = true');
        await allure.parameter('Estado Proforma', 'CREADA');

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('PASO 9: ¡CREACIÓN DE PROFORMA (LEGACY) COMPLETADO!');
        logger.info('='.repeat(80));
    });
});
