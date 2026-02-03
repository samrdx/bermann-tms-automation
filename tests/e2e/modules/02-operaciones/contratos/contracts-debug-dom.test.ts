import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';
import { TransportistaHelper } from '../../../../../tests/api-helpers/TransportistaHelper.js';
import { generateContractNumber, generateValorHora } from '../../../../../src/utils/rutGenerator.js';
import * as fs from 'fs';

test.describe('Contracts - Debug DOM', () => {

  let transportistaName: string;

  test.beforeAll(async ({ browser }) => {
    // 1. Seed Transportista
    const page = await browser.newPage();
    try {
        logger.info('🏗️ Seeding Transportista for Contract Test...');
        const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Tercero');
        transportistaName = 'Transportes ' + Date.now(); // Fallback name if seeded fails name usage? No, stick to real.
        transportistaName = transportista.nombre;
        logger.info(`✅ Seeded Transportista for Contract: ${transportistaName}`);
    } catch (e) {
        logger.error('Failed to seed Transportista', e);
        throw e;
    } finally {
        await page.close();
    }
  });

  test('Should dump HTML if save fails', async ({
    page,
    loginPage,
    dashboardPage,
    contratosPage
  }) => {

    // Test data
    const user = getTestUser('regular');
    const testData = {
      nroContrato: generateContractNumber(),
      valorHora: generateValorHora(),
      vencimiento: '2026-12-31' 
    };

    await test.step('Phase 1: Login', async () => {
      logger.info('🔐 PHASE 1: Login');
      await loginPage.loginAndWaitForDashboard(user.username, user.password);
    });

    await test.step('Phase 2: Navigate', async () => {
      await contratosPage.navigate();
    });

    await test.step('Phase 3: Fill Form', async () => {
      logger.info('📝 PHASE 3: Fill Contract Form');
      
      await contratosPage.fillNroContrato(testData.nroContrato);
      await contratosPage.selectTipoContrato('Costo');
      await contratosPage.selectTransportista(transportistaName);
      await contratosPage.setFechaVencimiento(testData.vencimiento);
      await contratosPage.fillValorHora(testData.valorHora);

      logger.info('✅ Basic fields filled');
    });

    await test.step('Phase 4: Save & Dump', async () => {
      logger.info('💾 PHASE 4: Save Contract and Handle Modal');
      
      // Click Save (No wait logic)
      await contratosPage.clickGuardar();
      logger.info('✅ Clicked Save');

      try {
          await expect(page).toHaveURL(/\/contrato\/editar\//, { timeout: 10000 });
          logger.info('✅ Redirected to edit page');
      } catch (e) {
          logger.error(`❌ Failed to redirect. Current URL: ${page.url()}`);
          
          const html = await page.content();
          fs.writeFileSync('contracts_failure_dump.html', html);
          logger.info('✅ Dumped HTML to contracts_failure_dump.html');
          
          // Also take screenshot
          await page.screenshot({ path: './reports/screenshots/contracts_failure.png', fullPage: true });
          
          throw e; // Fail the test
      }
    });
  });
});
