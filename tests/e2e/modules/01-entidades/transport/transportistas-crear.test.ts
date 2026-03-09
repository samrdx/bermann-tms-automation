import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { isDemoMode } from '../../../../../src/utils/env-helper.js';
import {
  generateValidChileanRUT,
  generateChileanStreet
} from '../../../../../src/utils/rutGenerator.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { Transportista, TransportistaHelper } from '../../../../api-helpers/TransportistaHelper.js';
import * as fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';
import { NamingHelper } from '../../../../../src/utils/NamingHelper.js';

test.describe('[E01] Entidades - Crear Transportista', () => {
  test.setTimeout(120000);


  test('Debe crear un Transportista correctamente y guardar sus datos', async ({
    page,
    transportistaPage,
  }, testInfo) => {
    await allure.epic('TMS Legacy Flow');
    await allure.feature('01-Entidades');
    await allure.story('Crear Transportista');

    // Test data
    const transNameObj = NamingHelper.getTransportistaName();
    const randomStreetNumber = Math.floor(Math.random() * 900) + 100;

    const testData = {
      nombre: transNameObj.nombre,
      baseNombre: transNameObj.baseNombre,
      razonSocial: transNameObj.razonSocial,
      documento: generateValidChileanRUT(),
      calle: generateChileanStreet(),
      altura: randomStreetNumber.toString(),
      tipo: isDemoMode()
        ? 'Terceros'
        : 'Terceros Con Flota Si Genera Contrato',
      formaPago: 'Contado'
    };

    await test.step('Fase 1: Navegar', async () => {
      logger.info('FASE 1: Navegar hasta creación de transportista');
      await transportistaPage.navigate();
      logger.info('✅ Navegación exitosa');
    });

    await test.step('Fase 2: Completar formulario', async () => {
      logger.info('📝 Fase 2: Completando formulario de transportista');
      await transportistaPage.fillNombre(testData.nombre);
      await transportistaPage.fillRazonSocial(testData.razonSocial);
      await transportistaPage.fillDocumento(testData.documento);
      await transportistaPage.selectTipoTransportista(testData.tipo);
      await page.waitForTimeout(500);

      await transportistaPage.selectRandomLocationCascade();

      await transportistaPage.fillCalle(testData.calle);
      await transportistaPage.fillAltura(testData.altura);
      await transportistaPage.selectFormaPago(testData.formaPago);

      logger.info('✅ Formulario completado');
    });

    await test.step('Fase 3: Guardar', async () => {
      logger.info('💾 Fase 3: Guardar transportista');
      await transportistaPage.clickGuardar();
      await page.waitForTimeout(5000);
      logger.info('✅ Guardado iniciado');
    });

    let createdTransportista: Transportista;

    await test.step('Fase 4: Verificar y guardar datos', async () => {
      logger.info('✅ Fase 4: Verificación y guardado de datos');
      const isSaved = await transportistaPage.isFormSaved();

      if (!isSaved) {
        const hasErrors = await transportistaPage.hasValidationErrors();
        if (hasErrors) {
          logger.error('❌ Errores de validación');
          await page.screenshot({ path: './reports/screenshots/transportista-validation-error.png', fullPage: true });
        }
      }
      expect(isSaved).toBeTruthy();

      // Extract ID and name for storage
      createdTransportista = await TransportistaHelper.extractTransportistaIdAndName(
        page,
        testData.nombre,
        testData.documento,
        testData.baseNombre,
        testData.razonSocial
      );

      entityTracker.register({ 
        type: 'Transportista', 
        name: createdTransportista.nombre, 
        id: String(createdTransportista.id) 
      });

      // Save data to worker-specific JSON
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      let currentData: any = {};
      if (fs.existsSync(dataPath)) {
        currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }
      currentData.seededTransportista = createdTransportista;
      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));

      await allure.parameter('Nombre Transportista', createdTransportista.nombre);
      await allure.parameter('Transportista ID', String(createdTransportista.id ?? 'N/A'));

      logger.info(`✅ Datos del transportista guardados en ${dataPath}`);
      logger.info('✅ Prueba exitosa');
    });
  });
});
