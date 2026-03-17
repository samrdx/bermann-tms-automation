import { test, expect } from '../../../../../src/fixtures/base.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import {
  type CargaEntityType,
  type CargaSetupData,
  type CrearCargaInput,
  CARGA_DROPDOWN_FIELDS,
} from '../../../../../src/modules/configAdmin/pages/CrearCargaPage.js';
import { allure } from 'allure-playwright';
import fs from 'fs';

const logger = createLogger('CrearCargaFinalTest');

const REQUIRED_SETUP_KEYS: CargaEntityType[] = [
  'unidadMedida',
  'categoriaCarga',
  'configuracionCarga',
  'contenidoCarga',
  'temperaturaCarga',
  'comercio',
  'tipoRampla',
];

test.describe('[CONFIG03] - Crear Carga Final', () => {
  test.setTimeout(180000);

  test('Crear Carga en /carga/crear con JSON scoped y verificar en /carga/index', async ({
    page,
    crearCargaPage,
  }, testInfo) => {
    const startTime = Date.now();
    const envLabel = (process.env.ENV || 'QA').toUpperCase() === 'DEMO' ? 'DEMO' : 'QA';
    const browserName = DataPathHelper.getBrowserName(testInfo);
    const setupPath = DataPathHelper.getScopedCargaSetupDataPath(testInfo);
    const codigoPrefix = envLabel === 'DEMO' ? 'Demo_COD_' : 'Qa_COD_';
    const codigoCarga = `${codigoPrefix}${Math.floor(10000 + Math.random() * 90000)}`;

    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuracion');
    await allure.story('Crear Carga');
    await allure.parameter('Ambiente', envLabel);
    await allure.parameter('Browser', browserName);
    await allure.parameter('Codigo Carga', codigoCarga);

    logger.info('='.repeat(80));
    logger.info(`Iniciando Crear Carga Final [ENV: ${envLabel} | Browser: ${browserName}]`);
    logger.info('='.repeat(80));

    try {
      if (!fs.existsSync(setupPath)) {
        throw new Error(
          `Archivo scoped no encontrado: ${setupPath}. Ejecuta primero: test:${envLabel.toLowerCase()}:entity:carga-setup`,
        );
      }

      const setupData = JSON.parse(fs.readFileSync(setupPath, 'utf-8')) as CargaSetupData;
      const missingKeys = REQUIRED_SETUP_KEYS.filter((key) => !setupData?.entities?.[key]?.nombre?.trim());
      if (missingKeys.length > 0) {
        throw new Error(
          `Faltan entidades requeridas en ${setupPath}: ${missingKeys.join(', ')}. Re-ejecuta carga-setup.`,
        );
      }
      const tipoOperacionNombre = setupData?.tipoOperacion?.nombre?.trim();
      if (!tipoOperacionNombre) {
        throw new Error(
          `Falta tipoOperacion.nombre en ${setupPath}. Ejecuta tipo-operacion-crear.test.ts y luego carga-setup.test.ts`,
        );
      }

      const input: CrearCargaInput = {
        unidadMedidaNombre: setupData.entities.unidadMedida.nombre,
        categoriaNombre: setupData.entities.categoriaCarga.nombre,
        configuracionNombre: setupData.entities.configuracionCarga.nombre,
        contenidoNombre: setupData.entities.contenidoCarga.nombre,
        temperaturaNombre: setupData.entities.temperaturaCarga.nombre,
        comercioNombre: setupData.entities.comercio.nombre,
        tipoRamplaNombre: setupData.entities.tipoRampla.nombre,
        tipoOperacionNombre,
        codigoCarga,
      };

      const valueByType: Record<CargaEntityType, string> = {
        unidadMedida: input.unidadMedidaNombre,
        categoriaCarga: input.categoriaNombre,
        configuracionCarga: input.configuracionNombre,
        contenidoCarga: input.contenidoNombre,
        temperaturaCarga: input.temperaturaNombre,
        comercio: input.comercioNombre,
        tipoRampla: input.tipoRamplaNombre,
      };
      const entitiesForAllure = [
        { label: 'Unidad de Medida', data: setupData.entities.unidadMedida },
        { label: 'Categoria Carga', data: setupData.entities.categoriaCarga },
        { label: 'Configuracion Carga', data: setupData.entities.configuracionCarga },
        { label: 'Contenido Carga', data: setupData.entities.contenidoCarga },
        { label: 'Temperatura Carga', data: setupData.entities.temperaturaCarga },
        { label: 'Comercio', data: setupData.entities.comercio },
        { label: 'Tipo Rampla', data: setupData.entities.tipoRampla },
      ];
      const usedDataMarkdown = [
        '# Crear Carga - Datos Utilizados',
        '',
        `- Ambiente: ${envLabel}`,
        `- Browser: ${browserName}`,
        `- Setup Path: ${setupPath}`,
        `- Tipo Operacion: ${input.tipoOperacionNombre}`,
        `- Codigo Carga: ${input.codigoCarga}`,
        '',
        '## Dropdowns',
        `- Unidad de Medida: ${input.unidadMedidaNombre}`,
        `- Categoria Carga: ${input.categoriaNombre}`,
        `- Configuracion Carga: ${input.configuracionNombre}`,
        `- Contenido Carga: ${input.contenidoNombre}`,
        `- Temperatura Carga: ${input.temperaturaNombre}`,
        `- Comercio: ${input.comercioNombre}`,
        `- Tipo Rampla: ${input.tipoRamplaNombre}`,
      ].join('\n');

      for (const entity of entitiesForAllure) {
        await allure.parameter(`${entity.label} Nombre`, entity.data.nombre);
        await allure.parameter(`${entity.label} ID`, String(entity.data.id ?? 'N/A'));
      }
      await allure.parameter('Tipo Operacion Nombre', input.tipoOperacionNombre);
      await allure.parameter('Entidades Utilizadas', String(entitiesForAllure.length));

      await allure.attachment('Carga Input (JSON)', JSON.stringify({
        setupPath,
        envFromSetup: setupData.env,
        browserName,
        input,
      }, null, 2), 'application/json');
      await allure.attachment('Carga Setup Consumido (JSON)', JSON.stringify(setupData, null, 2), 'application/json');
      await allure.attachment('Datos Utilizados (Markdown)', usedDataMarkdown, 'text/markdown');

      const dropdownResults: Array<{ field: string; selected: boolean; value: string; error?: string }> = [];
      let selectedCount = 0;
      let tipoRamplaSelected = false;

      await test.step('Fase 1: Completar dropdowns de Carga', async () => {
        logger.info('Creando carga');
        await crearCargaPage.navigateToCreate();
        await crearCargaPage.ensureTipoOperacionSelected(input.tipoOperacionNombre);

        for (const field of CARGA_DROPDOWN_FIELDS) {
          const value = valueByType[field.type];
          try {
            await crearCargaPage.selectDropdownByText(field.selector, value, field.label);
            selectedCount += 1;
            if (field.type === 'tipoRampla') {
              tipoRamplaSelected = true;
            }
            dropdownResults.push({ field: field.label, selected: true, value });
          } catch (error) {
            dropdownResults.push({
              field: field.label,
              selected: false,
              value,
              error: error instanceof Error ? error.message : String(error),
            });
            logger.warn(`Dropdown no seleccionado para ${field.label}: ${String(error)}`);
          }
        }

        expect(selectedCount).toBeGreaterThanOrEqual(6);
        expect(tipoRamplaSelected).toBeTruthy();
      });

      await test.step('Fase 2: Asignar codigo y guardar', async () => {
        logger.info('Asignando codigos');
        await crearCargaPage.ensureTipoOperacionSelected(input.tipoOperacionNombre);
        await crearCargaPage.fillCodigoCarga(codigoCarga);
        await crearCargaPage.saveCarga();
      });

      let isVisibleInIndex = false;
      await test.step('Fase 3: Double check en /carga/index', async () => {
        logger.info('Verificando en indice');
        isVisibleInIndex = await crearCargaPage.verifyInIndexByCodigo(codigoCarga);
        expect(isVisibleInIndex).toBeTruthy();
      });

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      await allure.parameter('Dropdowns Seleccionados', String(selectedCount));
      await allure.parameter('Duracion (s)', durationSeconds);
      await allure.attachment('Resumen Validacion (JSON)', JSON.stringify({
        ambiente: envLabel,
        browser: browserName,
        codigoCarga,
        tipoOperacion: input.tipoOperacionNombre,
        dropdownsSeleccionados: selectedCount,
        dropdowns: dropdownResults,
        visibleEnIndex: isVisibleInIndex,
        durationSeconds,
      }, null, 2), 'application/json');

      logger.info('='.repeat(80));
      logger.info('RESUMEN VALIDACION CREAR CARGA');
      logger.info(`Ambiente: ${envLabel}`);
      logger.info(`Browser: ${browserName}`);
      logger.info(`Codigo Carga: ${codigoCarga}`);
      logger.info(`Dropdowns seleccionados: ${selectedCount}/7`);
      logger.info(`Resultado index: ${isVisibleInIndex ? 'VISIBLE' : 'NO VISIBLE'}`);
      logger.info('='.repeat(80));
    } catch (error) {
      logger.error('Fallo en Crear Carga Final', error);
      await page.screenshot({
        path: `./reports/screenshots/ERROR-CrearCargaFinal-${Date.now()}.png`,
        fullPage: true,
      }).catch(() => { });
      throw error;
    }
  });
});
