import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

test.describe('Contracts - Create Contract', () => {

  test('Should create a new Contract successfully', async ({
    page,
    loginPage,
    dashboardPage,
    contratosPage
  }) => {
    
    // Test data
    const user = getTestUser('regular');
    const testData = {
      nroContrato: Date.now().toString().slice(-8),
      valorHora: '25000',
      tarifaViaje: '150000',
      tarifaConductor: '50000',
    };

    await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await dashboardPage.isOnDashboard()).toBe(true);
        logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate', async () => {
        logger.info('Compass PHASE 2: Navigate to Contratos Form');
        await contratosPage.navigate();
        logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Fill Form', async () => {
        logger.info('📝 PHASE 3: Fill Contract Form');
        await contratosPage.fillNroContrato(testData.nroContrato);
        await contratosPage.selectTipoContrato('Costo');
        await contratosPage.selectTransportista('Transportadora S.A.I');
        await contratosPage.setFechaVencimiento('2026-02-28');
        await contratosPage.fillValorHora(testData.valorHora);
        
        logger.info('✅ Basic fields filled');
        await page.screenshot({ path: './reports/screenshots/contratos-03-form-filled.png', fullPage: true });
    });

    await test.step('Phase 4: Save & Edit', async () => {
        logger.info('💾 PHASE 4: Save Contract');
        await contratosPage.clickGuardar();
        
        // Wait for redirect to edit page
        try {
            await expect(page).toHaveURL(/\/contrato\/editar\//, { timeout: 15000 });
            logger.info('✅ Redirected to edit page');
            
             // Phase 5 actions
            logger.info('✏️ PHASE 5: Edit Contract Actions');
            await contratosPage.clickOutlineSuccessButton();
            await page.waitForTimeout(2000);
            await contratosPage.clickPlus715Button();
            await page.waitForTimeout(2000);
            
            await contratosPage.clickCerrarModal();
            await page.waitForTimeout(1000);
            
            await contratosPage.clickAddCarga();
            await page.waitForTimeout(1000);
            await contratosPage.clickAddRuta();
            await page.waitForTimeout(1000);
            await contratosPage.clickCerrarModal(); // Closing modal after adding
             
            await contratosPage.fillTarifaViaje(testData.tarifaViaje);
            await contratosPage.fillTarifaConductor(testData.tarifaConductor);
            
            await contratosPage.clickGuardar();
            logger.info('✅ Final save clicked');
            await page.waitForTimeout(3000);

        } catch (e) {
             logger.warn('⚠️ Did not redirect to edit page or failed during edit actions');
             if (await contratosPage.hasValidationErrors()) {
                logger.error('Validation errors detected');
                await page.screenshot({ path: './reports/screenshots/contratos-validation-error.png', fullPage: true });
             }
             throw e;
        }
    });

    await test.step('Phase 5: Verify', async () => {
         await page.screenshot({ path: './reports/screenshots/contratos-05-final-result.png', fullPage: true });
         logger.info('✅ Test Complete');
    });
  });
});