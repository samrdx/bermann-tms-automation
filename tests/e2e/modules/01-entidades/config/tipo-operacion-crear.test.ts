import { test, expect } from '../../../../../src/fixtures/base.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { TipoOperacionData } from '../../../../../src/modules/configAdmin/pages/TipoOperacionPage.js';

const logger = createLogger('TipoOperacionTest');

test.describe('Configuración Admin: Tiempos Operacionales', () => {
  test.setTimeout(90000);

  const envName = (process.env.ENV || 'QA').toUpperCase();

  test(`[${envName}] Crear Nuevo Tipo de Operación con SLA`, async ({ tipoOperacionPage }) => {
    const startTime = Date.now();
    logger.info(`Iniciando Test de Creación de Tipo de Operación en ambiente: ${envName}`);
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

    // PHASE 1: Navigation
    await test.step('Navegar a creación de Tipo de Operación', async () => {
      await tipoOperacionPage.navigateToCreate();
    });

    // PHASE 2: Fill Form
    await test.step('Completar datos de SLA', async () => {
      await tipoOperacionPage.fillForm(testData);
    });

    // PHASE 3: Save
    await test.step('Guardar y verificar', async () => {
      await tipoOperacionPage.clickGuardar();
      const isSaved = await tipoOperacionPage.isFormSaved();
      expect(isSaved).toBeTruthy();
      logger.info('✅ Tipo de Operación guardado exitosamente');
    });

    // PHASE 4: Search Verification (User requested)
    let isVisibleInGrid = false;
    await test.step('Verificar en el buscador de la grilla', async () => {
      logger.info('PHASE 4: Verificando en el buscador...');
      await tipoOperacionPage.navigateToIndex();
      isVisibleInGrid = await tipoOperacionPage.searchAndVerify(testData.nombre);
      
      if (isVisibleInGrid) {
        logger.info(`✅ Verificación exitosa: El ente "${testData.nombre}" se visualiza en la grilla.`);
      } else {
        logger.error(`❌ Fallo de verificación: El ente "${testData.nombre}" NO se encontró en la grilla.`);
      }
      expect(isVisibleInGrid).toBe(true);
    });

    // Summary Table Output
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`RESUMEN DE EJECUCIÓN (${envName})`);
    console.table([
      { Campo: 'Nombre', Valor: testData.nombre },
      { Campo: 'Tiempo Previo', Valor: testData.tiempoPrevio },
      { Campo: 'Perm. Origen', Valor: testData.permanenciaOrigen },
      { Campo: 'Perm. Destino', Valor: testData.permanenciaDestino },
      { Campo: 'Validar Horarios', Valor: testData.validarHorarios ? 'SÍ' : 'NO' },
      { Campo: 'Visible en Grilla', Valor: isVisibleInGrid ? 'SÍ ✅' : 'NO ❌' },
      { Campo: 'Tiempo Total', Valor: `${executionTime}s` }
    ]);
    logger.info('='.repeat(80));
  });
});
