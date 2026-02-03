import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';
import {
  generateValidChileanRUT,
  generateShortCompanyName,
  generateChileanStreet
} from '../../../../../src/utils/rutGenerator.js';

test.describe('Transport - Transportista Creation', () => {

  test('Should create a new Transportista successfully', async ({
    page,
    loginPage,
    dashboardPage,
    transportistaPage,
  }) => {

    // Test data
    const user = getTestUser('regular');
    const companyName = generateShortCompanyName();
    const randomStreetNumber = Math.floor(Math.random() * 900) + 100;

    const testData = {
      nombre: companyName,
      razonSocial: companyName,
      documento: generateValidChileanRUT(),
      calle: generateChileanStreet(),
      altura: randomStreetNumber.toString(),
      tipo: 'Propio Con Flota No Genera Contrato',
      formaPago: 'Contado'
    };

    // Phase 1: Login removed (Global Auth active)


    await test.step('Phase 2: Navigate', async () => {
      logger.info('Compass PHASE 2: Navigate to Create Transportista');
      await transportistaPage.navigate();
      logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Fill Form', async () => {
      logger.info('📝 PHASE 3: Fill Transportista Form');
      await transportistaPage.fillNombre(testData.nombre);
      await transportistaPage.fillRazonSocial(testData.razonSocial);
      await transportistaPage.fillDocumento(testData.documento);
      await transportistaPage.selectTipoTransportista(testData.tipo);
      await page.waitForTimeout(500);

      await transportistaPage.selectRandomRegion();
      await transportistaPage.selectRandomCiudad();
      await transportistaPage.selectRandomComuna();

      await transportistaPage.fillCalle(testData.calle);
      await transportistaPage.fillAltura(testData.altura);
      await transportistaPage.selectFormaPago(testData.formaPago);

      logger.info('✅ Form filled');
    });

    await test.step('Phase 4: Save', async () => {
      logger.info('💾 PHASE 4: Save Transportista');
      await transportistaPage.clickGuardar();
      await page.waitForTimeout(5000);
      logger.info('✅ Save initiated');
    });

    await test.step('Phase 5: Verify', async () => {
      logger.info('✅ PHASE 5: Verification');
      const isSaved = await transportistaPage.isFormSaved();

      if (!isSaved) {
        const hasErrors = await transportistaPage.hasValidationErrors();
        if (hasErrors) {
          logger.error('❌ Validation errors validation failed');
          // Capture screenshot on failure
          await page.screenshot({ path: './reports/screenshots/transportista-validation-error.png', fullPage: true });
        }
      }
      expect(isSaved).toBeTruthy();
      logger.info('✅ Test PASSED');
    });
  });
});
