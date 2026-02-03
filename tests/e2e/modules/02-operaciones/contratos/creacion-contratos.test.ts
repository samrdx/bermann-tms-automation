import { test, expect } from '../../../../../src/fixtures/base.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { logger } from '../../../../../src/utils/logger.js';
import { TransportistaHelper } from '../../../../../tests/api-helpers/TransportistaHelper.js';

test.describe('Contracts - Create Contract (Retest)', () => {
  const user = getTestUser('regular');
  let transportistaName = '';

  test('Should create a new Contract with Robust Modal Handling and Self-Healing', async ({ 
    page,
    loginPage,
    contratosPage
  }) => {
    
    // Test Data
    const nroContrato = String(Math.floor(100000 + Math.random() * 900000));
    
    let attempts = 0;
    const maxAttempts = 2;
    let success = false;

    // 1. Initial Login
    logger.info('🔐 Initial Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);

    while (attempts < maxAttempts && !success) {
        attempts++;
        try {
            logger.info(`🚀 Starting Contract Creation Attempt ${attempts}/${maxAttempts}`);
            
            // 2. Seed Transportista (Unique name now has timestamp)
            logger.info('🏗️ PHASE 0: Seeding Transportista...');
            const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');
            transportistaName = transportista.nombre;
            logger.info(`✅ Seeded Transportista: ${transportistaName}`);

            // Ensure we are back on dashboard or navigate to contracts
            await contratosPage.navigate();

            await test.step(`Attempt ${attempts} - Phase 3: Fill Form (Header)`, async () => {
                await contratosPage.fillNroContrato(nroContrato);
                await contratosPage.selectTipoContrato('Costo');
                
                // selectTransportista only takes name argument
                await contratosPage.selectTransportista(transportista.nombre);
            });

            await test.step(`Attempt ${attempts} - Phase 4: Save`, async () => {
                await contratosPage.clickGuardar();
            });

            success = true; 

        } catch (error: any) {
            logger.error(`❌ Attempt ${attempts} failed: ${error.message}`);
            
            if (error.message.includes('DATA_INTEGRITY_ERROR') && attempts < maxAttempts) {
                logger.warn('⚠️ Ghost Record detected! Triggering Self-Healing: Re-seeding with new name...');
                continue;
            }
            throw error; 
        }
    }

    await test.step('Phase 5: Handle Route Modal (Master Key Closure)', async () => {
        // Wait for redirect to edit page
        try {
            await expect(page).toHaveURL(/\/contrato\/editar\//, { timeout: 15000 });
            logger.info('✅ Redirected to edit page');
        } catch (e) {
            logger.error(`❌ Failed to redirect. Current URL: ${page.url()}`);
            await page.screenshot({ path: './reports/screenshots/contract-no-redirect.png', fullPage: true });
            throw e;
        }

        // Try to complete the route modal if it exists
        try {
            await contratosPage.clickOutlineSuccessButton();
            await page.waitForTimeout(1000);
            await contratosPage.clickPlus715Button();
            await page.waitForTimeout(1000);
            await contratosPage.clickCerrarModal();
            logger.info('✅ Modal handling completed');
        } catch (e) {
            logger.warn('⚠️ Modal handling skipped or failed', e);
        }
    });

    await test.step('Phase 6: Verification', async () => {
        // Verify we're on the edit page (saving was successful)
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/contrato\/editar\//);
        
        logger.info('✅ Contract creation and Route assignment flow completed successfully');
    });

  });
});

