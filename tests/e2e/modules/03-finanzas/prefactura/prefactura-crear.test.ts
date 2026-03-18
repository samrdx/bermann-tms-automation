import { test, expect } from '../../../../../src/fixtures/base.js';
import { PrefacturaPage } from '../../../../../src/modules/finanzas/PrefacturaPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import { allure } from 'allure-playwright';

/**
 * Finanzas - Prefactura (Legacy)
 * 
 * Prerequisites:
 *   1. LEGACY_DATA_SOURCE=entities: correr entidades (transportista/cliente/conductor/vehiculo)
 *      o LEGACY_DATA_SOURCE=base: correr base-entities.setup.ts
 *   2. Correr viajes-planificar, viajes-asignar y viajes-monitoreo
 */
test.describe('[V04] Finanzas - Prefacturar Viaje (Legacy)', () => {
    test.setTimeout(120000);

    test('Debe prefacturar un viaje finalizado usando datos del JSON', async ({ page }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('04-Finanzas');
        await allure.story('Crear Prefactura de Viaje Finalizado');

        const startTime = Date.now();

        logger.info('='.repeat(80));
        logger.info('Iniciando Paso 8: Creación de Prefactura (LEGACY)');
        logger.info('='.repeat(80));

        // PHASE 1: Load Data
        logger.info('Fase 1: Cargando datos del JSON del trabajador...');
        const dataPath = DataPathHelper.getLegacyOperationalDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(`Archivo de datos no encontrado en ${dataPath}. Por favor, ejecute los prerrequisitos.`);
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const nroViaje = operationalData.viaje?.nroViaje;
        // Prioritize seeded client from JSON to handle Qa_/Demo_ prefixes
        const nombreCliente = operationalData.viaje?.cliente || operationalData.seededCliente?.nombre || operationalData.cliente?.nombre;

        if (!nroViaje || !nombreCliente) {
            throw new Error('❌ Missing: viaje.nroViaje o cliente.nombre in JSON. Ensure previous steps ran successfully.');
        }
        
        if (operationalData.viaje?.status !== 'FINALIZADO') {
            logger.warn(`El viaje ${nroViaje} no figura como FINALIZADO en el JSON. Status actual: ${operationalData.viaje?.status}. Intentando de todas formas...`);
        } else {
            logger.info(`✅ Viaje finalizado cargado: ${nroViaje} para cliente ${nombreCliente}`);
        }

        await allure.parameter('Nro Viaje', String(nroViaje));
        await allure.parameter('Cliente', String(nombreCliente));
        await allure.parameter('Ambiente', process.env.ENV || 'QA');
        await allure.attachment('Prefactura Data', JSON.stringify({
            NroViaje: nroViaje,
            Cliente: nombreCliente
        }, null, 2), 'application/json');

        // PHASE 2: Navigation to Prefactura Crear
        const prefacturaPage = new PrefacturaPage(page);
        await test.step('Fase 2: Navegando a Crear Prefactura', async () => {
            logger.info('Fase 2: Navegando a /prefactura/crear...');
            await prefacturaPage.navigateToCrear();
            logger.info('✅ Pagina Crear Prefactura cargada');
        });

        // PHASE 3: Filtrar Viajes y Generar PREFACTURA
        await test.step(`Fase 3: Filtrando viajes finalizados para el cliente ${nombreCliente}`, async () => {
            await prefacturaPage.filtrarViajesPorCliente(nombreCliente);
            logger.info('✅ Viajes filtrados en grilla');
            
            await prefacturaPage.generarPrefactura();
            logger.info('✅ Comando de generación de prefactura ejecutado exitosamente');
        });
        
        // PHASE 4: Validar en Index (El spec indica redirección a index automática)
        await test.step(`Fase 4: Validando creación en Index usando el filtro`, async () => {
            await prefacturaPage.buscarPrefacturaEnIndex(nombreCliente);
            logger.info('✅ Prefactura visualizada correctamente en /prefactura/index');
        });

        // PHASE 5: Update JSON
        operationalData.viaje.prefacturado = true;
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info('✅ JSON updated: viaje.prefacturado = true');
        await allure.parameter('Estado Prefactura', 'CREADA');

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('PASO 8: ¡CREACIÓN DE PREFACTURA (LEGACY) COMPLETADO!');
        logger.info('='.repeat(80));
    });
});
