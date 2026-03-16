import { test, expect } from '../../../../../src/fixtures/base.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { NamingHelper } from '../../../../../src/utils/NamingHelper.js';
import type { CargaEntitySeed, CargaEntityType } from '../../../../../src/modules/configAdmin/pages/CargaMasterPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { allure } from 'allure-playwright';
import fs from 'fs';

const logger = createLogger('CargaSetupTest');

interface CargaSetupOutput {
  env: 'QA' | 'DEMO';
  createdAt: string;
  source: string;
  entities: Record<CargaEntityType, CargaEntitySeed>;
}

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

test.describe('Configuracion Admin: Carga Master Setup', () => {
  test.setTimeout(240000);

  test('Data Seeding completo para entidad Carga', async ({
    page,
    cargaMasterPage,
  }, testInfo) => {
    const env: 'QA' | 'DEMO' = (process.env.ENV || 'QA').toUpperCase() === 'DEMO' ? 'DEMO' : 'QA';
    const startTime = Date.now();

    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuracion');
    await allure.story('Carga Master Setup');
    await allure.parameter('Ambiente', env);

    logger.info('='.repeat(90));
    logger.info(`🚀 Iniciando Carga Master Setup [ENV: ${env}]`);
    logger.info('='.repeat(90));

    const createdEntities: Partial<Record<CargaEntityType, CargaEntitySeed>> = {};

    try {
      for (const step of CARGA_SEQUENCE) {
        await test.step(`${step.emoji} Crear ${step.display}`, async () => {
          const nombre = step.type === 'tipoRampla'
            ? NamingHelper.getTipoRamplaName()
            : NamingHelper.getCargaMasterName(step.shortTag);
          logger.info(`${step.emoji} Creando ${step.display}: ${nombre}`);

          const created = await cargaMasterPage.createEntity(step.type, nombre);
          createdEntities[step.type] = created;

          await allure.parameter(`${step.display} Nombre`, created.nombre);
          await allure.parameter(`${step.display} ID`, String(created.id ?? 'N/A'));

          expect(created.nombre).toBe(nombre);
        });
      }

      const requiredTypes: CargaEntityType[] = CARGA_SEQUENCE.map((s) => s.type);
      for (const type of requiredTypes) {
        if (!createdEntities[type]) {
          throw new Error(`Entidad requerida no creada: ${type}`);
        }
      }

      const payload: CargaSetupOutput = {
        env,
        createdAt: new Date().toISOString(),
        source: 'tests/e2e/modules/01-entidades/config/carga-setup.test.ts',
        entities: createdEntities as Record<CargaEntityType, CargaEntitySeed>,
      };

      const canonicalPath = DataPathHelper.getCargaSetupDataPath();
      const scopedPath = DataPathHelper.getScopedCargaSetupDataPath(testInfo);

      fs.writeFileSync(canonicalPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.writeFileSync(scopedPath, JSON.stringify(payload, null, 2), 'utf-8');

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      await allure.parameter('Duracion (s)', durationSeconds);
      await allure.attachment('Carga Setup Data (JSON)', JSON.stringify(payload, null, 2), 'application/json');

      logger.info('='.repeat(90));
      logger.info('📋 RESUMEN CARGA MASTER SETUP');
      logger.info(`🌍 Ambiente: ${env}`);
      for (const step of CARGA_SEQUENCE) {
        const data = payload.entities[step.type];
        logger.info(`${step.emoji} ${step.display}: ${data.nombre} (ID: ${data.id ?? 'N/A'})`);
      }
      logger.info(`💾 Archivo canonico: ${canonicalPath}`);
      logger.info(`🧩 Archivo scoped: ${scopedPath}`);
      logger.info(`⏱️ Tiempo total: ${durationSeconds}s`);
      logger.info('🎯 carga_setup_data.json listo para ser consumido por tests de creacion de contratos');
      logger.info('='.repeat(90));
    } catch (error) {
      logger.error('❌ Fallo en Carga Master Setup', error);
      await page.screenshot({
        path: `./reports/screenshots/ERROR-CargaMasterSetup-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
