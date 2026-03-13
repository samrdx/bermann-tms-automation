import { test, expect } from '../../../../src/fixtures/base.js';
import { logger } from '../../../../src/utils/logger.js';
import { NamingHelper } from '../../../../src/utils/NamingHelper.js';
import { allure } from 'allure-playwright';

test.describe('[CONFIG02] - Tipo de Carga', () => {
  test.setTimeout(120000);

  test('Crear Tipo de Carga y validar persistencia en index', async ({
    page,
    tipoCargaPage,
  }) => {
    const startTime = Date.now();
    const isDemo = process.env.ENV?.toUpperCase() === 'DEMO';
    const envLabel = isDemo ? 'DEMO' : 'QA';
    const tipoCargaData = NamingHelper.getTipoCargaData();

    await allure.epic('TMS Config Flow');
    await allure.feature('01-Configuracion');
    await allure.story('Tipo de Carga');
    await allure.parameter('Ambiente', envLabel);
    await allure.parameter('Tipo Carga', tipoCargaData.tipo);
    await allure.parameter('Codigo Carga', tipoCargaData.codigo);

    logger.info('='.repeat(60));
    logger.info(`🚀 Iniciando test: Creacion de Tipo de Carga [ENV: ${envLabel}]`);
    logger.info('='.repeat(60));

    try {
      // Session is inherited via storageState from Playwright project config.
      await test.step('Phase 1: Navegar a /tipocarga/crear', async () => {
        logger.info('🧭 PHASE 1: Navegacion a creacion de Tipo de Carga');
        await tipoCargaPage.navigateToCreate();
        logger.info('✅ Navegacion completada');
      });

      await test.step('Phase 2: Completar Tipo y Codigo dinamicos', async () => {
        logger.info(`📝 PHASE 2: Completando formulario (tipo: ${tipoCargaData.tipo}, codigo: ${tipoCargaData.codigo})`);
        await tipoCargaPage.fillTipo(tipoCargaData.tipo);
        await tipoCargaPage.fillCodigo(tipoCargaData.codigo);
        logger.info('✅ Formulario completado');
      });

      await test.step('Phase 3: Guardar registro', async () => {
        logger.info('💾 PHASE 3: Guardando Tipo de Carga');
        await tipoCargaPage.clickGuardar();

        const isSaved = await tipoCargaPage.isFormSaved();
        expect(isSaved).toBeTruthy();
        logger.info('✅ Registro guardado exitosamente');
      });

      await test.step('Phase 4: Verificar persistencia en /tipocarga/index', async () => {
        logger.info('🔎 PHASE 4: Navegando al index y validando fila');
        await tipoCargaPage.navigateToIndex();
        await tipoCargaPage.searchByTipo(tipoCargaData.tipo);

        const existsInGrid = await tipoCargaPage.validateRowByTipoAndCodigo(
          tipoCargaData.tipo,
          tipoCargaData.codigo,
        );
        expect(existsInGrid).toBeTruthy();
        logger.info('✅ Fila encontrada con Tipo + Codigo');
      });

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      await allure.parameter('Duracion (s)', durationSeconds);
      await allure.attachment('Tipo Carga - Resumen', JSON.stringify({
        ambiente: envLabel,
        tipoCarga: tipoCargaData.tipo,
        codigoCarga: tipoCargaData.codigo,
        durationSeconds,
      }, null, 2), 'application/json');

      logger.info('='.repeat(60));
      logger.info(`📊 TEST COMPLETO: Tipo de Carga creado y validado. Duracion: ${durationSeconds}s`);
      logger.info('📋 RESUMEN DE ENTIDAD CREADA');
      logger.info(`🌍 Ambiente: ${envLabel}`);
      logger.info(`📦 Tipo: ${tipoCargaData.tipo}`);
      logger.info(`🆔 Codigo: ${tipoCargaData.codigo}`);
      logger.info('='.repeat(60));
    } catch (error) {
      logger.error('❌ El test fallo', error);
      await page.screenshot({ path: `./reports/screenshots/ERROR-TipoCargaCrear-${Date.now()}.png`, fullPage: true });
      throw error;
    }
  });
});
