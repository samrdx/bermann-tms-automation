import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import {
  generateValidChileanRUT,
  generateChileanStreet
} from '../../../../../src/utils/rutGenerator.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { ClienteHelper, Cliente } from '../../../../api-helpers/ClienteHelper.js';
import * as fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';
import { NamingHelper } from '../../../../../src/utils/NamingHelper.js';

test.describe('[E02] Entidades - Crear Cliente', () => {
  test.setTimeout(120000);


  test('Debe crear un Cliente correctamente y guardar sus datos', async ({
    page,
    clientePage,
  }, testInfo) => {
    await allure.epic('TMS Legacy Flow');
    await allure.feature('01-Entidades');
    await allure.story('Crear Cliente');

    // Test data
    const cliNameObj = NamingHelper.getClienteName();
    const randomStreetNumber = Math.floor(Math.random() * 900) + 100;

    const testData = {
      nombre: cliNameObj.nombre,
      baseNombre: cliNameObj.nombre,
      nombreFantasia: cliNameObj.nombreFantasia,
      rut: generateValidChileanRUT(),
      calle: generateChileanStreet(),
      altura: randomStreetNumber.toString(),
      tipoCliente: 'Distribución', // Exists in both QA and Demo
    };

    await test.step('Fase 1: Navigar', async () => {
      logger.info('🧭 FASE 1: Navegar hasta creación de cliente');
      await clientePage.navigate();
      logger.info('✅ Navegación correcta');
    });

    await test.step('Fase 2: Completar formulario', async () => {
      logger.info('📝 FASE 2: Completar formulario');
      await clientePage.fillNombre(testData.nombre);
      await clientePage.fillRut(testData.rut);
      await clientePage.fillNombreFantasia(testData.nombreFantasia);
      await clientePage.selectTipoCliente(testData.tipoCliente);
      await page.waitForTimeout(500);

      await clientePage.selectRandomLocationCascade();

      await clientePage.fillCalle(testData.calle);
      await clientePage.fillAltura(testData.altura);

      // Select all Polígonos (required)
      await clientePage.selectAllPoligonos();

      logger.info('✅ Formulario Completado');
    });

    await test.step('Fase 3: Guardar', async () => {
      logger.info('💾 FASE 3: Guardar Cliente');
      await clientePage.clickGuardar();
      await page.waitForTimeout(5000);
      logger.info('✅ Guardar iniciado');
    });

    let createdCliente: Cliente;

    await test.step('Fase 4: Verificar y guardar datos', async () => {
      logger.info('✅ FASE 4: Verificar y guardar datos');
      const isSaved = await clientePage.isFormSaved();

      if (!isSaved) {
        const hasErrors = await clientePage.hasValidationErrors();
        if (hasErrors) {
          logger.error('❌ Error de validación detectado');
          await page.screenshot({ path: './reports/screenshots/cliente-validation-error.png', fullPage: true });
        }
      }
      expect(isSaved).toBeTruthy();

      createdCliente = await ClienteHelper.extractClienteIdAndName(
        page,
        testData.nombre,
        testData.rut,
        testData.baseNombre,
        testData.nombreFantasia
      );

      entityTracker.register({ 
        type: 'Cliente', 
        name: createdCliente.nombre || testData.nombre, 
        id: String(createdCliente.id) 
      });

      await allure.parameter('Nombre Cliente', createdCliente.nombre || testData.nombreFantasia);
      await allure.parameter('Cliente ID', String(createdCliente.id ?? 'N/A'));

      // Save data to worker-specific JSON
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      let currentData: any = {};
      if (fs.existsSync(dataPath)) {
        currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }
      currentData.seededCliente = createdCliente;
      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));

      logger.info(`✅ Datos del cliente guardado en ${dataPath}`);
      logger.info('✅ Prueba exitosa');
    });
  });
});
