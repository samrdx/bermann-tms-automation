import { test, expect } from '../../../../../src/fixtures/base.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { TipoOperacionData } from '../../../../../src/modules/configAdmin/pages/TipoOperacionPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

const logger = createLogger('TipoOperacionTest');

test.describe('Configuracion Admin: Tiempos Operacionales', () => {
  test.setTimeout(90000);

  const envName = (process.env.ENV || 'QA').toUpperCase();

  test(`[${envName}] Crear Nuevo Tipo de Operacion con SLA`, async ({ tipoOperacionPage }, testInfo) => {
    const startTime = Date.now();
    logger.info(`Iniciando Test de Creacion de Tipo de Operacion en ambiente: ${envName}`);
    logger.info('='.repeat(80));

    const suffix = Math.floor(10000 + Math.random() * 90000);
    const prefix = envName === 'QA' ? 'Qa_to_standard' : 'Demo_to_standard';

    const testData: TipoOperacionData = {
      nombre: `${prefix}_${suffix}`,
      tiempoPrevio: '01:00',
      permanenciaOrigen: '02:00',
      permanenciaDestino: '01:30',
      validarHorarios: true,
    };

    await test.step('Navegar a creacion de Tipo de Operacion', async () => {
      await tipoOperacionPage.navigateToCreate();
    });

    await test.step('Completar datos de SLA', async () => {
      await tipoOperacionPage.fillForm(testData);
    });

    await test.step('Guardar y verificar', async () => {
      await tipoOperacionPage.clickGuardar();
      const isSaved = await tipoOperacionPage.isFormSaved();
      expect(isSaved).toBeTruthy();
      logger.info('✅ Tipo de Operacion guardado exitosamente');
    });

    let isVisibleInGrid = false;
    await test.step('Verificar en el buscador de la grilla', async () => {
      logger.info('PHASE 4: Verificando en el buscador...');
      await tipoOperacionPage.navigateToIndex();
      isVisibleInGrid = await tipoOperacionPage.searchAndVerify(testData.nombre);

      if (isVisibleInGrid) {
        logger.info(`✅ Verificacion exitosa: El ente "${testData.nombre}" se visualiza en la grilla.`);
      } else {
        logger.error(`❌ Fallo de verificacion: El ente "${testData.nombre}" NO se encontro en la grilla.`);
      }
      expect(isVisibleInGrid).toBe(true);
    });

    await test.step('Persistir seededTipoOperacion para dependencia de Tipo Servicio', async () => {
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      let operationalData: any = {};

      if (fs.existsSync(dataPath)) {
        operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }

      operationalData.seededTipoOperacion = {
        nombre: testData.nombre,
        createdAt: new Date().toISOString(),
        env: envName,
      };

      fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
      logger.info(`✅ seededTipoOperacion guardado en ${dataPath}`);
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`RESUMEN DE EJECUCION (${envName})`);
    logger.info(`Nombre: ${testData.nombre}`);
    logger.info(`Tiempo Previo: ${testData.tiempoPrevio}`);
    logger.info(`Perm. Origen: ${testData.permanenciaOrigen}`);
    logger.info(`Perm. Destino: ${testData.permanenciaDestino}`);
    logger.info(`Validar Horarios: ${testData.validarHorarios ? 'SI' : 'NO'}`);
    logger.info(`Visible en Grilla: ${isVisibleInGrid ? 'SI ✅' : 'NO ❌'}`);
    logger.info(`Tiempo Total: ${executionTime}s`);
    logger.info('='.repeat(80));
  });
});
