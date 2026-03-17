import { test, expect } from '../../../src/fixtures/base.js';
import { logger } from '../../../src/utils/logger.js';
import { DataPathHelper } from '../../api-helpers/DataPathHelper.js';
import { NamingHelper } from '../../../src/utils/NamingHelper.js';
import { 
  type CargaEntitySeed, 
  type CargaEntityType 
} from '../../../src/modules/configAdmin/pages/CargaMasterPage.js';
import { 
  type CrearCargaInput, 
  CARGA_DROPDOWN_FIELDS 
} from '../../../src/modules/configAdmin/pages/CrearCargaPage.js';
import { allure } from 'allure-playwright';
import fs from 'fs';

const CARGA_SEQUENCE: Array<{
  type: CargaEntityType;
  emoji: string;
  shortTag: string;
  display: string;
}> = [
  { type: 'unidadMedida', emoji: '📏', shortTag: 'Unidad', display: 'Unidad de Medida' },
  { type: 'categoriaCarga', emoji: '🏷️', shortTag: 'Categoria', display: 'Categoria Carga' },
  { type: 'configuracionCarga', emoji: '⚙️', shortTag: 'Configuracion', display: 'Configuracion Carga' },
  { type: 'contenidoCarga', emoji: '📦', shortTag: 'Contenido', display: 'Contenido Carga' },
  { type: 'temperaturaCarga', emoji: '❄️', shortTag: 'Temperatura', display: 'Temperatura Carga' },
  { type: 'comercio', emoji: '🏪', shortTag: 'Comercio', display: 'Comercio' },
  { type: 'tipoRampla', emoji: '🛻', shortTag: 'TipoRampla', display: 'Tipo Rampla' },
];

/**
 * [CONFIGURACIÓN SETUP] FASE 1
 * Orquestación: Creación entidades Carga -> Creación Carga
 * Depende de: FASE 1 (Tipo de Operación)
 */
test.describe('Configuración Setup fase 2', () => {
  test.setTimeout(300000);

  test('Creación de carga con datos seeded', async ({
    page,
    loginPage,
    cargaMasterPage,
    crearCargaPage,
  }, testInfo) => {
    const startTime = Date.now();
    const envLabel = (process.env.ENV || 'QA').toUpperCase();
    const isDemo = envLabel === 'DEMO';
    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
    
    await allure.epic('TMS Setup Flow');
    await allure.feature('00-ConfiguraciónSetup');
    await allure.story('Creación de carga con datos seeded');
    await allure.parameter('Ambiente', envLabel);

    logger.info('='.repeat(90));
    logger.info(`🚀 INICIANDO CONFIGURACIÓN SETUP - FASE 2 [ENV: ${envLabel}]`);
    logger.info('='.repeat(90));

    // 0. LOAD PHASE 1 DATA
    if (!fs.existsSync(dataPath)) {
        throw new Error(`❌ Error: No se encontró el archivo de datos de Phase 1 en: ${dataPath}. Ejecute Phase 1 primero.`);
    }
    const masterData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const seededTipoOperacionNombre = masterData.seededTipoOperacion?.nombre;
    
    if (!seededTipoOperacionNombre) {
        throw new Error(`❌ Error: 'seededTipoOperacion' no encontrado en ${dataPath}. Phase 1 falló o está incompleta.`);
    }
    logger.info(`✅ Consumiendo Tipo de Operación desde Phase 1: ${seededTipoOperacionNombre}`);

    // 1. CARGA SUB-ENTITIES (SETUP)
    const createdCargaEntities: Partial<Record<CargaEntityType, CargaEntitySeed>> = {};
    
    await test.step('📦 PASO 1/7: Creación de Sub-entidades de Carga', async () => {
      for (const step of CARGA_SEQUENCE) {
        const nombre = step.type === 'tipoRampla'
           ? NamingHelper.getTipoRamplaName()
           : NamingHelper.getCargaMasterName(step.shortTag);
           
        logger.info(`${step.emoji} Creando ${step.display}: ${nombre}`);
        const created = await cargaMasterPage.createEntity(step.type, nombre);
        createdCargaEntities[step.type] = created;
        expect(created.nombre).toBe(nombre);
      }
      const entitySummary = Object.values(createdCargaEntities).map(e => e.nombre).join(', ');
      await allure.parameter('Sub-entidades de Carga', entitySummary);
    });

    // 2. FINAL CARGA CREATION
    const codigoPrefix = isDemo ? 'Demo_COD_' : 'Qa_COD_';
    const codigoCarga = `${codigoPrefix}${Math.floor(10000 + Math.random() * 90000)}`;

    await test.step('📦 PASO 2/7: Creación de Carga Final', async () => {
        logger.info(`🏗️ Creando Carga Final con código: ${codigoCarga}`);
        
        const input: CrearCargaInput = {
            unidadMedidaNombre: createdCargaEntities.unidadMedida!.nombre,
            categoriaNombre: createdCargaEntities.categoriaCarga!.nombre,
            configuracionNombre: createdCargaEntities.configuracionCarga!.nombre,
            contenidoNombre: createdCargaEntities.contenidoCarga!.nombre,
            temperaturaNombre: createdCargaEntities.temperaturaCarga!.nombre,
            comercioNombre: createdCargaEntities.comercio!.nombre,
            tipoRamplaNombre: createdCargaEntities.tipoRampla!.nombre,
            tipoOperacionNombre: seededTipoOperacionNombre,
            codigoCarga,
        };

        await crearCargaPage.navigateToCreate();
        await crearCargaPage.ensureTipoOperacionSelected(input.tipoOperacionNombre);

        const valueByType: Record<CargaEntityType, string> = {
            unidadMedida: input.unidadMedidaNombre,
            categoriaCarga: input.categoriaNombre,
            configuracionCarga: input.configuracionNombre,
            contenidoCarga: input.contenidoNombre,
            temperaturaCarga: input.temperaturaNombre,
            comercio: input.comercioNombre,
            tipoRampla: input.tipoRamplaNombre,
        };

        for (const field of CARGA_DROPDOWN_FIELDS) {
            const value = valueByType[field.type];
            await crearCargaPage.selectDropdownByText(field.selector, value, field.label);
        }

        await crearCargaPage.fillCodigoCarga(codigoCarga);
        await crearCargaPage.saveCarga();
        
        const isVisible = await crearCargaPage.verifyInIndexByCodigo(codigoCarga);
        expect(isVisible).toBeTruthy();
        await allure.parameter('Código Carga Final', codigoCarga);
        logger.info(`✅ Carga Final creada y verificada: ${codigoCarga}`);
    });

    // 4. PERSIST DATA
    await test.step('💾 Persistencia de Datos (Fase 2)', async () => {
      masterData.cargaSetup = {
        entities: createdCargaEntities,
        tipoOperacionNombre: seededTipoOperacionNombre,
      };
      masterData.seededCarga = {
        codigo: codigoCarga,
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(dataPath, JSON.stringify(masterData, null, 2), 'utf-8');
      logger.info(`📁 Datos de Fase 2 añadidos a: ${dataPath}`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    await allure.attachment('Execution Summary - Phase 2', JSON.stringify({
      ambiente: envLabel,
      duracion: `${duration}s`,
      tipoOperacionConsumido: seededTipoOperacionNombre,
      cargaCreada: codigoCarga,
      subEntidades: createdCargaEntities
    }, null, 2), 'application/json');

    logger.info('='.repeat(90));
    logger.info(`🏁 CONFIGURACIÓN SETUP - FASE 2 COMPLETADO EN ${duration}s`);
    logger.info('='.repeat(90));
  });
});
