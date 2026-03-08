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
    const shortNames = ['Distribuidora', 'Comercial', 'Importadora', 'Logistica', 'Servicios', 'Industrial', 'Global', 'Central'];
    const baseName = shortNames[Math.floor(Math.random() * shortNames.length)];
    const fourDigits = Math.floor(Math.random() * 9000) + 1000;
    const randomStreetNumber = Math.floor(Math.random() * 900) + 100;

    const testData = {
      nombre: `${baseName} ${fourDigits}`,
      baseNombre: baseName,
      nombreFantasia: `${baseName} ${fourDigits} SpA`,
      rut: generateValidChileanRUT(),
      calle: generateChileanStreet(),
      altura: randomStreetNumber.toString(),
      tipoCliente: 'Distribución', // Exists in both QA and Demo
    };

    await test.step('Phase 1: Navigate', async () => {
      logger.info('🧭 PHASE 1: Navigate to Create Cliente');
      await clientePage.navigate();
      logger.info('✅ Navigation successful');
    });

    await test.step('Phase 2: Fill Form', async () => {
      logger.info('📝 PHASE 2: Fill Cliente Form');
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

      logger.info('✅ Form filled');
    });

    await test.step('Phase 3: Save', async () => {
      logger.info('💾 PHASE 3: Save Cliente');
      await clientePage.clickGuardar();
      await page.waitForTimeout(5000);
      logger.info('✅ Save initiated');
    });

    let createdCliente: Cliente;

    await test.step('Phase 4: Verify and Save Data', async () => {
      logger.info('✅ PHASE 4: Verification and Data Storage');
      const isSaved = await clientePage.isFormSaved();

      if (!isSaved) {
        const hasErrors = await clientePage.hasValidationErrors();
        if (hasErrors) {
          logger.error('❌ Validation errors detected');
          await page.screenshot({ path: './reports/screenshots/cliente-validation-error.png', fullPage: true });
        }
      }
      expect(isSaved).toBeTruthy();

      // Extract ID and name for storage
      createdCliente = await ClienteHelper.extractClienteIdAndName(
        page,
        testData.nombre,
        testData.rut,
        testData.baseNombre,
        testData.nombreFantasia
      );

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

      logger.info(`✅ Cliente data saved to ${dataPath}`);
      logger.info('✅ Test PASSED');
    });
  });
});
