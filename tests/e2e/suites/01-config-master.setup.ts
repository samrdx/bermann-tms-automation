import { test, expect } from '../../../src/fixtures/base.js';
import { logger } from '../../../src/utils/logger.js';
import { DataPathHelper } from '../../api-helpers/DataPathHelper.js';
import { UnidadNegocioHelper } from '../../api-helpers/UnidadNegocioHelper.js';
import { TipoOperacionData } from '../../../src/modules/configAdmin/pages/TipoOperacionPage.js';
import { TipoServicioData } from '../../../src/modules/configAdmin/pages/TipoServicioPage.js';
import { NamingHelper } from '../../../src/utils/NamingHelper.js';
import { allure } from 'allure-playwright';
import fs from 'fs';

/**
 * [CONFIGURACIÓN SETUP] FASE 1 
 * Orquestación: Unidad de Negocio -> Tipo Operación -> Tipo Servicio -> Capacidades -> Ruta
 * Runs serially to ensure data dependencies are met.
 */
test.describe('Configuración Setup fase 1', () => {
  test.setTimeout(400000); // 5 minutes for full setup

  test('Creación de configuración con datos seeded', async ({
    page,
    loginPage,
    tipoOperacionPage,
    tipoServicioPage,
    capacidadPage,
    rutaPage,
  }, testInfo) => {
    const startTime = Date.now();
    const envLabel = (process.env.ENV || 'QA').toUpperCase();
    const isDemo = envLabel === 'DEMO';
    const prefix = isDemo ? 'Demo_' : 'Qa_';
    
    await allure.epic('TMS Setup Flow');
    await allure.feature('00-ConfiguraciónSetup');
    await allure.story('Configuración con datos seeded');
    await allure.parameter('Ambiente', envLabel);

    logger.info('='.repeat(90));
    logger.info(`🚀 INICIANDO CONFIGURACIÓN SETUP - FASE 1 [ENV: ${envLabel}]`);
    logger.info('='.repeat(90));

    // Initialize data structure
    const configData: any = {
      createdAt: new Date().toISOString(),
      env: envLabel,
      unidadNegocio: {},
      seededTipoOperacion: {},
      seededTipoServicio: {},
      capacidad: {},
      ruta: {},
    };

    // 1. UNIDAD DE NEGOCIO
    await test.step('📦 PASO 1/5: Unidad de Negocio', async () => {
      logger.info('🏢 Creando Unidad de Negocio...');
      const un = await UnidadNegocioHelper.createUnidadNegocioViaUI(page);
      configData.unidadNegocio = {
        id: un.id,
        nombre: un.nombre,
        baseNombre: un.baseNombre,
      };
      await allure.parameter('Unidad de Negocio', un.nombre);
      logger.info(`✅ UN creada: ${un.nombre} (ID: ${un.id})`);
    });

    // 2. TIPO DE OPERACION
    const toSuffix = Math.floor(10000 + Math.random() * 90000);
    const toName = `${isDemo ? 'Demo_to_std' : 'Qa_to_std'}_${toSuffix}`;
    await test.step('📦 PASO 2/5: Tipo de Operación', async () => {
      logger.info(`⚙️ Creando Tipo de Operación: ${toName}`);
      const toData: TipoOperacionData = {
        nombre: toName,
        tiempoPrevio: '01:00',
        permanenciaOrigen: '02:00',
        permanenciaDestino: '01:30',
        validarHorarios: true,
      };
      await tipoOperacionPage.navigateToCreate();
      await tipoOperacionPage.fillForm(toData);
      await tipoOperacionPage.clickGuardar();
      
      const isSaved = await tipoOperacionPage.isFormSaved();
      if (!isSaved) {
        const error = await tipoOperacionPage.getFormErrorMessage();
        await tipoOperacionPage.takeScreenshot('tipo-operacion-save-error');
        throw new Error(`No se pudo confirmar el guardado de Tipo de Operación. UI Error: ${error || 'Desconocido'}`);
      }
      
      configData.seededTipoOperacion = {
        nombre: toName,
        createdAt: new Date().toISOString(),
        env: envLabel,
      };
      await allure.parameter('Tipo de Operación', toName);
      logger.info(`✅ Tipo Operación creado: ${toName}`);
    });

    // 3. TIPO DE SERVICIO
    const tsSuffix = Math.floor(10000 + Math.random() * 90000);
    const tsName = `${isDemo ? 'Demo_TS' : 'Qa_TS'}_${tsSuffix}`;
    await test.step('📦 PASO 3/5: Tipo de Servicio', async () => {
      logger.info(`🛠️ Creando Tipo de Servicio: ${tsName} (Vinculado a ${toName})`);
      const tsData: TipoServicioData = {
        nombre: tsName,
        tipoOperacionNombre: toName,
      };
      await tipoServicioPage.navigateToCreate();
      await tipoServicioPage.fillNombre(tsData.nombre);
      await tipoServicioPage.selectTipoOperacion(tsData.tipoOperacionNombre);
      await tipoServicioPage.clickGuardar();
      
      const isSaved = await tipoServicioPage.isFormSaved();
      if (!isSaved) {
        await tipoServicioPage.takeScreenshot('tipo-servicio-save-error');
        throw new Error('No se pudo confirmar el guardado de Tipo de Servicio');
      }

      configData.seededTipoServicio = {
        nombre: tsName,
        tipoOperacionNombre: toName,
        createdAt: new Date().toISOString(),
        env: envLabel,
      };
      await allure.parameter('Tipo de Servicio', tsName);
      logger.info(`✅ Tipo Servicio creado: ${tsName}`);
    });

    // 4. CAPACIDADES
    await test.step('📦 PASO 4/5: Capacidades', async () => {
      const capValor = Math.floor(Math.random() * 20) + 1;
      const capNombre = `${capValor} TON`;
      logger.info(`📏 Creando Capacidad: ${capNombre}`);
      
      await capacidadPage.navigateToCreate();
      await capacidadPage.setEsRango(false);
      await capacidadPage.fillCapacidadInicial(capValor.toString());
      await capacidadPage.selectTipoCapacidad('TON');
      await capacidadPage.clickGuardar();
      
      configData.capacidad = {
        nombre: capNombre,
        valor: capValor.toString(),
        unidad: 'TON',
      };
      await allure.parameter('Capacidad', capNombre);
      logger.info(`✅ Capacidad creada: ${capNombre}`);
    });

    // 5. RUTA
    await test.step('📦 PASO 5/5: Ruta', async () => {
      const rutaSeed = NamingHelper.getRutaData();
      logger.info(`🚚 Creando Ruta: ${rutaSeed.nombreRuta} (${rutaSeed.nroRuta})`);
      
      await rutaPage.navigateToCreate();
      const result = await rutaPage.crearRuta({
        nombreRuta: rutaSeed.nombreRuta,
        nroRuta: rutaSeed.nroRuta,
      });

      configData.ruta = {
        nombre: rutaSeed.nombreRuta,
        nro: rutaSeed.nroRuta,
        origen: result.origen,
        destino: result.destino,
      };
      await allure.parameter('Ruta', rutaSeed.nombreRuta);
      logger.info(`✅ Ruta creada: ${rutaSeed.nombreRuta} [${result.origen} -> ${result.destino}]`);
    });

    // PERSIST DATA
    await test.step('💾 Persistencia de Datos', async () => {
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      
      // Load existing data if any (e.g. from previous runs to merge)
      let finalData = configData;
      if (fs.existsSync(dataPath)) {
        const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        finalData = { ...existing, ...configData };
      }

      fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2), 'utf-8');
      logger.info(`📁 Datos de Fase 1 persistidos en: ${dataPath}`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    await allure.attachment('Execution Summary - Phase 1', JSON.stringify({
      ambiente: envLabel,
      duracion: `${duration}s`,
      configData
    }, null, 2), 'application/json');

    logger.info('='.repeat(90));
    logger.info(`🏁 CONFIGURACIÓN SETUP - FASE 1 COMPLETADO EN ${duration}s`);
    logger.info('='.repeat(90));
  });
});
