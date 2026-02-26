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

test.describe('Transportista - Creación de Transportista', () => {

  test('Debe crear un Transportista correctamente y guardar sus datos', async ({
    page,
    transportistaPage,
  }, testInfo) => {

    // Test data
    const shortNames = ['TransSur', 'Cordillera', 'Pacific', 'Austral', 'Delta', 'Titanium', 'Horizonte', 'EcoTrans'];
    const baseName = shortNames[Math.floor(Math.random() * shortNames.length)];
    const fourDigits = Math.floor(Math.random() * 9000) + 1000;
    const randomStreetNumber = Math.floor(Math.random() * 900) + 100;

    const testData = {
      nombre: `${baseName} ${fourDigits}`, // Short name + 4 digits (e.g. "TransSur 4821")
      baseNombre: baseName,
      razonSocial: `${baseName} ${fourDigits} SpA`, // Same short format
      documento: generateValidChileanRUT(),
      calle: generateChileanStreet(),
      altura: randomStreetNumber.toString(),
      tipo: isDemoMode()
        ? 'Terceros'
        : 'Terceros Con Flota Si Genera Contrato',
      formaPago: 'Contado'
    };

    await test.step('Phase 1: Navigate', async () => {
      logger.info('Compass PHASE 1: Navigate to Create Transportista');
      await transportistaPage.navigate();
      logger.info('✅ Navigation successful');
    });

    await test.step('Phase 2: Fill Form', async () => {
      logger.info('📝 PHASE 2: Fill Transportista Form');
      await transportistaPage.fillNombre(testData.nombre);
      await transportistaPage.fillRazonSocial(testData.razonSocial);
      await transportistaPage.fillDocumento(testData.documento);
      await transportistaPage.selectTipoTransportista(testData.tipo);
      await page.waitForTimeout(500);

      await transportistaPage.selectRandomLocationCascade();

      await transportistaPage.fillCalle(testData.calle);
      await transportistaPage.fillAltura(testData.altura);
      await transportistaPage.selectFormaPago(testData.formaPago);

      logger.info('✅ Form filled');
    });

    await test.step('Phase 3: Save', async () => {
      logger.info('💾 PHASE 3: Save Transportista');
      await transportistaPage.clickGuardar();
      await page.waitForTimeout(5000);
      logger.info('✅ Save initiated');
    });

    let createdTransportista: Transportista;

    await test.step('Phase 4: Verify and Save Data', async () => {
      logger.info('✅ PHASE 4: Verification and Data Storage');
      const isSaved = await transportistaPage.isFormSaved();

      if (!isSaved) {
        const hasErrors = await transportistaPage.hasValidationErrors();
        if (hasErrors) {
          logger.error('❌ Validation errors validation failed');
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

      // Save data to worker-specific JSON
      const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
      let currentData: any = {};
      if (fs.existsSync(dataPath)) {
        currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }
      currentData.seededTransportista = createdTransportista;
      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));

      logger.info(`✅ Transportista data saved to ${dataPath}`);
      logger.info('✅ Test PASSED');
    });
  });
});
