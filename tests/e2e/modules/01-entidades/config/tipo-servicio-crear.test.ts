import { test, expect } from '../../../../../src/fixtures/base.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { TipoServicioData } from '../../../../../src/modules/configAdmin/pages/TipoServicioPage.js';
import fs from 'fs';

const logger = createLogger('TipoServicioTest');

interface SeededTipoOperacion {
  nombre: string;
  createdAt: string;
  env: string;
}

test.describe('Configuracion Admin: Tipo de Servicio', () => {
  test.setTimeout(120000);

  const envName = (process.env.ENV || 'QA').toUpperCase();
  let seededTipoOperacion: SeededTipoOperacion;

  test.beforeAll(async ({}, testInfo) => {
    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

    if (!fs.existsSync(dataPath)) {
      throw new Error(
        `Data file not found: ${dataPath}. Run tipo-operacion seed first (project dependency or direct seed project).`,
      );
    }

    const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    seededTipoOperacion = operationalData.seededTipoOperacion;

    if (!seededTipoOperacion?.nombre) {
      throw new Error(
        `seededTipoOperacion not found in ${dataPath}. Ensure tipo-operacion-crear.test.ts ran successfully before this test.`,
      );
    }
  });

  test(`[${envName}] Crear Tipo de Servicio asociado a Tipo de Operacion`, async ({
    tipoServicioPage,
  }, testInfo) => {
    const startTime = Date.now();
    const suffix = Math.floor(10000 + Math.random() * 90000);
    const tsPrefix = envName === 'DEMO' ? 'Demo_TS' : 'Qa_TS';

    const testData: TipoServicioData = {
      nombre: `${tsPrefix}_${suffix}`,
      tipoOperacionNombre: seededTipoOperacion.nombre,
    };

    await test.step('Fase 1: Navegar a creacion de Tipo de Servicio', async () => {
      await tipoServicioPage.navigateToCreate();
    });

    await test.step('Fase 2: Vincular Tipo de Operacion y completar formulario', async () => {
      logger.info(`🔗 Vinculación con UN: Tipo Operación seleccionado -> ${testData.tipoOperacionNombre}`);
      await tipoServicioPage.fillNombre(testData.nombre);
      await tipoServicioPage.selectTipoOperacion(testData.tipoOperacionNombre);
    });

    await test.step('Fase 3: Guardar Tipo de Servicio', async () => {
      logger.info(`🛠️ Creación de Servicio: Guardando ${testData.nombre}`);
      await tipoServicioPage.clickGuardar();
      const isSaved = await tipoServicioPage.isFormSaved();
      expect(isSaved).toBeTruthy();
    });

    let isVisibleInGrid = false;
    await test.step('Fase 4: Verificar registro en index', async () => {
      await tipoServicioPage.navigateToIndex();
      isVisibleInGrid = await tipoServicioPage.searchAndVerify(testData.nombre);
      expect(isVisibleInGrid).toBe(true);
      logger.info(`✅ Resultado Final: Tipo Servicio visible en grilla -> ${isVisibleInGrid ? 'SI' : 'NO'}`);
    });

    await test.step('Fase 5: Persistir seededTipoServicio para trazabilidad', async () => {
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      let operationalData: any = {};

      if (fs.existsSync(dataPath)) {
        operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }

      operationalData.seededTipoServicio = {
        nombre: testData.nombre,
        tipoOperacionNombre: testData.tipoOperacionNombre,
        createdAt: new Date().toISOString(),
        env: envName,
      };

      fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
    });

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info('RESUMEN EJECUTIVO');
    logger.info(`RELACIÓN CREADA: [${testData.tipoOperacionNombre}] -> [${testData.nombre}]`);
    logger.info(`Ambiente: ${envName}`);
    logger.info(`Visible en grilla: ${isVisibleInGrid ? 'SI' : 'NO'}`);
    logger.info(`Tiempo total: ${durationSeconds}s`);
    logger.info('='.repeat(80));
  });
});
